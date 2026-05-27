# CLAUDE.md — すまラボ自動化の役割分担と運用ポリシー

このドキュメントは、すまラボ記事作成・公開ワークフローにおける **Claude Code / Claude in Chrome がやること** と **人間（運営者）がやること** の境界を固定するためのものです。今後のセッションでもこのポリシーを **既定** として動きます。

## 運用モード（2026-05-23 以降）

**現在のモード： `user-directed mode`（手動トリガー方式）**

> 詳細： [`docs/user_directed_mode.md`](docs/user_directed_mode.md)

- **完全全自動運用は中止しました。** すまほん新着の自動巡回・Google ニュース等の自動収集・未指定記事の自動キュー投入・タスクスケジューラーによる無人起動は **すべて停止** しています。
- **処理対象は「ユーザーが明示的に指定したもの」だけ。** URL / フォルダ / テーマ / サイト記事をユーザーが指定したときにだけ、記事化パイプラインを起動します。
- **記事化以降の作業は引き続き自動化** します（MDX 化 / WebP 化 / build / PR 作成 / merge / fallback deploy / strict verify / queue 状態更新 / X 投稿案作成）。
- **既存の自動収集スクリプトは削除していません。** 後で手動起動できるように残してあります。再有効化したい場合は `docs/user_directed_mode.md` 参照。

### 入口（user-directed mode）

| トリガー | 標準コマンド | 備考 |
|---|---|---|
| URL 指定 | `npm run sumalabo:from-url -- <url>` | `article:from-sumahon` のエイリアス |
| フォルダ指定（素材一式） | `npm run sumalabo:from-folder -- "<absolute folder path>"` | Claude が会話起点で処理。スクリプトはガイド表示 |
| queue 内の指定 slug を処理 | `npm run sumalabo:process -- --slug=<slug>` | `sumahon:regenerate-next` のエイリアス（slug 必須） |
| テーマ指定 | Claude との会話で指示 | 例：「Google AI Ultra のテーマで記事を書いて」 |

### user-directed mode で **やめたこと**

- すまほん新着の自動巡回（`sumahon-watch.mjs` の cron / スケジュールタスク起動）
- Google ニュースなどの自動収集
- 未指定記事の自動キュー投入
- タスクスケジューラーで無人起動 → 勝手に処理開始
- ユーザー未確認のまま新しいテーマを処理すること

### user-directed mode で **残したこと**

- 素材ありフォルダの量産モード（複数本まとめてOK）
- WebP 画像最適化
- lead-first / slide-main 記事構造
- 禁則チェック（普通の人 / すまほん / smhn / ここから本文 / 最終稿 / 初稿 / 元記事）
- `npm run build`
- PR 作成（`gh pr create`）
- PR merge（**ユーザーの明示承認後**）
- wrangler fallback deploy
- strict verify（`/api/verify-publication`）
- queue 状態更新（**手動指定対象に限る**）
- X 投稿案の作成（**投稿はしない**）

## 結論

**人間に求めるのは「処理対象の指定」と「最後の承認判断」。** ユーザーが「これを記事化する」と指定したものだけを処理し、それ以降の自動化作業（MDX 化〜deploy〜verify）は Claude Code 側で完結させます。

## 人間（運営者）の役割

| やること | やらないこと |
|---|---|
| PWA または Cloudflare Preview で記事を確認する | PR の作成 / マージ操作 |
| 問題がなければ承認ボタンを押す（`/api/approve-preview`） | Preview URL の探索・コピー |
| ファクトチェックの最終目視（記事の核となる主張・サムネのロゴ混入有無・参考URLの到達確認など） | secret の同期 / Cloudflare 設定確認 |
| 中止・修正方針の判断（必要時のみ） | スクリーンショット取得 |
| | ChatGPT への画像添付・コピペ |
| | `npm run build` などの手動実行 |
| | `git push` / branch 切替 |

人間が手を動かすのは **PWA の承認ボタンを押す瞬間** だけが理想形。それ以外は Claude が自分で進めてダメなら自動診断・自動リトライ・最終報告までやる。

