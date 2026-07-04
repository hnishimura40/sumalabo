# Autonomy Ladder — 自動化レベルの段階定義と現在の状態

すまラボの記事公開パイプラインを「人間の事前承認」から「機械の事後検査 + 自動是正」へ
段階的に移行するためのラダー。**人間の承認を外す代わりに、是正速度（検知 → rollback →
キャッシュパージ）を人間以上にする** のが基本思想。

> 注記（2026-07-04）: 指示で参照された「同梱の autonomy-ladder.md（ユーザー保有の完全版）」
> はリポジトリ・ローカルディスクのいずれにも見つからなかったため、本書の L0〜L4 定義・
> 昇格条件・error budget・週次ダイジェスト・実装順序は **指示文の骨子から作成** した。
> ユーザー保有の完全版と差異があれば、完全版を正としてこのファイルを上書き修正すること。

## 現在の状態

| 項目 | 値 |
|---|---|
| **Autonomy Level** | **0 (L0)** |
| L1 実装状況 | **実装済み**（veto 窓 / 自動 Phase B / 事後検査 / 自動 rollback + キャッシュパージ）。レベル 0 のまま待機 |
| paused (kill switch) | false |
| veto 窓 | 30 分 |
| 昇格カウント (toL1) | 0 / 3（L0 クリーン公開の連続数） |
| 状態ファイル | `data/automation/autonomy.json` |

> レベルの昇格はユーザーの明示宣言でのみ行う。Claude が勝手に level を上げることは禁止。

## レベル定義（L0〜L4）

| Level | Phase A（記事化） | Phase B（本番公開） | Phase C（X 投稿） | ネタ選定 |
|---|---|---|---|---|
| **L0**（現行） | 自動（finalize まで） | **人間の明示承認後** | 人間の明示承認後 | 人間 |
| **L1** | 自動 | **veto 窓（30 分）経過で自動**。事後検査 + hard fail 時自動 rollback | 人間の明示承認後 | 人間 |
| **L2** | 自動 | 自動（L1 同等） | **veto 窓経過で自動**（OGP/アカウント確認は機械化） | 人間 |
| **L3** | 自動 | 自動 | 自動 | 人間（指定後は A→B→C を無停止で連結。veto 窓のみ） |
| **L4** | 自動 | 自動 | 自動 | **自動**（テーマ選定含む完全自動。人間は監査と kill switch のみ） |

- どのレベルでも `paused: true`（kill switch）で全自動実行が止まる。
- どのレベルでも手動実行（ユーザー明示指示）は従来どおり可能。
- L2 以降は本書時点で未実装（L1 の運用実績を見てから設計する）。

## 昇格条件と降格（error budget）

- **昇格**: 現レベルで **3 本連続クリーン公開**（post-publish verify で hard/soft fail なし、
  veto 発動なし、incident なし）の実績後、**ユーザーが宣言** して 1 段昇格する。
  昇格カウントは `promotionCount` に記録する。
- **error budget**: 直近 10 記事あたり incident **1 件まで**。
- **自動降格**: 直近 10 記事で incident **2 件以上** → level を自動で 1 下げて通知する
  （`maybeAutoDemote`）。降格自体も incidents に `auto_demotion` として記録する。
- **即時停止**: rollback 自体の失敗は budget と無関係に `paused: true`（壊れた状態で
  自動運転を続けない）。
- incident の定義: post-publish verify の hard fail / rollback 失敗 / 公開後に人間が
  発見した事実誤り（手動で `incidents` に追記）。

## 週次ダイジェスト（L1 運用開始後に実装）

L1 で公開が「静かに」進むようになるため、週 1 回の総括通知で人間の監査点を維持する:

- 公開本数 / veto 発動数 / 自動 Phase B 実行数
- incident 数と error budget 残
- rollback 実行数と平均復旧時間
- 昇格カウントの進捗

実装は本書の対象外（L1 の運用が始まってから別途）。

## 実装順序

1. ✅ L1 基盤（autonomy.json / ゲート / rollback / post-publish verify / veto 窓 / GitHub Actions）— PR #92
2. ✅ rollback へのキャッシュパージ組み込み（本節の下「キャッシュパージ」参照）
3. ⬜ L0 で 3 本連続クリーン → ユーザー宣言で L1 昇格（Actions secrets 登録が前提）
4. ⬜ 週次ダイジェスト
5. ⬜ L2（Phase C 自動化）の設計・実装 — L1 の実績を見てから

---

## 実装ノート（L1 実装の実態・PR #92 + 仕上げ）

### L1 の仕組み

```
[Phase A finalize 完了]
  ├─ review item に previewReadyAt / vetoDeadline を記録
  ├─ 通知に「⏱ veto期限 (JST)」を明記
  ↓
[veto 窓 30 分]
  veto 手段①: Preview ページの「⛔ 自動公開を停止（veto）」ボタン（/api/veto-preview）
  veto 手段②: data/automation/autonomy.json の paused を true にする（全体停止）
  ↓ 期限経過・未veto
[GitHub Actions auto-phase-b.yml（5 分間隔）]
  ├─ autonomy ゲート（level>=1 かつ paused=false のときだけ進む）
  ├─ PR merge（MERGEABLE 確認）→ git pull main
  ├─ npm run deploy:production -- --slug=<slug> --trigger=auto_after_veto
  │    ├─ build → dist 検査 → wrangler deploy → キャッシュ個別パージ → strict verify 8 項目
  │    ├─ 成功時: dist を builds/last-good/ へ退避（rollback 第 2 候補の材料）
  │    └─ post-publish verify（事後検査）
  │         ├─ hard fail → 即 rollback（--expect-gone）+ キャッシュパージ + incident 記録 + 通知
  │         └─ soft fail → 通知のみ。15 分後に 1 回だけ再検査
  └─ Phase B 完了通知
```

