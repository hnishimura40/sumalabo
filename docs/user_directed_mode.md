# すまラボ user-directed mode（手動トリガー方式）運用ガイド

最終更新: 2026-05-23

## このドキュメントの位置づけ

`CLAUDE.md` で示した **user-directed mode** の運用詳細をまとめたものです。完全自動運用を中止した経緯、現在有効化されている入口（manual triggers）、停止中の自動収集機構、再開したくなったときの手順を整理します。

## 1. なぜ user-directed mode に切り替えたか

これまでの「すまほん新着を自動巡回 → 自動キュー投入 → 自動記事生成」フローは:

- 公開判断のタイミングが運営者の意図とズレやすい
- ユーザーが触っていないテーマまで記事化されるリスクがある
- スケジュールタスクで無人起動するため、開始タイミングをユーザーがコントロールしづらい

これらを避けるため、**「処理対象の指定」だけはユーザーが行い、それ以降の自動化は Claude が完結させる** 構成に変更しました。

## 2. 現在の入口（manual triggers）

| トリガー | 標準コマンド | 内部委譲先 |
|---|---|---|
| **URL 指定** | `npm run sumalabo:from-url -- <url>` | `scripts/run/create-from-sumahon.mjs --url <url>` |
| **フォルダ指定（素材一式）** | `npm run sumalabo:from-folder -- "<absolute path>"` | Claude との会話起点処理（スクリプトは案内メッセージを表示） |
| **queue 内 slug 指定** | `npm run sumalabo:process -- --slug=<slug>` | `scripts/run/regenerate-from-queue.mjs --slug=<slug>` |
| **テーマ指定** | Claude との会話で指示 | Claude が会話起点で実行 |

### 推奨フロー（素材ありフォルダの場合）

1. ユーザーが `D:\documents\動画作成関連\すまラボ\inbox\<テーマ名>\` に **`ブログ記事.txt` + 画像** を置く
2. ユーザーが Claude に「`<テーマ名>` フォルダで記事化して」と指示
3. Claude が自律実行：素材 inspect → WebP 化 → MDX 作成 → build → PR 作成
4. ユーザーが PR の Preview を確認し、「PR #N をマージして本番反映して」など明示承認
5. Claude が wrangler fallback deploy → strict verify → フォルダを `_published_articles/` へ移動 → queue 状態更新

> **複数本まとめて処理してよい場合：** ユーザーが「inbox を一気に処理」など明示したときだけ。原則 URL 指定記事は 1 本ずつ。

## 3. 停止した自動化機構

### 3-A. Windows タスクスケジューラー（無効化済み）

2026-05-23 に以下を `Disabled` に変更しました（**削除はしていません**）：

| タスク名 | 旧スケジュール | 旧実行コマンド |
|---|---|---|
| `Sumalabo Sumahon Queue Runner` | 毎日 02 / 03 / 04 / 05 / 14 / 15 時 | `powershell.exe -File scripts\automation\run-sumahon-queue.ps1` |
| `Sumalabo Claude Pipeline Runner Test` | 2026-05-16 15:05 | `powershell.exe -File scripts\automation\run-claude-preview-pipeline-once.ps1` |

確認コマンド:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like '*sumahon*' -or $_.TaskName -like '*sumalabo*' } | Select-Object TaskName, State
```

再有効化したいとき（**ユーザー判断必須**）：

```powershell
Enable-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner'
Enable-ScheduledTask -TaskName 'Sumalabo Claude Pipeline Runner Test'
```

タスク自体を完全に削除したい場合（**戻せない**ので慎重に）：

```powershell
Unregister-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner' -Confirm:$false
Unregister-ScheduledTask -TaskName 'Sumalabo Claude Pipeline Runner Test' -Confirm:$false
```

### 3-B. 自動収集系スクリプト（非推奨／削除せず保持）

| スクリプト | 役割 | 状態 |
|---|---|---|
| `scripts/run/sumahon-watch.mjs` | RSS / HTML 巡回・新着 URL 検知 | **非推奨**（ユーザー指示時のみ手動起動） |
| `scripts/automation/run-sumahon-queue.ps1` | 定期キューランナー | **非推奨**（タスクスケジューラー側で Disabled） |
| `scripts/automation/register-sumahon-tasks.ps1` | タスクスケジューラー登録 | **非推奨**（呼び出し禁止） |
| `scripts/automation/run-claude-preview-pipeline-once.ps1` | preview pipeline 起動 | **非推奨**（呼び出し禁止） |
| `scripts/run/regenerate-from-queue.mjs` | 自動再生成 | **手動 slug 指定でのみ利用可** |

