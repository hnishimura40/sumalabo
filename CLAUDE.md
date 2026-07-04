# CLAUDE.md — すまラボ自動化の役割分担と運用ポリシー

このドキュメントは、すまラボ記事作成・公開ワークフローにおける **Claude Code / Claude in Chrome がやること** と **人間（運営者）がやること** の境界を固定するためのものです。今後のセッションでもこのポリシーを **既定** として動きます。

## 運用モード（2026-05-23 以降）

**現在のモード： `user-directed mode` + `human review checkpoint` + `auto publish / X post flow`**

> 詳細： [`docs/user_directed_mode.md`](docs/user_directed_mode.md) ／ Phase A 入力フロー: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md) ／ **Article Refinement Loop: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)** ／ X 投稿フロー： [`docs/x_post_workflow.md`](docs/x_post_workflow.md) ／ queue 状態： [`docs/queue_states.md`](docs/queue_states.md)

### 3 行で言うと

1. **ネタ収集は自動化しない。** ユーザーが URL / フォルダ / テーマ / 記事を指定したときだけ起動。
2. **記事化 → PR 作成までは自動。その時点で必ず停止し、ユーザーの記事確認 + 明示了承を待つ。**
3. **了承後だけ、PR merge → fallback deploy → strict verify → queue 更新 → X 投稿まで一気に自動化。**

### 全体フロー（3 フェーズ + チェックポイント）

```
[Phase A: 記事化]
  ユーザー指定 → 対象確認 → MDX 化 → WebP 化 → 禁則チェック →
  build → preview ブランチ commit → push → PR 作成
                            ↓
       [Human Review Checkpoint — 必ず停止]
   Claude は PR URL / ローカル確認URL / 記事タイトル / slug /
   サムネ・画像圧縮結果 / build 結果 / 禁則チェック結果を提示。
   ユーザーが記事内容を確認し、「記事OK / 公開へ / 承認」など明示的に了承するまで待つ。
                            ↓
[Phase B: 公開]
  PR merge → main 同期 → wrangler fallback deploy →
  strict verify（全記事 8/8 pass）→ queue を published に更新
                            ↓
[Phase C: X 投稿]
  本番URL確認 → Chrome で X 投稿画面 → OGPカード / サムネ表示確認 →
  投稿アカウント @suma_labo 確認 → 投稿 → 投稿URL取得 → queue を x_posted に更新
                            ↓
                          完了報告
```

> **Phase A 完了時点で必ず停止します。** ユーザー明示了承前の merge / deploy / X 投稿 / queue published 化はすべて禁止です。

### Phase A 入口: 入力フロー（**本処理開始前**）

オーケストレーター指示文を受け取ったら、**Phase A 本処理に入る前に入力チェック**を行う。詳細: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md)

1. **必須入力確認**：対象種別（url / folder / theme / site+article）と対象内容が揃っているか確認
   - 揃っていない / プレースホルダ（`{...}` のまま） → `AskUserQuestion` で不足を聞く
2. **対象の実在・重複チェック**：URL の到達可否 / フォルダの実在 / 既存記事・PR・queue との重複
   - 停止条件に該当 → `AskUserQuestion` で判断を聞く（上書き / 別 slug / 中止）
3. **対象確定レポートを表示**：想定 slug / 想定スコープ / ChatGPT 呼び出し見積 / preview ブランチ予定名を進行ログとして出す
4. **そのまま Phase A 本処理を自動開始**：停止条件に該当しなければ「進めて」を待たずに本処理に進む

> **停止ポイントは原則 1 つ：PR 作成後の Human Review Checkpoint。** Phase A 前の停止は、入力曖昧 / 不明 / 重複あり等の停止条件に該当したときの例外動作だけ。
>
> user-directed mode では、ユーザーがすでに対象を指定済み。**入力が明確なら毎回「進めて」を待つ二重確認はしない。**

### Phase A: 記事化フェーズ（本処理）= 正規フロー（手動フロー基準・省略不可）

**基準は「これまでユーザーが手動で行っていた記事作成フロー」。** Claude Code 独自の処理順に置き換えない。入力チェック通過後、対象確定レポートを表示してから、以下 **12 ステップを順番どおり省略せず** 実行する（記事の主軸は「自分に関係ある？／課金すべき？」ではなく **デジタルニュースをやさしく噛み砕いて説明すること**。読者判断は補助）。