### post-publish verify の判定

| 分類 | 項目 | 対応 |
|---|---|---|
| hard fail | 記事 URL 非 200 / 旧ビルド配信（slug 不在）/ homepage 誤配信 / トップ・一覧の破損 | **即 rollback + キャッシュパージ** + 通知 + incident 記録 |
| soft fail | OGP 画像の応答不良 / 一覧掲載の反映待ち | 通知のみ。15 分後に 1 回だけ再検査 |

結果は `logs/publish/{slug}.verify.json` に記録（`autonomyLevel` / `trigger` / `purge` 含む）。

### rollback（`npm run rollback:production`）

1. **第 1 候補: Cloudflare Pages API の deployment rollback**（前回正常 deployment の
   再有効化。ビルド不要。訓練実測: 往路 3.8 秒 / 復路 15.1 秒 = strict verify 込み）。
   対象は `builds/last-good/last-good.json` の deploymentId を優先し、無ければ本番
   deployment 一覧の canonical 以外の最新 success。
2. **第 2 候補: `builds/last-good/dist` を wrangler で再デプロイ**。
3. **rollback 成功後（どちらの経路でも）CDN キャッシュを自動パージ**（下記）。
4. rollback 後に strict verify（restore 時）または liveness + 記事消滅の実フェッチ確認
   （`--expect-gone`、誤記事の引っ込め時）で「戻った」ことまで機械確認する。
5. **rollback 自体が失敗したら `paused: true` に自動設定して通知**。

### キャッシュパージ（2026-07-04 仕上げで追加）

rollback 訓練で、deployment を戻しても **CDN エッジキャッシュが旧ページを TTL まで
配信し続ける** ことを実測した。誤記事の引っ込めを完成させるため:

- `scripts/automation/cache-purge.mjs` — **対象 URL の個別パージ**（記事 URL / トップ /
  /articles/ 一覧 / sitemap / サムネ）を第 1 候補、失敗時は **purge_everything に自動
  フォールバック**（rollback は低頻度の非常時操作なので全体パージのコスト許容）
- rollback 成功後と deploy:production の wrangler 成功直後に自動実行
- パージ後、`--expect-gone` 時は記事 URL を実フェッチして「旧内容が返らないこと」を
  機械確認し、まだ配信されていれば `stale_cache_still_serving` で通知 + exit 1
- **必要権限**: Zone → **Cache Purge → Purge**（zone: sumalabo.com のみの最小スコープ）。
  現行の `CLOUDFLARE_API_TOKEN` には Zone 権限が無い（zones 一覧が空であることを実測）。
  `CLOUDFLARE_ZONE_PURGE_TOKEN`（+ `CLOUDFLARE_ZONE_ID`。無ければ Zone Read も必要）を
  設定する。**未設定の間は purge は skip 記録 + 警告となり、rollback 自体は成立する**

### kill switch の効き方

`data/automation/autonomy.json` の `paused: true` は次の入口すべてで検査され、即停止する:

- `phase-a-finalize.mjs`（Phase A 出口）
- `deploy-production-from-main.mjs`（Phase B。手動/自動を問わず）
- `post-to-x.mjs`（Phase C。`--check` の読み取りだけは許可）
- `auto-phase-b.mjs`（自動起動）

> 注意: GitHub Actions は **main ブランチの autonomy.json** を読む。ローカルで paused に
> しただけでは Actions は止まらないので、**paused の変更は main に push する**こと。
> （article PR とは独立の 1 行変更なので直コミットでよい）

### 監査ログ

- `logs/preview/{slug}.finalize.json` — `autonomyLevel` / `trigger` / `previewReadyAt` / `vetoDeadline`
- `logs/publish/{slug}.verify.json` — 事後検査の判定・rollback / purge 実行記録
- `logs/publish/{slug}.deploy.json` — 自動 Phase B の deploy result

### 関連ファイル

- `data/automation/autonomy.json` — 状態（level / paused / vetoWindowMinutes / promotionCount / incidents）
- `scripts/automation/autonomy.mjs` — ゲート / incident / 自動降格ライブラリ
- `scripts/automation/rollback-production.mjs` — rollback コマンド（パージ組み込み済み）
- `scripts/automation/cache-purge.mjs` — キャッシュパージ（`npm run purge:cache`）
- `scripts/automation/post-publish-verify.mjs` — 事後検査
- `scripts/automation/auto-phase-b.mjs` — 自動 Phase B オーケストレータ
- `.github/workflows/auto-phase-b.yml` — 実行主体（GitHub Actions）
- `functions/api/veto-preview.ts` — veto ボタンの API
