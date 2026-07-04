# Autonomy Ladder — 自動化レベルの段階定義と現在の状態

すまラボの記事公開パイプラインを「人間の事前承認」から「機械の事後検査 + 自動是正」へ
段階的に移行するためのラダー。**人間の承認を外す代わりに、是正速度（検知 → rollback）を
人間以上にする** のが基本思想。

## 現在の状態

| 項目 | 値 |
|---|---|
| **Autonomy Level** | **0 (L0)** |
| paused (kill switch) | false |
| veto 窓 | 30 分 |
| 状態ファイル | `data/automation/autonomy.json` |

> レベルの昇格はユーザーの明示宣言でのみ行う。Claude が勝手に level を上げることは禁止。
> L0→L1 の昇格条件: **L0 で 3 本連続クリーン公開**（post-publish verify で hard/soft fail なし）
> の実績後、ユーザーが宣言する。

## レベル定義

| Level | Phase A（記事化） | Phase B（本番公開） | Phase C（X 投稿） |
|---|---|---|---|
| **L0**（現行） | 自動（finalize まで） | **人間の明示承認後** に実行 | 人間の明示承認後に実行 |
| **L1** | 自動 | **veto 窓（30 分）経過で自動実行**。事後検査 + hard fail 時自動 rollback | 人間の明示承認後に実行 |
| L2（将来） | 自動 | 自動 | 自動（別途設計） |

- どのレベルでも `paused: true`（kill switch）で全自動実行が止まる。
- どのレベルでも手動実行（ユーザー明示指示）は従来どおり可能。

## L1 の仕組み（実装済み・レベル 0 のまま待機）

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
  │    ├─ build → dist 検査 → wrangler deploy → strict verify 8 項目
  │    ├─ 成功時: dist を builds/last-good/ へ退避（rollback 第 2 候補の材料）
  │    └─ post-publish verify（事後検査）
  │         ├─ hard fail → 即 rollback + incident 記録 + 通知
  │         └─ soft fail → 通知のみ。15 分後に 1 回だけ再検査
  └─ Phase B 完了通知
```

### post-publish verify の判定

| 分類 | 項目 | 対応 |
|---|---|---|
| hard fail | 記事 URL 非 200 / 旧ビルド配信（slug 不在）/ homepage 誤配信 / トップ・一覧の破損 | **即 rollback** + 通知 + incident 記録 |
| soft fail | OGP 画像の応答不良 / 一覧掲載の反映待ち | 通知のみ。15 分後に 1 回だけ再検査 |

結果は `logs/publish/{slug}.verify.json` に記録（`autonomyLevel` / `trigger` 含む）。

### rollback（`npm run rollback:production`）

1. **第 1 候補: Cloudflare Pages API の deployment rollback**（前回正常 deployment の再有効化。
   ビルド不要で最速）。対象は `builds/last-good/last-good.json` の deploymentId を優先し、
   無ければ本番 deployment 一覧の canonical 以外の最新 success。
2. **第 2 候補: `builds/last-good/dist` を wrangler で再デプロイ**（deploy:production 成功時に退避済み）。
3. rollback 後に strict verify を自動実行し「戻った」ことまで機械確認する。
4. **rollback 自体が失敗したら `paused: true` に自動設定して通知**（壊れた状態で自動運転を続けない）。

### incident と自動降格

- 事故（post-publish hard fail / rollback 失敗）は `autonomy.json` の `incidents` に
  日時・slug・種別で記録する。
- **直近 10 記事で事故 2 件以上 → level を自動で 1 下げて通知**（自動降格）。

## kill switch の効き方

`data/automation/autonomy.json` の `paused: true` は次の入口すべてで検査され、即停止する:

- `phase-a-finalize.mjs`（Phase A 出口）
- `deploy-production-from-main.mjs`（Phase B。手動/自動を問わず）
- `post-to-x.mjs`（Phase C。`--check` の読み取りだけは許可）
- `auto-phase-b.mjs`（自動起動）

> 注意: GitHub Actions は **main ブランチの autonomy.json** を読む。ローカルで paused に
> しただけでは Actions は止まらないので、**paused の変更は main に push する**こと。
> （article PR とは独立の 1 行変更なので直コミットでよい）

## 監査ログ

- `logs/preview/{slug}.finalize.json` — `autonomyLevel` / `trigger` / `previewReadyAt` / `vetoDeadline`
- `logs/publish/{slug}.verify.json` — 事後検査の判定・rollback 実行記録
- `logs/publish/{slug}.deploy.json` — 自動 Phase B の deploy result
- 週次ダイジェストは L1 運用開始後に別途設計する

## 関連ファイル

- `data/automation/autonomy.json` — 状態（level / paused / vetoWindowMinutes / incidents）
- `scripts/automation/autonomy.mjs` — ゲート / incident / 自動降格ライブラリ
- `scripts/automation/rollback-production.mjs` — rollback コマンド
- `scripts/automation/post-publish-verify.mjs` — 事後検査
- `scripts/automation/auto-phase-b.mjs` — 自動 Phase B オーケストレータ
- `.github/workflows/auto-phase-b.yml` — 実行主体（GitHub Actions）
- `functions/api/veto-preview.ts` — veto ボタンの API