## Claude Code / Claude in Chrome の役割

以下を **すべて自律的に** 実行する。途中で人間に対話を求めない（修正方針の選択肢を提示するなど、判断が必要なときだけ最小限聞く）。

> **重要（user-directed mode）：以下のステップ 1（自動巡回からの記事発見）は停止しています。** 起点はユーザーの明示指定（URL / フォルダ / テーマ）です。`sumahon-watch.mjs` を含む自動収集系スクリプトは削除せず残してありますが、ユーザーが明示的にコマンドを叩いた場合だけ起動します。

1. **元記事の発見・要点メモ生成**（**user-directed mode で停止**。従来は `scripts/run/sumahon-watch.mjs` などの自動ループから取得していたが、現在はユーザーが URL / フォルダ / テーマを指定したときだけ発火）
2. **記事本文生成プロンプト作成 → ChatGPT で本文生成 → 精錬 → 最終稿を `drafts/generated/{slug}.md` に保存**
3. **ブログ化用資料一式生成 → `drafts/materials/{slug}.materials.md` に保存**
4. **最終版サムネイル画像生成プロンプト作成 → `drafts/materials/{slug}.thumbnail-prompt.md` に保存**
5. **サムネ生成専用 ChatGPT チャットを開く → ベース画像 2 枚を `scripts/automation/chatgpt-attach-files-clipboard.ps1` で 1 枚ずつ CF_HDROP 貼り付け（UWSC はフォールバック）→ 画像生成 → ダウンロード → `public/images/thumbnails/{slug}.png` へ配置**
6. **MDX 化 (`article:import-generated`)**
   - `sourceCheck` (`validateSourceReferences`)
   - `articleQualityCheck` (`validateArticleQuality`、`validateCharacterVisualPresence` 含む)
   - blocking があれば自動修正 → 再検証 → なお blocking なら人間に最小限の相談
7. **`npm run build`** で 30 ページ生成を確認
8. **Preview ブランチ `preview/{slug}` を作成 → commit → push**（`git add .` は使わない。関係ない drafts / logs は add しない）
9. **PR 作成 (`gh pr create`)** — main ブランチへの直接 push は禁止
10. **Cloudflare Pages の Preview URL を `gh pr view --json comments` から自動取得** — 推測しない、コメントを必ずパースする
11. **PWA へ通知**: `scripts/run/notify-review-ready.mjs` で `/api/push/notify-review-ready` を叩き、`X-Notify-Secret` 付きで Web Push を送る。secret 未設定なら warning でスキップ（人間に同期させない、`functions/api/push/check-secret.ts` で自動確認する）
12. **visualPreviewReview** — Preview デプロイ完了後、Claude in Chrome がスマホ幅 + PC 幅のスクショを取得し、ChatGPT に 1 枚ずつ添付して 2 パスレビュー（読みやすさ / ファクトチェック）。結果は `logs/visual-review/{slug}/` に保存（main にはマージしない、`.gitignore` 対象）
13. **必要なら追加修正 → 再 build → 再 push**
14. **失敗時の自動診断**:
    - build 失敗 → エラーログを構造化して原因分類、最小修正で再試行（最大 3 回）
    - Cloudflare デプロイ失敗 → `gh pr view --json statusCheckRollup` で SUCCESS/FAILURE を判定、失敗詳細を `logs/automation/` に保存
    - secret ミスマッチ → `/api/push/check-secret` で照合、ミスマッチなら通知をスキップして警告ログ
    - スクショ添付失敗 → クリップボード経路 → UWSC フォールバック → ヘッドレスレンダリング、の順で自動切替
    - ChatGPT 応答エラー → 同プロンプトで再送 2 回、3 回目は簡略化版で再送、それでもダメなら最終報告に「未生成」として記録
15. **最終報告**: 完了サマリ（生成ファイル一覧、検証結果、PR URL、Preview URL、人間が承認時に見る観点）を 1 メッセージで提示

## 禁止事項（Claude Code 側）

