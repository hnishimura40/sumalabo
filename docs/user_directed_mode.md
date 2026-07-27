# すまラボ user-directed mode + human review checkpoint 運用ガイド

最終更新: 2026-07-27

## このドキュメントの位置づけ

`CLAUDE.md` に書いた **user-directed mode + human review checkpoint + auto publish / X post flow** の運用詳細をまとめたものです。完全自動運用を中止した経緯、3 フェーズ構成、ユーザー確認ポイント、X 投稿の安全条件、queue 状態設計、再開手順を整理します。

関連:

- Phase A 入力フロー: [`docs/phase_a_input_flow.md`](phase_a_input_flow.md)
- **Article Refinement Loop（画像生成前の必須ループ）: [`docs/article_refinement_loop.md`](article_refinement_loop.md)**
- X 投稿フロー詳細: [`docs/x_post_workflow.md`](x_post_workflow.md)
- queue 状態設計: [`docs/queue_states.md`](queue_states.md)

## 1. なぜこのモードか

これまでの「すまほん新着を自動巡回 → 自動キュー投入 → 自動記事生成 → 自動公開」は次の問題があった:

- 公開判断のタイミングが運営者の意図とズレる
- ユーザーが触っていないテーマまで記事化される
- ネタの良し悪し・記事品質の確認前に本番反映が走るリスクがある
- スケジュールタスクで無人起動するので、開始タイミングをユーザーがコントロールしづらい

そこで:

1. **ネタ収集は手動。** ユーザーが URL / フォルダ / テーマ / 記事を指定したときだけ起動
2. **記事化 → PR 作成までは自動。その時点で必ず停止し、ユーザー確認 + 明示了承を待つ**
3. **了承後だけ、merge → deploy → verify → queue 更新 → X 投稿まで一気に自動化**

## 2. 全体フロー（3 フェーズ）

```
[Phase A — 記事化]
  ユーザー指定 → 対象確認 → MDX 化 → WebP 化 → 禁則チェック →
  build → preview ブランチ commit → push → PR 作成
                            ↓
       [Human Review Checkpoint] ← 必ず停止
   PR URL / ローカル確認URL / 記事情報 / 検証結果を提示。
   ユーザーが記事内容を確認し「記事OK / 公開へ / 承認」と明示するまで待つ。
                            ↓
[Phase B — 公開]
  PR merge → main 同期 → wrangler 本番 deploy（正規手順）→
  strict verify 8/8 pass → queue を published に更新
                            ↓
[Phase C — X 投稿]
  本番URL確認 → Codex対話モード（Chrome拡張基本）で X 投稿画面 → 画像添付をDOM確認 →
  投稿アカウント @suma_labo 確認 → 投稿 → 投稿URL取得 → queue を x_posted に
                            ↓
                          完了報告
```

## 3. 入口（manual triggers）

| トリガー | 標準コマンド | 内部委譲先 |
|---|---|---|
| **URL 指定** | `npm run sumalabo:from-url -- <url>` | `scripts/run/create-from-sumahon.mjs --url <url>` |
| **フォルダ指定（素材一式）** | `npm run sumalabo:from-folder -- "<absolute path>"` | Claude との会話起点処理（スクリプトは案内のみ） |
| **queue 内 slug 指定** | `npm run sumalabo:process -- --slug=<slug>` | `scripts/run/regenerate-from-queue.mjs --slug=<slug>` |
| **テーマ指定** | Claude との会話で指示 | Claude が会話起点で実行 |

### 推奨フロー（素材ありフォルダの場合）

