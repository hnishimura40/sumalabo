# validation-result（visual-review 後の再検証）

実行日時: 2026-05-11 18:50 (JST)
対象 MDX: content/articles/202605-iphone-18-pro-dynamic-island-top-left-rumor.mdx
適用した修正: なし（visual-review で blocking / recommended 0 件）

## sourceCheck（validateSourceReferences）

| 項目 | 値 |
|---|---|
| ok | true |
| hasReferenceSection | true |
| urlCount | 6 |
| containsSumahonPublicReference | false |
| isReportingTopic | true |
| hasReportingNotice | true |
| reasons | [] |

## generatedCheck（validateGeneratedArticle）

| 項目 | 値 |
|---|---|
| issues | [] |
| majorCount | 0 |
| warningCount | 0 |
| overallOk | true |

## articleQualityCheck 注記

本 Preview ブランチ（`preview/iphone-18-dynamic-island-rumor`、HEAD `0dba530`）の `scripts/sumahon/validate-generated-article.mjs` には、main 側の最新 PR #21 (`feature/article-quality-check`) で追加された `validateArticleQuality()` がまだ取り込まれていない。
そのため当ブランチでは `articleQualityCheck` の機械チェックは行わず、代わりに `validateGeneratedArticle()` の包括チェック（メタ文言、見出し数、必須要素、ソース流用検出など）で代替している。
main マージ後は同ブランチでも `validateArticleQuality` が走るようになる前提。

## npm run build

実施済み。30 ページ生成 OK（本検証中に preview ブランチ checkout 直後に 1 度、visual-review 完了後にも問題ないことを確認）。

## 結論

- 機械検査: 全パス
- visual-review: blocking 0 / recommended 0 / deferred 3
- → MDX への手入れ不要。ログ 4 つ（screenshots 含む）を preview ブランチへ追加 commit / push して人間最終確認待ち。