- ❌ 人間に PR を作らせる（必ず `gh pr create` で自動作成）
- ❌ 人間に Preview URL を探させる（必ず `gh pr view --json comments` でパース）
- ❌ 人間にスクショ取得・画像添付を依頼する（PowerShell + Chrome MCP で自動化）
- ❌ 人間に build / push を依頼する
- ❌ 人間に secret 同期を依頼する（`/api/push/check-secret` で自動照合）
- ❌ 人間に Cloudflare 設定確認を依頼する
- ❌ `main` ブランチへの直接 push
- ❌ `git add .` の使用（関係ない drafts / logs / 素材ファイルを巻き込まないよう、必ず明示パスで add）
- ❌ `logs/visual-review/` を main に入れる（内部品質ログとして preview ブランチでも追跡せず、ローカル disk のみ）
- ❌ Edge を操作する（Chrome のみ）
- ❌ hidden file input の直接クリック / `file_upload` API の使用
- ❌ **ユーザー未指定の記事を自動巡回・自動収集・自動キュー投入する**（user-directed mode）
- ❌ **`sumahon-watch.mjs` / `run-sumahon-queue.ps1` をユーザー指示なしで起動する**
- ❌ **Windows タスクスケジューラーでの無人定期起動を有効化する**（再有効化したいときは必ず事前にユーザー確認）
- ❌ **X への投稿実行**（投稿案の `drafts/social/` 保存だけ。POST は人間が行う）

## 例外: 判断を仰ぐ最小ケース

以下のいずれかに該当する場合のみ、人間に **1 度だけ** 短く相談する（実行前に必ず提示）:

1. **公開判断が割れる**: 自動修正後も sourceCheck / articleQualityCheck の blocking が残る、かつ自動リトライ 3 回が失敗
2. **記事の核となる主張が事実と矛盾している疑い**: hedge を尽くしても噂を断定しているように読める、または公式情報と明確に食い違う場合
3. **サムネに実在ロゴ・元記事画像コピーの疑い**: 自動検査ではグレー判定で、人間目視で外したい場合
4. **コスト・破壊操作の懸念**: API トークン消費が著しく増える / 既存記事を上書きする / 既存 PR を force-push で巻き戻す等

その他は自律実行。途中報告は最低限にして、最終報告で必要情報を一括提示する。

## 最終報告の固定テンプレ

```
## 完了サマリ

### 記事
- slug:
- タイトル:
- 公開予定: status="review" → 承認後 published

### 検証
- sourceCheck: ok / urlCount / sumahon非露出 / reportingNotice
- articleQualityCheck: titleDuplicate / markdownResidue / character_visual_missing 等
- npm run build: 30 pages OK

### 自動化結果
- preview ブランチ: preview/{slug} (commit: xxxx)
- PR: #NN (URL)
- Preview URL: https://xxxx.sumalabo.pages.dev/articles/{slug}/
- PWA 通知: 送信済み / skipped (理由)
- visual-review: blocking N / warning N / deferred N (logs/visual-review/{slug}/ に保存、main 非追跡)

### 人間に確認してほしい点（承認判断用）
- [ ] 記事の核となる主張に違和感がないか
- [ ] サムネに実在ロゴ・原画コピーが混入していないか
- [ ] 参考URLが正しく到達するか（任意 1 件クリック）
- [ ] スマホ表示で読みにくい箇所がないか

問題なければ Preview の「この記事を承認して公開」ボタンを押してください。
```

## 図解スライドを記事に入れる場合のルール（必須）

**「スライド画像を入れる場合は、必ずコピー可能な HTML 要約をセットにする」** が標準です。画像内文字はコピーできず、SEO・アクセシビリティでも弱いため、画像は視覚理解用、HTML は読み取り・コピー・補足用としてセットで扱います。

### 必須構成（各図解 1 ブロック）