1. **公式情報・主要報道を調べる**（一次情報・公式発表・主要メディアを読む。Research Pass）
2. **ユーザーメモと照合する**（提示メモを鵜呑みにせず、一致 / 食い違い / 確認不能を明示。facts / claims / uncertain に分類）
3. **すまラボ向けに取捨選択する**（全部入れない。読者に必要なものを採用 / 限定採用 / 不採用。Editorial Selection）
4. **デジタルニュースをやさしく噛み砕く**（何が起きた / なぜ話題 / 誤解されやすい点 / 確定・未確定の整理 / 意味づけ。Sumarabo Translation）
5. **本文ドラフトを作る**（lead-first / 先に結論 / 表・チェックリスト・判断ガイド / 長文連打を避ける）
6. **メタ表現・煽り・誤解・断定・禁則語を複数回チェックする**（禁則 `普通の人` / `普通の人向け` / `すまほん` / `smhn` / `元記事` / `ここから本文` / `初稿` / `最終稿` が 0 件。「全部有料化」「日本ですぐ開始」等の誤読・断定を除去。最低 2 回）
7. **すまラボらしさを確認する**（ニュースの噛み砕きが主軸か / ただの要約で終わっていないか / 事実・未確定・日本での扱いが分かれているか）
8. **最終稿を出す**（レビュー反映後の確定稿。これを記事本文の基準にする）
9. **最終稿をもとにスライド構成を作る**（1 枚 1 テーマ / 6〜8 枚目安 / ひまり=読者目線、らぼまる=整理・比較・チェック役）
10. **ひまり・らぼまる素材でスライド・サムネを作る**（同一 ChatGPT「すまラボ台本」プロジェクト内。4:5 縦長 1280×1600、サムネは 16:9。置物にしない）
11. **画像もファクトチェックし、必要なら再生成する**（文字・数値・固有名詞・未確定表現を確認。架空価格・誤情報があれば再生成）
12. **MDX化・WebP化・build・PR・Preview通知まで進む**（WebP 1枚200KB前後・上限500KB / `npm run build` / `gh pr create` / **Phase A 出口 `npm run sumalabo:finalize`** で CF preview deploy→preview URL検証→review item登録+プレビュー確認待ち通知→queue `review_waiting`）

> ステップ 1〜8 は ChatGPT「すまラボ台本」プロジェクト内で本文を練り上げる工程（Research Pass → Editorial Selection → Sumarabo Translation → Draft → Review×2〜3 → Final Draft）。詳細: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)。**この手動フローを省略して、いきなり画像生成や本文の機械生成に進まない。**

> **画像生成前の必須工程：Article Refinement Loop**
> 画像生成（スライド・サムネ）に進む前に、本文ドラフト → 自己レビュー × 2〜3 → `article-ready-for-images` 6 条件クリアの順で必ず Refinement Loop を通過する。**本文・スライド構成案がない状態で画像だけ先に作るのは禁止。** 詳細: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)
>
> queue 状態は `article_generated` → `article_ready_for_images` の間で必ずこのループを回す。Loop を飛ばして直接画像生成に進んだら方針違反として停止。

> **画像生成必須時の事前チェック**（Refinement Loop 通過後）：ユーザー指示で **スライド・サムネの新規生成が必須** の場合（指示文に「ChatGPT を使い画像生成」「スライド」「サムネ」等の記述あり、または素材フォルダに既存画像がない場合）、画像生成に入る前に **画像生成経路の事前チェック** を行う：
>
> - `mcp__claude-in-chrome__*` がロードされているか
> - Chrome 拡張がペアリングされているか（**Edge ペアリングは経路なし扱い**）
> - ChatGPT セッションが開ける状態か
>
> 経路が通らないと判定したら、**本文 MDX だけで PR を作成しない**。queue を `blocked_image_generation_unavailable` にして、原因 / 復旧手順 / 再開方法を報告して停止する。**ユーザーが明示的に「画像なしで進めて」と返答したときだけ画像なし PR を許可**。詳細: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md) section 5-bis / 5-ter

