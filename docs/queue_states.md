# Queue 状態設計（user-directed mode + 3-phase flow）

最終更新: 2026-05-27

## 対象ファイル

`data/automation/sumahon-queue.json`（gitignored / 運用ステート）

## 設計方針

- **実態と違う状態にしない**（merge していないのに `merged` にしない、verify 失敗で `published` にしない）
- 失敗は別 status `failed` で残す（`errorReason` に原因）
- 自動収集由来で今後処理しないものは `paused_auto_collected` で塩漬け
- 状態遷移を逆走しない（`published` → `review_waiting` のような戻りはしない）
- 書き換え前に必ずバックアップ（`sumahon-queue.json.bak-<timestamp>.json`）

## 状態一覧

| status | 意味 | 進む条件 |
|---|---|---|
| `user_directed_queued` | ユーザー指定で queue に投入された（処理待ち） | ユーザーが URL / フォルダ / テーマ / queue slug を指定 |
| `article_generated` | MDX 化済み・preview commit 前 | `drafts/generated/{slug}.md` 等の生成完了 |
| `review_waiting` | PR 作成完了。ユーザー記事確認待ち（Checkpoint） | `gh pr create` 成功 |
| `user_approved_for_publish` | ユーザー了承済み。Phase B 開始可 | ユーザーが「記事OK」「公開へ」等を明示 |
| `merged` | PR merge 済み | `gh pr merge` 成功 |
| `deployed` | wrangler fallback deploy 成功 | `deploy-production-from-main.mjs` の `wrangler.status: ok` |
| `published` | strict verify 8/8 pass | `/api/verify-publication` で `failedChecks: []` |
| `x_posted` | X 投稿成功 | Chrome で投稿 → 投稿URL 取得 |
| `failed` | どこかで失敗 | 任意のフェーズで失敗 → `errorReason` を記録 |
| `blocked_image_generation_unavailable` | 必須のスライド/サムネ生成経路が使えず Phase A 未完了で停止 | Chrome MCP 未ロード / Chrome 拡張未接続 / 拡張が Edge にペアリング等で画像生成が通らない |
| `paused_auto_collected` | 自動収集由来で今後処理しない（保留） | 自動収集モード時代の queued / needs_regeneration を塩漬け |

## 状態遷移図

```
[user_directed_queued]
        ↓
[article_generated]
        ↓
[review_waiting]  ← Checkpoint（必ず停止）
        ↓  （ユーザー明示了承）
[user_approved_for_publish]
        ↓
[merged]
        ↓
[deployed]
        ↓  （strict verify 8/8）
[published]
        ↓
[x_posted]
        ↓
   （完了）

任意フェーズ → [failed]  （errorReason 記録）
自動収集旧データ → [paused_auto_collected]

Phase A 開始後、画像生成経路（Chrome MCP / ChatGPT）が使えず必須スライド/サムネ未生成
   → [blocked_image_generation_unavailable]
   （ユーザーが「画像なしで進めて」と明示するまで先に進まない）
```

## エントリスキーマ（推奨）

```json
{
  "url": "<URL or null>",
  "slug": "202605-xxxxx",
  "title": "...",
  "publishedAt": "<元記事の publishedAt or null>",
  "addedAt": "<ISO 8601>",
  "status": "review_waiting",
  "statusUpdatedAt": "<ISO 8601>",
  "source": "user_directed",
  "triggeredBy": "user",
  "triggerKind": "url | folder | theme | queue_slug",
  "triggerInput": "<URL / absolute folder path / theme name / slug>",
  "previewBranch": "preview/<slug>",
  "prUrl": "https://github.com/.../pull/<N>",
  "prCreatedAt": "<ISO 8601>",
  "mergeCommit": "<sha or null>",
  "mergedAt": "<ISO 8601 or null>",
  "deployResult": { "status": "ok | failed", "command": "wrangler ..." },
  "verifyResult": { "ok": true, "attempts": 1, "productionUrl": "..." },
  "productionUrl": "https://sumalabo.com/articles/<slug>/",
  "publishedAt": "<ISO 8601>",
  "xPostUrl": "https://x.com/suma_labo/status/...",
  "xPostedAt": "<ISO 8601>",
  "xPostText": "...",
  "errorReason": "<null or message>"
}
```

> `null` のフィールドは省略してよい。**実態と違う値を入れない**。

## 旧 status との対応

過去の自動収集モード時代の status との対応表。今後の新規エントリは右側を使う。

| 旧 status | 新 status（推奨） |
|---|---|
| `queued`（rss / html 自動収集由来） | `paused_auto_collected` |
| `needs_regeneration`（旧自動再生成待ち） | `paused_auto_collected`（必要なら手動で `user_directed_queued` に戻す） |
| `failed`（旧） | `failed` のまま（履歴として保持） |
| `preview_created` | `review_waiting` |
| `awaiting_import` | `article_generated` または `review_waiting`（実態に合わせる） |
| `published` | `published` のまま |

> **既存エントリの書き換えは Claude が勝手にしない。** ユーザーが明示指示したときだけ、バックアップ作成のうえ書き換える。

## queue 操作のルール

1. **書き換え前に必ずバックアップ**
   ```bash
   cp data/automation/sumahon-queue.json data/automation/sumahon-queue.json.bak-$(date -u +%Y-%m-%dT%H-%M-%S).json
   ```
2. **エントリ追加** — `addedAt` / `statusUpdatedAt` / `source: "user_directed"` を必ず入れる
3. **状態遷移は前進のみ** — `published` → `review_waiting` のような後退はしない
4. **失敗は別 status** — `published` にしない。`failed` + `errorReason`
5. **複数記事バッチ処理時** — 各記事ごとに独立してエントリを持つ（共通 PR でも分けて記録）

## 既存 queue（2026-05-27 時点）

- 全エントリ数: 約 106 件
- 自動収集由来: 104 件
- 手動指定（`source: "user_directed"`）: 0 件
- 提案: `queued`（32 件）と `needs_regeneration`（20 件）の計 52 件を `paused_auto_collected` に変更
- **未適用**。ユーザー明示指示があったら、バックアップ作成のうえ書き換える。

## 関連

- `CLAUDE.md` — 全体ポリシー
- `docs/user_directed_mode.md` — Phase A / B / C と Checkpoint
- `docs/x_post_workflow.md` — Phase C の安全条件
- `data/automation/sumahon-queue.json` — 運用ステート本体