```mdx
<section class="article-slide-section article-wide-block">
  <p class="slide-intro">短い導入文 1 文（何を見る図か）</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/{slug}/figNN-name.png"
         alt="図の内容を 1〜2 文で説明（スクリーンリーダー向け）"
         loading="lazy" decoding="async" />
    <figcaption>図解：図のタイトル</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>図のポイント（コピー可能）</strong></p>
    <ul>
      <li><strong>項目1</strong>：画像内の重要テキストを HTML でも読める形で（短く）</li>
      <li><strong>項目2</strong>：1 行は短く、bullet は 2〜5 個まで</li>
      <li><strong>項目3</strong>：完全な文字起こしではなく、読者がコピーしたい要点に絞る</li>
      <li><strong>結論</strong>：そのスライドから持ち帰る一言</li>
    </ul>
  </div>
</section>
```

### ルール

1. **画像と HTML 要約は同じ wide-block 幅で揃える**（PC では 1080px シェル全幅）。`article-wide-block` クラスは必須。
2. `alt` 属性は必ず入れる（スクリーンリーダー / 画像が表示されない環境のフォールバック）。
3. `figcaption` も必ず入れる（画像が表示される環境で何の図かを示す）。
4. `slide-reading-note` の bullet は **2〜5 個**、各 bullet は **1 行で読める長さ** に抑える。
5. 画像内の **全テキストを書き起こさない**。読者がコピーしたい要点だけを HTML 化する。
6. 画像と同じ内容を本文の長文段落で繰り返さない（重複削減）。
7. 完全な文字起こしが必要なときは `<details class="slide-transcript article-wide-block">` で折りたたみを追加してよい。ただしページが重く見えるなら `slide-reading-note` だけで十分。

### 使うクラス（既存）

- `article-slide-section` — 導入文・図・読み取りポイントを wide-block でまとめるラッパー
- `slide-intro` — 短い導入文
- `article-slide-figure` — 画像 + figcaption
- `slide-reading-note` — コピー可能な読み取りポイント（teal の上ボーダー + ミントの BG）
- `slide-transcript` — 完全テキスト用の折りたたみ（任意）
- `article-wide-block` — 行長制約から外し、shell 全幅を使うためのフラグクラス

### 実装場所

- CSS: `src/layouts/ArticleLayout.astro` の `<style>` ブロック末尾
- 参考実装: `content/articles/202605-apple-airtag-size-ai-pendant-iphone-siri.mdx` の fig01〜fig05

## 深掘り記事の構成標準（スライド主役 / lead-first / 図解中心）

すまラボの深掘り記事（ニュース解説・比較・基礎解説）では、**長文だけで押し切らない**。
重要論点は **図解スライド・比較表・判断ガイド・チェックポイント一覧** に分解し、本文は
**「図解の補足」と「判断の言語化」** に集中させる。

### 基本ルール

1. **「先に結論」は長文 3 段落ではなく、ひとこと結論 + 要点整理 + 短い補足** で組む:
   - 見出し `先に結論` の直下に `<p class="lead">…</p>`（19px 太字 / 1 文）
   - 続けて 3 bullet で要点
   - 補足は短い 1〜2 段落だけ
   - 「今見るべき N 点」など別ボックスに切り出す
2. **H2 直下にも `.lead`** を置き、そのセクションの主張を 1 文で先出しする
3. **長文段落の連続を避ける**:
   - 1 段落は 3〜4 行（150 字目安）に抑える
   - 4 段落以上連続して同じ話題を続けない
   - `box / list / table / slide` を**視線の止まる場所**として一定間隔で挟む
4. **スライド・図解で説明した内容を、本文の長文段落で再説明しない**:
   - スライド直下は `slide-reading-note` の短い箇条書きだけで止める
   - 「読み取りポイント」「補足」「判断ポイント」を短い box / list で
5. **キャラクター（ひまり・らぼまる）を使った図解** は、理解補助・比較補助・チェック補助の役割として有効。サムネだけでなく、本文内の図解スライドにも積極的に登場させてよい
6. **外向きコピー**: 「普通の人向け」は禁止。代わりに「買う前に見るポイント」「今見るべき点」「判断ガイド」「便利？それとも様子見？」など
7. **行長（PC）**: news 系の本文段落・リストは `max-width: 940px`、wide-block（slide / dashboard / pros-cons / verdict / wide-comparison / decision-guide / summary-box / info-box / check-box / table-card）は shell 全幅（PC 1080px）。本文行長と画像幅の差が大きくならないように