これらは削除していません。後日「やはり自動運用に戻したい」となった場合の復旧用に残してあります。

## 4. queue（`data/automation/sumahon-queue.json`）の扱い

### 4-A. 投入ルール

- **自動収集による queue 追加は停止**
- 新規エントリは **ユーザー指定 URL / 指定フォルダ / 指定テーマからのみ** 追加
- 推奨フィールド（新規追加時）:
  - `source: "user_directed"`
  - `triggeredBy: "user"`（例：`"user:h.nishimura40@gmail.com"`）
  - `triggerKind: "url" | "folder" | "theme" | "queue_slug"`
  - `triggerInput`: 指定された URL / フォルダパス / テーマ名

### 4-B. 既存の自動収集由来エントリ

2026-05-23 時点のキュー：

- 全 106 エントリ
- うち `source: "rss"` = 93 件、`source: "html"` = 11 件、`source` 未指定 = 2 件
- 手動投入（`source: "user_directed"` 等）= 0 件

**未処理（非終端）エントリの扱い案（適用前にユーザー確認）**：

| 旧 status | 件数 | 提案する新 status |
|---|---|---|
| `queued` | 32 | `paused_auto_collected` |
| `needs_regeneration` | 20 | `paused_auto_collected` |
| `failed` | 39 | そのまま（履歴として保持） |
| `preview_created` | 7 | そのまま（PR 進行中の可能性） |
| `awaiting_import` | 1 | そのまま（PR 進行中の可能性） |
| `published` | 7 | そのまま（公開済み） |

このうち `queued` / `needs_regeneration` の合計 52 件は **自動巡回由来で未処理** のため、誤発火しないよう `paused_auto_collected` に変更する案。**変更はユーザーの明示指示があるまで適用しません。**

適用したい場合は Claude に「queue を paused_auto_collected に書き換えて」と指示してください。書き換え前に必ず `data/automation/sumahon-queue.json.bak-<timestamp>.json` を作ります。

## 5. 安全ルール（user-directed mode）

| ルール | 詳細 |
|---|---|
| production deploy | ユーザーが「本番反映して」など明示承認したときだけ実行 |
| X 投稿 | **しない**。`drafts/social/{slug}.x.md` に投稿案を保存するだけ |
| 承認ボタン | Claude は押さない。`/api/approve-preview` は人間が叩く |
| Cloudflare Deploy Hook | Claude は叩かない（wrangler fallback だけ使う） |
| secret / token / Deploy Hook URL | 表示しない（チャットにもログにも書かない） |
| main ブランチ | 直接 push 禁止。必ず PR 経由 |
| PR merge | ユーザー明示承認後にだけ `gh pr merge` を実行 |
| 自動巡回 | `sumahon-watch.mjs` 等は **ユーザーが手動でコマンドを叩いた場合だけ** 起動 |

## 6. 復旧手順（旧・完全自動運用に戻したい場合）

> **やる前に必ず本ドキュメントに変更履歴を書く。**

1. スケジュールタスクを Enable
   ```powershell
   Enable-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner'
   ```
2. queue の `paused_auto_collected` を `queued` に戻す（必要な場合）
3. `npm run sumahon:watch` を手動で 1 回試して動作確認
4. `CLAUDE.md` と本ドキュメントの「現在のモード」を更新

## 7. 関連ドキュメント

- `CLAUDE.md` — 全体ポリシー
- `docs/pwa_review_notification.md` — PWA 通知の仕組み
- `docs/preview_approval_button.md` — 承認ボタンの動作
- `docs/visual_preview_review.md` — Preview スクショ 2 パスレビュー
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック
- `inbox/README.md` — inbox / `_published_articles/` のフォルダ運用

## 8. 改訂履歴

| 日付 | 変更内容 |
|---|---|
| 2026-05-23 | 初版作成。完全自動運用を中止し user-directed mode に移行。スケジュールタスク 2 件を Disabled に変更。npm script alias 3 件追加（`sumalabo:from-url` / `sumalabo:from-folder` / `sumalabo:process`）。 |