1. ユーザーが `D:\documents\動画作成関連\すまラボ\inbox\<テーマ名>\` に **`ブログ記事.txt` + 画像** を置く
2. ユーザーが Claude に「`<テーマ名>` フォルダで記事化して」と指示
3. **Phase A**: Claude が自律実行（素材 inspect → WebP 化 → MDX 作成 → build → PR 作成）
4. **Checkpoint**: Claude が PR URL / Preview URL / 検証結果を提示して停止
5. ユーザーが Preview を確認し、「**記事OK、公開へ**」など明示返答
6. **Phase B**: Claude が PR merge → wrangler 本番 deploy（正規手順）→ strict verify → queue 更新
7. **Phase C**: Codex対話モードがChrome拡張で X 投稿画面を開き、DOM検証 → 投稿 → 実在確認 → 投稿URL取得（`claude-in-chrome` は非常用）
8. **完了報告**: 本番URL / 投稿URL / queue 状態を 1 メッセージで提示

> **複数本まとめて処理してよい場合**：ユーザーが「inbox を一気に処理」など明示したときだけ。URL 指定記事は原則 1 本ずつ。複数記事の Phase B は wrangler deploy 1 回でよい（main 全体が反映されるため）。

## 4. Phase A: 記事化フェーズの内訳

> **本処理開始前の入力チェック**。詳細: [`docs/phase_a_input_flow.md`](phase_a_input_flow.md)
>
> - 必須入力（対象種別 + 対象内容）が揃っていない → `AskUserQuestion` で不足を聞く
> - 対象の実在・重複チェック → 停止条件に該当すれば確認
> - 対象確定レポートを表示（進行ログ）
> - **停止条件に該当しなければ、「進めて」を待たずに自動で本処理へ進む**
> - 記事内容確認のための停止は、Phase A 完了後の Human Review Checkpoint（PR 作成後）で行う
>
> **画像生成前の必須ループ（5-ter）— Article Refinement Loop**: 本文ドラフト → 自己レビュー × 2〜3 → `article-ready-for-images` 6 条件クリアを通過するまで、画像生成・MDX への slide-section 追加・PR 作成へ進まない。**本文・スライド構成案がない状態で画像だけ先に作るのは禁止**。詳細: [`docs/article_refinement_loop.md`](article_refinement_loop.md)
>
> **画像生成必須時の事前チェック（5-bis）**: Refinement Loop 通過後、画像生成経路（Chrome MCP / ChatGPT）が通るかを確認。経路不通なら本文 MDX だけで PR を作成せず、queue を `blocked_image_generation_unavailable` にして停止し、原因 / 復旧手順 / 再開方法を報告する。詳細: [`docs/phase_a_input_flow.md`](phase_a_input_flow.md) section 5-bis

1. **対象確認**
   - 指定 URL / フォルダの中身確認
   - 対象記事数の確定
   - 既存記事 / queue / PR との重複確認
   - 対象外ファイルは触らない
   - 判断に迷う場合は停止して報告

2. **記事化**（MDX）
   - lead-first / slide-main 構造
   - H2 直下に `.lead` を置く
   - 1 段落 3〜4 行（150 字目安）
   - スライド・図解で説明した内容を本文長文で繰り返さない
   - CharacterDialogue は必要な場合のみ 1 回
   - 体験談風・断定表現は禁止
   - 使う構造: `summary-box` / `3行でわかるまとめ` / `先に結論` / `lead` / `article-slide-section` / `slide-intro` / `article-slide-figure` / `slide-reading-note` / `table-card` / `check-box` / `info-box` / 必要なら `decision-guide-panel` / `visual-flow` / `CharacterDialogue`

3. **禁則チェック**（0 hits 必須）
   - 普通の人 / 普通の人向け / すまほん / smhn / 元記事 / ここから本文 / 初稿 / 最終稿

4. **画像処理**
   - サムネ・スライドを WebP 化（quality=85, effort=6, max width 1280 for slides, 1600 for thumbs）
   - 1 枚 200KB 前後 / 上限 500KB
   - 元 PNG / JPG は素材フォルダに残す（リポジトリには WebP のみ）
   - MDX 参照は WebP / 旧 PNG 参照を残さない
   - 文字入り画像は読める品質を維持

5. **build**
   - `npm run build`
   - 記事ページが dist に生成、`/articles/` とカテゴリ一覧に掲載
   - サムネ・スライド画像が 200 で読める
   - PC 横スクロールなし / H1 重複なし

6. **PR 作成**
   - `preview/<slug>` ブランチ
   - commit は明示パスで add（`git add .` 禁止）
   - `gh pr create` で PR 作成

7. **Phase A 出口（共通化・必須）= `npm run sumalabo:finalize`**
   - どの作り方でも Phase A 完了時はこの 1 本を通る（`scripts/run/phase-a-finalize.mjs`）
   - 内部処理（順番固定）: build → **Cloudflare Pages preview deploy（main 拒否）** → preview URL 解決 → **preview URL 検証（200 / 実記事 / homepage 誤配信でない / ローカルURLでない）** → review item 登録 + プレビュー確認待ち通知 → queue 更新（`review_waiting`）
   - **ローカルURL（127.0.0.1 / localhost / file:// / 非https）は通知しない。** `local_preview_url_rejected` / `failed_preview_url_invalid` で停止（`scripts/sumahon/preview-url-policy.mjs` が verify と notify の二層でガード）
   - Cloudflare Preview が作れない場合は **`preview_unavailable` で停止**。ローカルURLを「メイン確認URL」にしてはいけない（PWA/スマホから開けないため）

## 5. Human Review Checkpoint（必ず停止）

Phase A 完了時点で **必ず停止する**。

### Claude がやること

- **https の Cloudflare Pages Preview URL の提示**（スマホ/PWA から開ける確認URL）
- PR URL の提示
- **プレビュー確認待ち通知を送信済みにする**（review item 登録 + Web Push）
- 記事タイトル / slug / カテゴリ / 役割の報告
- サムネ・スライドの圧縮結果・200確認の報告
- build 結果（pages 数 / エラーなし）の報告
- 禁則チェック結果の報告
- **X 投稿案の下書き作成のみ可**（`drafts/social/{slug}.x.md` に保存。投稿はしない）

> チャットで PR URL を報告するだけは Checkpoint ではない。**通知 + Preview/PWA 確認導線 + 承認導線まで到達**して初めて Checkpoint 成立。

### Claude がやらないこと（NG）

- ❌ ローカルURL（127.0.0.1 等）を review item のメイン previewUrl にする / それで通知する
- ❌ PR merge
- ❌ production deploy（wrangler 本番 deploy を含む）
- ❌ strict verify による queue published 化
- ❌ X 投稿
- ❌ queue を `published` / `x_posted` に書き換え
- ❌ 承認ボタンを押す

### 停止メッセージ例

> 記事化と PR 作成まで完了しました。以下の URL で記事内容を確認してください。公開へ進める場合は「**記事OK、公開へ**」と指示してください。

### ユーザー了承トリガー

- 「記事OK」「公開へ」「承認」「merge して公開」「この内容で進めて」「本番反映して」

曖昧な返答（「あとで」「ちょっと待って」「うーん…」など）の場合は **勝手に公開しない**。判断に迷う場合は確認する。

## 6. Phase B: 公開フェーズの内訳

ユーザー明示了承後に Claude が自動実行:

1. **PR merge**
   - `mergeable: MERGEABLE` / `mergeStateStatus: CLEAN` / `isDraft: false` を確認
   - `gh pr merge <N> --merge --delete-branch=false`
   - main への直接 push 禁止
   - merge commit を記録

2. **main 最新化**
   - `git fetch origin main && git pull origin main`
   - merge commit が含まれていることを確認

3. **wrangler 本番 deploy（正規手順）**
   - `npm run deploy:production -- --slug=<代表slug>`
   - 本番反映はこの wrangler Direct Upload が唯一の経路（P1 で正規化。Git 連携 auto-deploy / Deploy Hook は clone 失敗が常態化していたため廃止）
   - 複数記事の場合も 1 回でよい（main 全体が反映されるため代表 slug を渡す）

4. **strict verify**（対象記事すべて）
   - `/api/verify-publication` で 8 項目チェック
   - `httpStatus` / `titleNotGeneric` / `slugInHtml` / `notHomepageFallback` / `hasArticleBody` / `hasThumbnailRef` / `noProhibitedCopy` / `indexListsArticle`
   - 全 pass で `failedChecks: []` であることを確認

5. **queue 更新**
   - strict verify 成功後だけ `published` に更新
   - 記録項目: `status: published` / `productionUrl` / `publishedAt` / `prUrl` / `mergeCommit` / `deployResult` / `verifyResult` / `source: user_directed` / `triggeredBy: user` / `triggerKind` / `triggerInput`

### 失敗時

- published 扱いにしない
- X 投稿しない
- 失敗 check と原因を報告して停止

## 7. Phase C: X 投稿フェーズの内訳

詳細: [`docs/x_post_workflow.md`](x_post_workflow.md)

> **経路決定（Hiro・2026-07-27）**: 昼のPhase CはCodex対話モードを基本とし、`claude-in-chrome` は非常用フォールバック。7/23の「移行価値なし」判定は、対話モードで安定したHiro実測により上書きされた。貼り付け用指示は [`docs/x-post-codex-procedure.md`](x-post-codex-procedure.md)。

要点:

- **前提条件すべて満たしたときだけ**: ユーザー了承 / PR merge / deploy 成功 / strict verify 8/8 / 本番URLが開ける / 投稿アカウント @suma_labo / Chrome 使用
- **投稿前**: `@suma_labo` をDOM確認 / 画像枚数 / サムネ / 本文 / 禁則・誤字なし — 全部チェック
- **投稿後**: メイン・リプライ各 `count===1`、親返信数 `N→N+1` を確認。各確定直後に `x-posted.json` を2段階記録し、`route: "codex"` を残す
- 投稿文: 短め / 本投稿はURLなし / リプライに記事リンク1件 / ハッシュタグ2個 / 「普通の人」表現禁止 / 煽らない

## 8. Queue 状態設計

詳細: [`docs/queue_states.md`](queue_states.md)

主要状態:

| status | 意味 |
|---|---|
| `user_directed_queued` | ユーザー指定で queue に投入された（処理待ち） |
| `article_generated` | MDX 化済み（preview commit 前） |
| `review_waiting` | PR 作成完了。ユーザー記事確認待ち（Checkpoint） |
| `user_approved_for_publish` | ユーザー了承済み。Phase B 開始可 |
| `merged` | PR merge 済み |
| `deployed` | wrangler 本番 deploy 成功 |
| `published` | strict verify 8/8 pass |
| `x_posted` | X 投稿成功 |
| `failed` | どこかで失敗（`errorReason` を記録） |
| `paused_auto_collected` | 自動収集由来で今後処理しない（保留） |

## 9. 停止条件

### Phase A 停止（正常）

- PR URL が出た
- ローカル確認URL が出た
- 記事確認待ちになった
- queue が `review_waiting` 相当になった

### Phase B / C 停止（正常）

- 本番URLが出た
- strict verify 全記事 pass
- queue が `published` または `x_posted` になった
- X 投稿URLが記録された
- 完了報告が完了した

### 異常停止（即時報告）

- build 失敗
- strict verify 失敗
- 画像参照漏れ
- 禁則表現検出
- secret / token 露出リスク
- Cloudflare / wrangler / API rate limit
- X カード未表示 / サムネ未表示
- 対象不明 / 重複記事あり
- Chrome 接続失敗
- 投稿アカウント不一致

## 10. 停止中の自動化機構

### 10-A. Windows タスクスケジューラー（無効化済み）

2026-05-23 に以下を `Disabled` に変更（**削除はしていません**）：

| タスク名 | 旧スケジュール | 旧実行コマンド |
|---|---|---|
| `Sumalabo Sumahon Queue Runner` | 毎日 02 / 03 / 04 / 05 / 14 / 15 時 | `powershell.exe -File scripts\automation\run-sumahon-queue.ps1` |
| `Sumalabo Claude Pipeline Runner Test` | 2026-05-16 15:05 | `powershell.exe -File scripts\automation\run-claude-preview-pipeline-once.ps1` |

確認:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like '*sumahon*' -or $_.TaskName -like '*sumalabo*' } | Select-Object TaskName, State
```

