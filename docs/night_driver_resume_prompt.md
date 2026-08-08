# 夜間自動運転 リカバリー指示書（transient クラッシュからの1回だけ再開）

> 2026-08-01: 追加の独自再試行は禁止。runnerの一過性エラー1回再試行後は停止判定へ進む。push直前は npm run security:scan を必須とする。

あなたはすまラボ夜間ドライバーの**リカバリー担当**です。直前の夜間 run が transient なエラー
（例: `The model's tool call could not be parsed`）で異常終了しましたが、**記事は途中まで進んで
状態が保存**されています。この run では**新しいネタを選ばず**、その記事を**保存済みの状態から再開**して
完走（公開・X 投稿）まで進めてください。CLAUDE.md の全ルール（禁則語 / 記事方針 / 画像ルール /
secret 非表示）に従います。

## 対象記事

再開対象の slug: **`{{SLUG}}`**

- **絶対にやらないこと**: `npm run scout` の実行 / 新しいテーマの選定 / 別 slug の記事化。
  今回は `{{SLUG}}` を**最後まで仕上げるだけ**。
- 進捗は `logs/article/{{SLUG}}.state.json` に保存済み。**pending の最初のステップから続ける**。
  途中まで作った成果物は `drafts/refinement/{{SLUG}}/` にある（research / editorial / draft /
  review など）。**すでに done のステップはやり直さない**（保存済み成果物をそのまま使う）。

## 0. 前提チェック（最小）

1. `node scripts/automation/test-mode.mjs --status` が exit 0（アクティブ）であること。exit 10 なら
   何もせず `night-driver / skipped` を通知して終了。
2. ブラウザ生存チェック（docs/night_driver_prompt.md 0-bis と同じ）: ChatGPT `/api/auth/session` に
   `user.email` があり、X が `@suma_labo` でログイン済み。落ちていれば `blocked` 通知で終了
   （testMode 未消費）。

## 1. どこまで進んだかを確認

```
node -e "const s=require('./logs/article/{{SLUG}}.state.json'); for(const[k,v]of Object.entries(s.steps))console.log(k,v.status); console.log('halted:',s.halted)"
```

- `halted: true` なら**再開しない**（品質・安全で意図的に止めた記事）。理由を通知して終了。
- pending の**最初のステップ**を特定し、そこから続ける。

## 2. ChatGPT 磨きステップ（turn5 final / turn6 slideplan 等）が pending の場合

保存済みの `drafts/refinement/{{SLUG}}/`（draft_article.md / review_report.md 等）を根拠に、
**新しい ChatGPT チャットを1つ開いて**残りのターンだけ実行する（クラッシュ前のチャットに固執しない）。

- turn5（最終稿）が pending: draft + review を貼って「レビュー反映の確定稿」を1回で出させ、
  `final_article.md` に保存 → `--advance chatgpt_turn5_final`。
- turn6（slide_plan）が pending: final_article を基に slide_plan を作り `slide_plan.md` に保存 →
  `--advance chatgpt_turn6_slideplan`。
- 禁則語チェック（0 件）を必ず通す。
- ChatGPT の各応答は backend-api の生 JSON を保存し、`node scripts/automation/chatgpt-response-health.mjs` で `current_node` から正規ブランチを抽出して健全性を確認する。画面に本文がある場合は、見出し・箇条書き・リンクをMarkdownへ復元した `outputMarkdown` を `--dom-fallback` で救済する（`innerText` だけで保存しない）。
- 本文が空または極端に少ない場合だけ、調査結果・引用・要件を減らさず構造化した入力で同じ会話へ 1 回だけ再生成する。画像は既存分を再利用し、2 回目も不健全なら停止・報告する。

## 3. それ以降（画像 → MDX → finalize → Phase B/C）

docs/night_driver_prompt.md の該当節に**そのまま従う**:

- `save_drafts` → `gate_draft` → `generate_images`（**工房再シードは案A＝プロジェクトファイル参照の
  テキストのみ。`image-workshop.json` の `generatedSinceSeed` が閾値超なら新チャット+シード文だけで
  再シード**）→ `factcheck_images`（自分の目で数値・キャラアンカーを確認）→ `webp_convert` →
  `write_mdx`（v3 コンポーネント / `publishAt` は**現在時刻より前**）→ `finalize`。
- finalize OK なら、一次独立検品と手の二段検品を実施し、`npm run sumalabo:inspect-hands:gate -- --slug {{SLUG}}` がPASSしてから、承認・待機分岐を挟まず **Phase B**（PR merge → `deploy:production --run-mode=night` → strict verify 8/8 →
  ledger `published`）→ **Phase C**（X 投稿・タイムボックス 5 分/3 回・背面タブなら text_only）。
- 夜間Phase Cの実行経路は、Hiroが別途変更を承認するまで現行の無人Claude＋`claude-in-chrome`を維持する。投稿記録には `--route claude-in-chrome` を必ず付け、`x-posted.json` に実経路を残す。
- 投稿直前に読者が使う自然検索語でXを1回検索し、結果内で実際に使われているハッシュタグを収集・集計する。最多の流入タグを0〜2個選び、--search-phrase と --discovered-traffic-tags で再生成する。ブランドタグは #すまラボ 常時1個、カテゴリタグは廃止。本文1行目に自然検索語があることを確認する。
- Phase C 前に通常の独立検品に続けて `npm run sumalabo:inspect-hands -- --slug {{SLUG}}` を実行し、手が見える画像だけをクロップして別 Codex セッションで左右・接続・指比率を二段検品する。`needs_revision` が残る間は Phase C へ進まない。
- 各 Phase の所要時間を `test-mode.mjs --phase-timing` で記録。

## 4. 完了処理

- 公開まで到達したら `test-mode.mjs --consume` 相当（recordNightRun）で weeklyCap を1消費し、
  `night-report.mjs --slug {{SLUG}}` で監査レポートを出して通知。
- 途中で品質・安全ブロックに当たったら、無理に完走せず該当ステップで停止・通知（testMode の
  扱いは docs/night_driver_prompt.md に従う）。

## 5. 二重実行の防止

このリカバリーは runner が**1回だけ**起動する。あなたの中でさらに別記事を作らない・scout しない。
`{{SLUG}}` 一本を仕上げたら終了する。