（上記 12 ステップが Phase A の正規フロー。下記は各工程の補足ルール。）

> **Phase A 出口の鉄則（共通化・ステップ 12）**
> - 記事URL / サムネ / スライド画像が **https の Cloudflare Pages Preview で 200** であることを確認してから通知する。
> - **`127.0.0.1` / `localhost` / `0.0.0.0` / `file://` / `chrome://` / 非https を review item のメイン `previewUrl` にしない。** 渡された場合は通知せず `local_preview_url_rejected`（または `failed_preview_url_invalid`）で停止。`scripts/sumahon/preview-url-policy.mjs` のガードが verify と notify の二層で弾く。
> - **チャットで PR URL を報告するだけ」を Human Review Checkpoint としない。** プレビュー確認待ち通知 + Preview/PWA 確認導線 + 承認導線まで到達して初めて Checkpoint。

### Human Review Checkpoint（Phase A → Phase B の間）

Phase A 出口（finalize）通過後、**必ず停止する**。停止時には以下が揃っていること：プレビュー確認待ち通知送信済み / review item 登録済み（`review_waiting`、https Preview URL）/ PWA review 一覧で開ける状態 / 承認導線（承認ボタン or 「記事OK、公開へ」）が有効。

**この時点で OK：**
- **https の Cloudflare Pages Preview URL** の提示（スマホ/PWA から開ける）
- プレビュー確認待ち通知の送信
- 記事タイトル / slug / カテゴリ / 役割の報告
- サムネ・スライドの圧縮結果・200確認の報告
- build 結果報告
- 禁則チェック結果報告
- **X 投稿案の下書き作成のみ可（`drafts/social/{slug}.x.md` への保存）。投稿はしない。**

**この時点で NG：**
- ❌ ローカル URL（127.0.0.1 等）を review item のメイン previewUrl にする / それで通知する
- ❌ PR merge
- ❌ production / fallback deploy
- ❌ strict verify による published 化
- ❌ X 投稿
- ❌ queue の published 化

**この時点で NG：**
- ❌ PR merge
- ❌ production / fallback deploy
- ❌ strict verify による published 化
- ❌ X 投稿
- ❌ queue の published 化
- ❌ 承認ボタンを押す（`/api/approve-preview`）

**停止メッセージ例：**

> 記事化と PR 作成まで完了しました。以下の URL で記事内容を確認してください。公開へ進める場合は「**記事OK、公開へ**」と指示してください。

**ユーザー了承トリガー例：** 「記事OK」「公開へ」「承認」「merge して公開」「この内容で進めて」

> 曖昧な返答（「あとで見る」「ちょっと待って」など）の場合は **勝手に公開しない**。判断に迷う場合は確認する。

### Phase B: 公開フェーズ

ユーザー明示了承後だけ実行：

1. **PR merge**：`mergeable: MERGEABLE` / `mergeStateStatus: CLEAN` / `isDraft: false` を確認 → `gh pr merge <N> --merge --delete-branch=false`。main への直接 push 禁止。merge commit を記録。
2. **main 最新化**：`git fetch origin main && git pull origin main`。merge commit が含まれていることを確認。
3. **wrangler fallback deploy**：`npm run deploy:production:fallback -- --slug=<代表slug>`。複数記事の場合も 1 回でよい（main 全体が反映されるため代表 slug を渡す）。
4. **strict verify**：対象記事すべてで `/api/verify-publication` 実行。`status: published` / `failedChecks: []` / 8 項目（`httpStatus` / `titleNotGeneric` / `slugInHtml` / `notHomepageFallback` / `hasArticleBody` / `hasThumbnailRef` / `noProhibitedCopy` / `indexListsArticle`）全 pass を確認。
5. **queue 更新**：strict verify 成功後だけ `published` に更新。`productionUrl` / `publishedAt` / `prUrl` / `mergeCommit` / `deployResult` / `verifyResult` / `source: user_directed` / `triggeredBy: user` / 指定対象（URL or フォルダ）を記録。

**失敗時：** published 扱いにしない。X 投稿しない。失敗 check と原因を報告して停止。