再有効化（**ユーザー判断必須**）：

```powershell
Enable-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner'
Enable-ScheduledTask -TaskName 'Sumalabo Claude Pipeline Runner Test'
```

### 10-B. 自動収集系スクリプト（非推奨／削除せず保持）

| スクリプト | 役割 | 状態 |
|---|---|---|
| `scripts/run/sumahon-watch.mjs` | RSS / HTML 巡回・新着 URL 検知 | **非推奨**（ユーザー指示時のみ手動起動） |
| `scripts/automation/run-sumahon-queue.ps1` | 定期キューランナー | **非推奨**（タスクスケジューラー側で Disabled） |
| `scripts/automation/register-sumahon-tasks.ps1` | タスクスケジューラー登録 | **非推奨**（呼び出し禁止） |
| `scripts/automation/run-claude-preview-pipeline-once.ps1` | preview pipeline 起動 | **非推奨**（呼び出し禁止） |
| `scripts/run/regenerate-from-queue.mjs` | 自動再生成 | **手動 slug 指定でのみ利用可** |

## 11. 安全ルール

| ルール | 詳細 |
|---|---|
| production deploy | ユーザー明示了承後にだけ実行 |
| X 投稿 | ユーザー明示了承 + Phase B 成功後にだけ実行 |
| 承認ボタン | Claude は押さない（`/api/approve-preview` は人間が叩く） |
| Cloudflare Deploy Hook / Git 連携 auto-deploy | 廃止済み（P1）。本番反映は wrangler 正規手順だけ使う |
| secret / token 類 | 表示しない（チャットにもログにもコミットメッセージにも書かない） |
| main ブランチ | 直接 push 禁止。必ず PR 経由 |
| PR merge | ユーザー明示承認後にだけ `gh pr merge` を実行 |
| 自動巡回 | `sumahon-watch.mjs` 等は **ユーザーが手動でコマンドを叩いた場合だけ** 起動 |
| 画像元ファイル | 削除しない（`_published_articles/` 配下に保管） |
| Edge | 使わない（Chrome のみ） |
| `SUMALABO_ENABLE_SLIDE_PIPELINE` | 勝手に ON にしない |
| PR-C / PR-D | 明示指示があったときだけ |

