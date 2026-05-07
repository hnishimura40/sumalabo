# すまラボ 予約投稿運用メモ

すまラボでは、記事 frontmatter の `publishAt` に公開予定日時を入れることで、指定時刻を過ぎるまで記事を公開対象から外せます。

## 基本ルール

```yaml
status: "ready"
updated: "2026-05-08"
publishAt: "2026-05-08T09:00:00+09:00"
```

- `publishAt` は任意項目です。
- `publishAt` が空、または未設定の記事は従来どおり公開対象になります。
- `publishAt` が現在時刻より未来の場合、記事は公開対象から外れます。
- 公開対象から外れた記事は、トップページ、記事一覧、カテゴリページ、記事詳細ページ、sitemap に出ません。
- 指定日時を過ぎたあと、Cloudflare Pages の定期デプロイまたは手動再デプロイが走ると公開されます。

## 日時の書き方

日本時間で予約する場合は、タイムゾーン付きのISO形式で書きます。

```yaml
publishAt: "2026-05-08T09:00:00+09:00"
```

`2026-05-08 09:00` のようにタイムゾーンが曖昧な書き方は避けます。

## status との関係

`publishAt` は、公開可能な `status` と組み合わせて使います。

- `ready`
- `review`
- `published`
- `needs-update`

`draft` や `idea` の記事は、`publishAt` を過ぎていても公開されません。

## 動作確認

通常ビルドでは、ビルド実行時点の時刻で判定します。

```powershell
npm.cmd run build
```

必要に応じて、検証用に `SUMALAB_NOW` を指定してビルド時刻を固定できます。

```powershell
$env:SUMALAB_NOW="2026-05-08T10:00:00+09:00"
npm.cmd run build
Remove-Item Env:SUMALAB_NOW
```

## 注意点

- 静的サイトなので、指定時刻になっただけでは自動的にページは増えません。
- 公開時刻後に再ビルド・再デプロイされることで公開されます。
- Cloudflare Pages側で定期デプロイの仕組みを用意すると、予約投稿に近い運用ができます。
- `publishAt` の形式が壊れている記事は、安全側に倒して公開対象から外れます。