**承認ボタン経由のとき（運用標準・改善メモ 2026-06）：** PWA の承認ボタンは `/api/approve-preview` で PR を自動 merge する。その際 Cloudflare Deploy Hook が不発になり、review item が `deployTriggered: false` / `needsWranglerFallback: true` / `publicationVerifyError: "deploy_hook_not_triggered"` になることがある（Meta One・Claude Opus 4.8 の 2 件で連続発生）。この場合は **停止してユーザーに聞き直さず、main HEAD から wrangler fallback deploy（`node scripts/automation/deploy-production-from-main.mjs --slug=<slug> --skip-git-sync`）へ自動で進む** のを標準運用とする。これは新規の本番デプロイではなく、ユーザーが承認済みの記事の公開を完了させる自動リカバリ。完了後に `/api/verify-publication` で `status: published` を確認する。Deploy Hook URL は表示しない。

### Phase C: X 投稿フェーズ

Phase B 完了後だけ実行：

**前提条件（**すべて満たすこと**）：**
- ユーザーが記事内容を了承済み
- PR merge 済み
- production fallback deploy 成功
- strict verify 8/8 pass
- 本番URLが開ける
- 投稿アカウントが **@suma_labo** であることを確認
- **Chrome を使う**（Edge 禁止）

**投稿前に必ず確認：**
- URL を投稿画面に貼る → OGP カード表示 / サムネ表示 / タイトルが記事内容と合っている / サムネが古くない / 投稿文に URL 含む / 投稿文に禁則表現や誤字がない

**投稿してはいけない条件：**
- X カードが出ない / サムネが出ない / サムネが古い / タイトルが違う / strict verify 失敗 / 本番URLが開けない / 投稿アカウントが @suma_labo ではない / ユーザー了承前 / 記事確認前

**投稿後：**
- 投稿URL を取得
- queue に `xPostUrl` / `xPostedAt` / `xPostText` を記録、status を `x_posted` に更新
- 完了報告に投稿URL を含める

**投稿文ルール：** 短め / URL を含める / ハッシュタグ 2〜3 個 / 「普通の人」表現禁止 / 煽らない / 記事内容に沿う

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
- **ユーザー記事確認前の merge / deploy / X 投稿**

### user-directed mode で **残したこと**

- 素材ありフォルダの量産モード（複数本まとめてOK）
- WebP 画像最適化（1 枚 200KB 前後 / 上限 500KB）
- lead-first / slide-main 記事構造
- 禁則チェック
- `npm run build`
- PR 作成（`gh pr create`）
- **ユーザー明示了承後の** PR merge / wrangler fallback deploy / strict verify / queue 更新 / X 投稿
- X 投稿案の下書き作成（`drafts/social/{slug}.x.md`）

## 結論

**人間に求めるのは「対象の指定」と「記事確認後の明示了承」の 2 点だけ。**

- 対象指定までは人間が行う（自動収集なし）
- 記事化〜 PR 作成までは Claude が自動で進める
- **記事化が終わったら必ず止まり、ユーザー確認を待つ**
- 了承後だけ、merge → deploy → verify → queue 更新 → X 投稿までを一気に自動化する

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
15. **Phase A 最終報告**: 完了サマリ（生成ファイル一覧、検証結果、PR URL、Preview URL、人間が承認時に見る観点）を 1 メッセージで提示 → **ここで必ず停止する**（Human Review Checkpoint）
16. **ユーザー明示了承を待つ**: 「記事OK / 公開へ / 承認」等のトリガーが来るまで Phase B / C に進まない
17. **Phase B（公開）**: PR merge → main 同期 → wrangler fallback deploy → strict verify 8/8 → queue を `published` に更新
18. **Phase C（X 投稿）**: 本番URL確認 → Chrome で X 投稿画面 → OGPカード/サムネ/アカウント (@suma_labo) を確認 → 投稿 → 投稿URL取得 → queue を `x_posted` に更新
19. **Phase B / C 完了報告**: 本番URL / 投稿URL / queue 更新内容を 1 メッセージで提示

## 禁止事項（Claude Code 側）