## 12. 復旧手順（旧・完全自動運用に戻したい場合）

> やる前に必ず本ドキュメントに変更履歴を書く。

1. スケジュールタスクを Enable
   ```powershell
   Enable-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner'
   ```
2. queue の `paused_auto_collected` を `user_directed_queued` などに戻す
3. `npm run sumahon:watch` を手動で 1 回試して動作確認
4. `CLAUDE.md` と本ドキュメントの「現在のモード」を更新

## 13. 関連ドキュメント

- `CLAUDE.md` — 全体ポリシー
- `docs/phase_a_input_flow.md` — Phase A 入力フロー（入口の安全停止条件）
- `docs/article_refinement_loop.md` — Article Refinement Loop（画像生成前の必須ループ）
- `docs/x_post_workflow.md` — X 投稿の安全条件と手順
- `docs/queue_states.md` — queue 状態の遷移
- `docs/pwa_review_notification.md` — PWA 通知の仕組み
- `docs/preview_approval_button.md` — 承認ボタンの動作
- `docs/visual_preview_review.md` — Preview スクショ 2 パスレビュー
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付
- `inbox/README.md` — inbox / `_published_articles/` のフォルダ運用

## 14. 改訂履歴

| 日付 | 変更内容 |
|---|---|
| 2026-05-23 | 初版作成。完全自動運用を中止し user-directed mode に移行。スケジュールタスク 2 件を Disabled に変更。npm script alias 3 件追加。 |
| 2026-05-27 | Human Review Checkpoint を追加。3 フェーズ構成（Phase A 記事化 / Phase B 公開 / Phase C X 投稿）に整理。queue 状態設計と X 投稿安全条件を分離ドキュメント化。 |
