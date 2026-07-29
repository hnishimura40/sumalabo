# 立ち会い記事の画像30秒確認

2026-07-29 Hiro承認。立ち会い記事は一次独立検品と手の二段検品を通過した後、本番公開前にHiroが全9枚（サムネ1枚＋スライド8枚）を30秒確認する。本文確認の再導入ではなく、画像の明白な身体破綻・文字化け・不快な形を短時間で拾う専用チェックである。

## 手順

1. 検品済みWebPを確定後、確認証跡を準備する。

    npm run sumalabo:review-images -- --slug=<slug> --prepare

   出力された9パスをCodex内で一覧表示し、Hiroへ「全9枚を30秒確認してください」と依頼する。この時点では公開しない。

2. Hiroが明示的にOKした後だけ承認を記録する。

    npm run sumalabo:review-images -- --slug=<slug> --approve --reviewer=Hiro --confirm-viewed-all=9

3. 本番反映は立ち会いモードを明示する。

    npm run deploy:production -- --slug=<slug> --trigger=manual --run-mode=attended

証跡は D:\downloads\sumalabo-codex\attended-reviews\<slug>.json に保存する。9枚のSHA-256を含み、承認後に1枚でも再生成・差し替えされた場合は承認を失効し、再度prepare→30秒確認→approveが必要になる。

## モード分離

- 立ち会い記事: run-mode=attended。承認証跡がなければ公開ブロック。
- 夜間run: run-mode=night。公開前の人間待ちは設けず、従来どおり公開後にHiroが事後確認する。
- 自動Phase B: run-mode=automation。既存の無人運用を維持する。
- 既存記事の修理・差し替え: run-mode=maintenance。今回の30秒確認対象ではないが、通常の画像検品と公開後検証は省略しない。

## 生成側の既定

手は原則描かない。卓上スタンド、机上配置、ポケット、長い袖、後ろ手、前景オブジェクト、フレームアウトを優先する。ただし、テーマ衣装、小道具の配置、姿勢と視線、テーマ固有の背景は弱めない。手が情報伝達に不可欠な場合だけ小さく描き、現行の二段検品をバックストップとして適用する。