### 常時禁止

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
- ❌ **Cloudflare Deploy Hook を叩く**（`wrangler` fallback だけ使う）
- ❌ **secret / token / Deploy Hook URL を表示する**（チャット・ログ・コミットメッセージ全部 NG）
- ❌ **画像元ファイルを削除する**（素材は `_published_articles/` 配下に保管）
- ❌ **`SUMALABO_ENABLE_SLIDE_PIPELINE` を勝手に ON にする**
- ❌ **PR-C / PR-D に勝手に進む**（明示指示があったときだけ）
- ❌ **画像生成が必須な指示で、画像生成経路（Chrome MCP）が使えないのに本文だけで PR を作成する**（`blocked_image_generation_unavailable` で停止する）
- ❌ **`frontmatter.thumbnail` 空・スライド 0 枚のまま通常 PR（Ready）を作成する**（ユーザーが「画像なしで進めて」と明示したときだけ許可）
- ❌ **Article Refinement Loop（自己レビュー × 2〜3 / `article-ready-for-images` 6 条件）を通過せずに画像生成へ進む**
- ❌ **本文ドラフトなしでスライド・サムネを先に作る**
- ❌ **記事の議論と画像生成を別の ChatGPT チャットに分ける**（同一チャットで論点 → スライド → サムネをつなげる）
- ❌ **「すまラボっぽい絵」を汎用的にだけ作る**（記事固有の論点と切り離した画像は禁止）

### ユーザー記事確認・了承前は特に禁止

- ❌ **PR merge**（`gh pr merge`）
- ❌ **production deploy / fallback deploy**（`npm run deploy:production:fallback`）
- ❌ **strict verify による queue published 化**
- ❌ **X への投稿実行**（Chrome で X を開いて POST する操作）
- ❌ **承認ボタンを押す**（`/api/approve-preview` / `/api/push/notify-review-ready` 自動発火）
- ❌ **queue を `published` / `x_posted` に書き換える**

## 画像生成前ゲートの扱い（停止ポイントではない）

画像生成前ゲートは **停止ポイントではなく「自動通過チェック」** である。`final_article.md` / `review_report.md` / `slide_plan.md` が存在し、禁則チェック・すまラボ方針チェック・slide_plan 整合チェックを通過した場合、**ユーザー確認を挟まず画像生成へ自動進行する**。ユーザー確認で止まってよいのは **Phase A 完了後の Human Review Checkpoint のみ**。

停止してよいのは、ゲートNG / 画像生成不可 / 画像取得失敗 / ファクトチェックNG / build失敗 / Preview URL生成・検証失敗 / 通知失敗 などの重大ブロック時だけ。ゲートOKなのに「続行してよろしければ」等の確認で止まらない。

**機械判定は `sumalabo:gate` が行う（目視・自己申告に頼らない）：**

- 画像生成前: `npm run sumalabo:gate -- --slug <slug> --stage draft`（final_article / review_report / slide_plan 等の存在＋禁則語のみ検査）
- Phase A 出口: `npm run sumalabo:finalize` の先頭で自動的に `--stage full` が走る（frontmatter 必須キー / 禁則語 / 画像参照整合（WebP限定・実在）/ dist の OGP 実測）。**exit 1（violation あり）なら build・Preview URL 作成・review item 登録・通知へ一切進まない**
- 禁則語リストは `data/qa/forbidden-words.json`。誤検知はリスト側を直す（記事を歪めない）。パターン削除・warning 化など検査を弱める変更は理由を報告してから行う
- **目視で確認するのは機械判定できない項目に限る**: facts / claims / uncertain の線引きの妥当性、記事の主軸（やさしく噛み砕く）の確認、サムネの実在ロゴ・煽り絵柄の有無

## 例外: 判断を仰ぐ最小ケース

以下のいずれかに該当する場合のみ、人間に **1 度だけ** 短く相談する（実行前に必ず提示）:

1. **公開判断が割れる**: 自動修正後も sourceCheck / articleQualityCheck の blocking が残る、かつ自動リトライ 3 回が失敗
2. **記事の核となる主張が事実と矛盾している疑い**: hedge を尽くしても噂を断定しているように読める、または公式情報と明確に食い違う場合
3. **サムネに実在ロゴ・元記事画像コピーの疑い**: 自動検査ではグレー判定で、人間目視で外したい場合
4. **コスト・破壊操作の懸念**: API トークン消費が著しく増える / 既存記事を上書きする / 既存 PR を force-push で巻き戻す等

