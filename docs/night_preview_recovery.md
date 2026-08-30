# 夜間Preview失敗の保全と再開

## Previewの完了判定

`phase-a-finalize.mjs` は、wranglerが返したURLをすぐHTTP確認するのではなく、先にCloudflare Pages APIで次を照合する。

- deployment ID
- preview branch
- commit SHA
- `latest_stage.status=success`

その後、記事URLを15秒間隔・合計最大10分で検証する。旧設定は6秒間隔・最大4回（初回を含め合計約18秒待ち）だった。

Preview buildでは対象記事の `publishAt` が未来でも、その時刻を越えた検証用ビルド時計を使う。本番buildの公開時刻フィルターは変更しない。`dist/articles/{slug}/index.html` が無ければCloudflareへ送る前に停止する。

## 失敗時の保全

Previewの配布またはURL検証が失敗した場合、次へpending情報を保存する。

`%USERPROFILE%\.sumalabo\state\pending-publish.json`

記録内容はslug、origin branch、commit SHA、PR URL、deployment IDと状態、記事・画像・refinement成果物の固定パス、失敗理由である。originのpreview branchは削除しない。

夜間runの終了時は、未追跡ファイルの外部退避後に必ずrunnerを最新の `origin/main` detachedへ戻す。runnerがcleanであること、HEADとorigin/mainが一致すること、detachedであることをすべて確認する。

## pending記事の再開

修正版がmainとrunnerへ同期された状態で、runnerから次を実行する。

```powershell
node scripts/automation/phase-a-outer-publish.mjs --resume-pending --slug 202608-20-his-esim-mvno
```

このコマンドはoriginのpreview branchを取得し、最新mainをmergeしてpushしたうえで、Preview build、Cloudflare deployment照合、記事URL検証、review登録を再開する。merge conflict、secret scan、deployment、URL検証のいずれかが失敗した場合は公開を進めずpendingのまま残す。

再開処理後も夜間run共通の終了処理によりrunnerは `origin/main` detachedへ戻る。単独で再開コマンドを実行した場合は、終了後に次も実行する。

```powershell
node scripts/automation/runner-hygiene-recovery.mjs recover --run-id manual-resume-YYYYMMDD-HHMMSS
node scripts/automation/night-environment-check.mjs --article-only
```