### 推奨テンプレ（1 H2）

```mdx
## セクション見出し

<p class="lead">そのセクションの主張を 1 文で先出し。<strong>キーワード</strong>は太字で。</p>

（必要なら）2〜4 行の導入段落 1〜2 個

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">何を見る図か 1 文</p>
  <figure class="article-slide-figure">…</figure>
  <div class="slide-reading-note">
    <p><strong>図のポイント（コピー可能）</strong></p>
    <ul>
      <li><strong>キーワード</strong>：短い解説</li>
      <li>2〜5 個まで、各行は短く</li>
    </ul>
  </div>
</section>

（必要なら）読み取り後の短い結論 1 段落
```

### 避けたい形

- H2 → 長文段落 5〜8 個 → table → 長文段落 3 個 → box → 長文段落 2 個
- スライドの直後に、同じ内容を長文で書き直す
- 「先に結論」に 3 段落の長文を並べる

### 横スクロール標準（PC 原則禁止）

PC 表示では **横スクロールを原則使わない**。スマホでも基本は折り返しで収める。横スクロール
は「列数が非常に多い詳細比較表 / 数値・スペック密度が高い表 / 折り返すと著しく読みにくく
なる表」のみで明示的に許可する。

- **PC**：すべての `<table>` は `display: table; white-space: normal; word-break: break-word;
  overflow-wrap: anywhere;` で折り返し前提
- **opt-in**：横スクロールを許可したい大型表は **`.is-scrollable`** をラッパー or 自体に付ける
  と PC でも横スクロール可能（`overflow-x: auto; display: block; white-space: nowrap;`）
- **`.wide-comparison`**：PC は折り返し、モバイルだけ自動 overflow-x: auto を許可（4 列前後
  までの比較表向けデフォルト）
- **revenue 系**：`.article-shell--revenue` の table は引き続き `display: block; overflow-x:
  auto;` を維持（料金比較などの密度の高い表のため）
- 表のセル内文章は **短く保つ**（1 セル 30 文字以内が目安。長い説明は本文側に逃がす）
- `min-width` を `<th>` / `<td>` に固定しない（列幅は表の中身に任せる）

`.is-scrollable` を使う条件:
- 6 列以上の詳細比較表
- 数値・スペックが多い表
- 折り返すと著しく読みにくくなる表

それ以外は PC で必ず折り返して収める。スライド画像 / `slide-reading-note` / 本文段落・
リスト / `.lead` が横にはみ出さないことを `npm run build` 後に必ず確認すること。

### CSS の場所

- `.lead` / `.article-slide-section` / `.slide-intro` / `.slide-reading-note` /
  `.article-slide-figure` / `.slide-transcript` / その他 wide-block の各クラスは
  `src/layouts/ArticleLayout.astro` の `<style>` ブロックに集約

### 参考実装

- `content/articles/202605-apple-airtag-size-ai-pendant-iphone-siri.mdx`
  （Apple AIペンダント記事。先に結論 + 5 図解スライド + 各 H2 lead 配置の例）

## 関連ドキュメント

- `docs/visual_preview_review.md` — Preview スクショ 2 パスレビューの手順とチェック観点
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付（標準）
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック
- `docs/pwa_review_notification.md` — PWA 通知の仕組み
- `docs/preview_approval_button.md` — 承認ボタンの動作
- `scripts/sumahon/generate-handoff.mjs` — handoff / chrome-steps の生成元
- `scripts/sumahon/validate-generated-article.mjs` — sourceCheck / articleQualityCheck

## 改訂

このポリシーが変わるのは、人間が **明示的に** 「役割分担を変えたい」と言ったときだけ。それ以外はこのまま固定。