その他は自律実行。途中報告は最低限にして、最終報告で必要情報を一括提示する。

## 最終報告の固定テンプレ

### Phase A 完了報告（記事化 → PR 作成。**ここで必ず停止**）

```
## Phase A 完了サマリ — 記事化と PR 作成まで

### 記事
- slug:
- タイトル:
- カテゴリ / 役割:
- queue status: review_waiting

### 検証
- sourceCheck: ok / urlCount / sumahon非露出 / reportingNotice
- articleQualityCheck: titleDuplicate / markdownResidue / character_visual_missing 等
- 禁則チェック: 0 hits（普通の人 / すまほん / smhn / ここから本文 / 最終稿 / 初稿 / 元記事）
- npm run build: N pages OK
- 画像: 元 XX.X MB → WebP X.X MB（22 枚など）

### 自動化結果
- preview ブランチ: preview/{slug} (commit: xxxx)
- PR: #NN (URL)
- Cloudflare Preview URL: https://xxxx.sumalabo.pages.dev/articles/{slug}/（取れない場合はローカル確認URL）
- visual-review: blocking N / warning N / deferred N

### ユーザーに確認してほしい点
- [ ] 記事の核となる主張に違和感がないか
- [ ] サムネに実在ロゴ・原画コピーが混入していないか
- [ ] 参考URLが正しく到達するか（任意 1 件クリック）
- [ ] スマホ表示で読みにくい箇所がないか

公開へ進める場合は「**記事OK、公開へ**」と指示してください。
（merge / deploy / X投稿は了承後にだけ実行します。）
```

### Phase B / C 完了報告（公開 + X 投稿。ユーザー了承後）

```
## Phase B / C 完了サマリ — 本番反映と X 投稿

### 記事
- slug:
- 本番URL: https://sumalabo.com/articles/{slug}/
- queue status: x_posted

### Phase B（公開）
- PR #NN merge 済み（merge commit: xxxx）
- main 同期 OK
- wrangler fallback deploy: ok
- strict verify: 8/8 pass（httpStatus / titleNotGeneric / slugInHtml / notHomepageFallback / hasArticleBody / hasThumbnailRef / noProhibitedCopy / indexListsArticle）

### Phase C（X 投稿）
- 投稿アカウント: @suma_labo
- OGPカード: 表示 OK / サムネ: 表示 OK / タイトル一致 OK
- 投稿URL: https://x.com/suma_labo/status/xxxxxxxx
- 投稿時刻: yyyy-mm-ddTHH:MM:SS+09:00
- 投稿文（先頭抜粋）: ...

### queue 更新内容
- status: x_posted
- productionUrl / publishedAt / prUrl / mergeCommit / xPostUrl / xPostedAt / xPostText を記録
- source: user_directed / triggeredBy: user / triggerInput: {URL or folder}
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

## 記事の主軸（すまラボ記事方針・2026-05-31 補正）

すまラボの記事の中心は、**デジタルニュース（スマホ・AI・ガジェット）をやさしく噛み砕いて説明すること**。
「あなたに関係ある？」「課金すべき？」のような **読者判断は補助**であって、記事の主軸に寄せすぎない。

記事の中心に置くのは次の 5 点：

1. **何が起きたのか**（事実の核）
2. **なぜ話題なのか**（意味・背景）
3. **どう誤解されやすいか**（読み違いの整理）
4. **確定情報と未確定情報の整理**（事実 / 報道ベース / 未確定を分ける）
5. **ニュースの意味づけ**（読者の生活・選択にとって何を意味するか）

読者判断（向いている人 / 様子見でよい人 / 判断ガイド）は **記事の最後寄りに補助として** 入れてよいが、
記事全体を「課金すべきか診断」に寄せない。判断ガイドは 1〜2 ブロックに留め、本文の主役は上記 5 点。

## 深掘り記事の構成標準（スライド主役 / lead-first / 図解中心）

すまラボの深掘り記事（ニュース解説・比較・基礎解説）では、**長文だけで押し切らない**。
重要論点は **図解スライド・比較表・判断ガイド・チェックポイント一覧** に分解し、本文は
**「ニュースの噛み砕き」と、補助としての判断の言語化** に集中させる。

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
