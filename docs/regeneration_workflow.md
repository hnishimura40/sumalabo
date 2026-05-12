# 薄い記事の再生成ワークフロー (regeneration-from-queue)

## 背景

rule-based generator (`generateExplainer`) が元記事の事実を本文に反映できず、定型句だけの「薄い記事」を出すケースがある。これを `publish-gate` (`validateForAutomatedPublish`) が `blocking` で止め、queue entry を `needs_regeneration` 状態にする (2026-05-12 で 4 件発生)。

放置すると新着検知だけ進んで本文が出てこない状態になるため、**ChatGPT 経由の正式な本文生成フロー** に乗せ直す経路を用意する。

## 3 フェーズ構成

```
┌──────────────────────┐
│ needs_regeneration   │  (publish-gate でブロックされた状態)
└──────────┬───────────┘
           │  Phase A: regenerate-from-queue
           ▼
┌──────────────────────┐
│ awaiting_chatgpt_    │  (handoff materials 準備完了、ChatGPT で本文生成待ち)
│ generation           │
└──────────┬───────────┘
           │  Phase B: Claude in Chrome + ChatGPT
           ▼
┌──────────────────────┐
│ awaiting_import      │  (drafts/generated に最終稿保存、import 待ち)
└──────────┬───────────┘
           │  Phase C: article:import-generated
           ▼
┌──────────────────────┐
│ preview_created      │  (Preview branch push + PR + 通知 完了、人間承認待ち)
└──────────────────────┘
```

途中でガード (sourceCheck / articleQualityCheck / publish-gate) に弾かれた場合は `needs_regeneration` に戻す。

## Phase A: handoff 準備（自動可、夜間タスクから呼べる）

```bash
npm run sumahon:regenerate-next
```

CLI: `scripts/run/regenerate-from-queue.mjs`

挙動:
1. `data/automation/sumahon-queue.json` で `status === "needs_regeneration"` の entry を 1 件 pick
2. status を `preparing_regeneration` に更新（中断時の整合性確保）
3. `fetchSource` → `classifyTopic` → `generateExplainer` → `generateArticleBrief` → `generateArticlePrompt` の流れで:
   - `logs/source/{slug}.json`
   - `logs/brief/{slug}.article.json`
   - `logs/prompt/{slug}.article.md` ← **ChatGPT に貼る本文生成プロンプト**
   - `logs/handoff/{slug}.handoff.md`
   - `logs/handoff/{slug}.chrome-steps.md`
   - `logs/thumbnail/{slug}.brief.json` / `.prompt.md`
4. queue entry の status を `awaiting_chatgpt_generation` に更新、slug / handoffPath / articlePromptPath / generatedDraftPath / articleProjectUrl を記録
5. stdout に「次に Claude in Chrome がやること」を出力

オプション:
- `--dry-run`: ファイル書き出しと status 更新を行わず、pick 内容だけ表示
- `--max-jobs N`: 1 起動あたりの最大件数（既定 1）

## Phase B: ChatGPT 本文生成（Claude in Chrome、インタラクティブ）

Phase A 完了後に Claude in Chrome（人間 or Claude session）が実行する:

1. **MCP 接続済み Chrome** で ChatGPT プロジェクトを開く
   - URL は `config/sumalabo-automation.json` の `chatgptTargets.articleProjectUrl`
2. `logs/prompt/{slug}.article.md` の内容をコピーして ChatGPT に貼り付け
3. ChatGPT 5.5 で本文初稿を生成
4. **初稿をそのまま使わない**。以下の精錬を同じチャットで実行:
   - メタ文言の排除（「ChatGPT向け」「自動生成」「以下を貼り付け」等）
   - ボリューム確認（日本語 ≥ 2500 字、H2 ≥ 5 個）
   - すまラボらしさ確認:
     - 補助ボックス（summary-box / check-box）が冒頭に
     - ひまり・らぼまる の画像つき CharacterDialogue を 1 回
     - 末尾に `## 参考情報` セクション（公式情報 + 元報道 + 関連報道、URL 2 件以上）
     - 報道・噂ベースの記事は冒頭・末尾に「公式発表ではない／今後変わる可能性」注意文
     - すまほん（smhn.info / すまほん）非露出
5. 「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼
6. ChatGPT の最終稿を全文コピーして `drafts/generated/{slug}.md` に保存
7. queue entry の status を `awaiting_import` に更新

Phase B の詳細手順は `logs/handoff/{slug}.chrome-steps.md` に slug 固有の形で出力されている。

## Phase C: import + Preview push（自動）

Phase B で最終稿が `drafts/generated/{slug}.md` に置かれたら:

```bash
npm run article:import-generated -- --slug 202605-xxx-yyy
```

これにより `scripts/run/import-generated.mjs` が以下を実行:
1. `drafts/generated/{slug}.md` を MDX に整形 (frontmatter 付与、不要メタ除去)
2. `content/articles/{slug}.mdx` に書き出し
3. **sourceCheck (validateSourceReferences)**: 参考情報 / URL 数 / すまほん非露出 / 報道注意文
4. **articleQualityCheck (validateArticleQuality)**: タイトル重複 / Markdown 残骸 / ボックス内見出し / character_visual_missing
5. **publish-gate (validateForAutomatedPublish)** を併用してもよい（防御層）
6. `npm run build`
7. `commitAndPushPreview` で `preview/{slug}` ブランチ push
8. `notifyReviewReady` で PWA Push 通知

通れば queue entry の status を `preview_created` に更新（Phase B が完了させているならその時点で済）。

ガードに弾かれたら `needs_regeneration` に戻す（再度 Phase A から）。

## CLAUDE.md ポリシー準拠

- 薄い rule-based 本文を Preview に出さない: publish-gate がブロック
- 参考情報なしの記事を出さない: sourceCheck (missing_reference_section) でブロック
- すまほん表記を出さない: sourceCheck (containsSumahonPublicReference) でブロック
- ひまり・らぼまる画像つきブロックなしを警告: articleQualityCheck (character_visual_missing)
- main へ直接 push しない: 全フェーズで preview ブランチ経由
- X 投稿は呼ばない

## 残課題

- Phase B の **完全自動化** (Claude in Chrome を unattended で運転) は現在の MCP / Chrome 構成では非実用的 (タブ可視性、認証、CSP、autocomplete 等)。当面は **人間 or Claude session が起きているときに `sumahon:regenerate-next` → ChatGPT → 最終稿保存 → import-generated** を順に手動 / 半自動で進める運用。
- Phase A は夜間タスク (`run-sumahon-queue.ps1`) から呼んでもよい (副作用は logs 書き出しと queue 更新のみ)。ただし awaiting_chatgpt_generation が積み上がるだけで Phase B が止まると詰まる。
- ChatGPT 本文生成自体が rule-based 生成より明らかに高品質になるとは限らない (プロンプト次第)。プロンプトの質改善は別タスク。

## 関連ファイル

- `scripts/run/regenerate-from-queue.mjs` — Phase A CLI
- `scripts/run/import-generated.mjs` — Phase C CLI（既存）
- `scripts/sumahon/queue-store.mjs` — pickNextNeedsRegeneration / updateStatus 等
- `scripts/sumahon/validate-for-automated-publish.mjs` — publish-gate
- `scripts/sumahon/validate-generated-article.mjs` — sourceCheck / articleQualityCheck
- `docs/visual_preview_review.md` — visualPreviewReview 観点（Preview 後の見た目・ファクトチェック）
- `CLAUDE.md` — 全体運用ポリシー
