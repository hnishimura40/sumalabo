# review-2: 編集者目線 + ファクトチェック

slug: 202605-iphone-18-pro-dynamic-island-top-left-rumor
Preview URL: https://6cf7f865.sumalabo.pages.dev/articles/202605-iphone-18-pro-dynamic-island-top-left-rumor/
レビュー実施者: Claude（docs/visual_preview_review.md パス2 観点リスト準拠 / iPhone・Apple系の追加観点も適用）

## 共通チェック

| 観点 | 結果 | 備考 |
|---|---|---|
| 公開本文・参考情報・リンクに「すまほん」「smhn.info」が出ていない | ✅ OK | MDX 全文と Preview 表示の双方で grep 上ヒットなし |
| ## 参考情報 セクションがある | ✅ OK | line 245 に存在 |
| 参考URLが 2 件以上 | ✅ OK | 6 件（Apple公式 3、MacRumors 2、AppleInsider 1） |
| 公式情報・元報道・関連報道のいずれも含む | ✅ OK | Apple公式（Dynamic Island ガイド / Face ID ガイド / iPhone 14 Pro Newsroom）+ 元報道系（MacRumors × 2、AppleInsider × 1） |
| 報道・噂ベース注意文がある | ✅ OK | 冒頭の `check-box` で「Appleの公式発表ではありません」「報道・噂ベース」と明示。さらに末尾 line 254 に「Apple公式発表ではないため、発売時期・仕様・日本展開などは今後変わる可能性があります」 |
| 発売日 / 価格 / 日本展開 / 対応機種 / 料金を断定していない | ✅ OK | 「まだ正式には分かっていません」「日本での展開などはまだ確定していません」「正式発表が出たあとに見直してください」 |
| タイトル・見出しが煽りすぎていない | ✅ OK | タイトルは「あんまり変わらない？」と疑問符で控えめ。見出しも「消える』より『残る』可能性を見ておきたい」など hedge 付き |
| サムネに実在ロゴや元記事画像コピー | ✅ OK（要目視確認） | mobile-01 で見たサムネはひまり・らぼまるキャラ + 「iPhone 18 Pro / Dynamic Island どう変わる？」テキスト。Apple ロゴや実機写真コピーは見当たらない |
| サムネ文字がスマホで読めるか | ✅ OK | mobile-01 のサムネ縮小表示でも「Dynamic Island どう変わる？」が判読可能 |
| キャラ表現が情報整理に役立っているか | ✅ OK | 一度だけ登場、「いきなり完全な全画面というより、少しずつ近づいている途中」という整理を補強する役割。漫才化していない |

## iPhone / Apple 系の追加チェック

| 観点 | 結果 | 備考 |
|---|---|---|
| Apple公式発表と報道・噂を混同していない | ✅ OK | 「これは Appleの公式発表ではありません」と check-box で先に提示。本文中も「噂」「報道」「見方」など hedge を多用 |
| iPhone 18 Pro の仕様を確定情報として書いていない | ✅ OK | 「決まったわけではない」「まだ確定ではない」「正式発表後に」を繰り返し使用 |
| Dynamic Island / Face ID / 前面カメラの説明が混同していない | ✅ OK | line 70〜82 に専用 H2 を立てて「Face IDは顔認証」「前面カメラは自撮り・ビデオ通話」と役割を分離。「Face ID関連部品の一部だけ画面下に移る可能性」と限定句で書いている |
| 参考情報が Apple公式・元報道・信頼できる関連報道に寄っている | ✅ OK | Apple公式サポート 2 件 + Apple Newsroom 1 件、MacRumors 2 件、AppleInsider 1 件。すまほん等の内部発見元は表に出していない |
| Apple / iPhone / Siri などの実在ロゴをサムネに使っていない | ✅ OK | mobile-01 サムネで確認、ロゴは出ていない |

### 細目（Apple 系で慎重に見たい点）

- **「Dynamic Island は iPhone 14 Pro シリーズから登場」** (line 195): 事実。iPhone 14 Pro / Pro Max（2022年9月発表）が初。Apple Newsroom リンク（参考情報line 249）と整合。
- **「Face ID 関連部品の一部だけが画面下に移る可能性」** (line 80): 公式発表ではないが、噂・関連報道で言及があるとされる範囲で、「可能性」「ではないかという見方」など hedge を保っており断定していない。OK。
- **「左上カメラ説」の扱い** (line 104〜121): 「決まったわけではない」「最終的な見た目は Appleの正式発表まで分からない」と明示。良好。
- **MacRumors / AppleInsider のURL** (line 250〜252): URL の年月（2026-05-06 / 2026-03-11 / 26-01-20）と現在日付（2026-05-11）の前後関係は妥当。ただし URL の到達性自体はこの Preview 環境では確認できていない。**人間の最終確認時にクリックで到達確認することを推奨**。

## AI / ガジェット系の追加チェック

本記事は iPhone デザインの噂が主題で AI・購入誘導要素は薄いが、近接観点を確認:

| 観点 | 結果 | 備考 |
|---|---|---|
| AI 機能を実際より万能に見せていない | N/A | AI 機能の言及はほぼなし（買い替え判断項目で「AI機能の対応状況」を 1 行触れる程度） |
| プライバシーや安全面を軽視していない | ✅ OK | Face ID を顔認証手段として淡々と説明、プライバシー的にネガティブな扱いはなし |
| 生活者に関係ある話に落とし込めている | ✅ OK | 「画面が少しすっきり見える可能性」「使い勝手が激変する話ではなさそう」「今のiPhoneユーザーはどうすればいい？」など、生活者視点 |
| 「今すぐ買うべき」などの過剰誘導 | ✅ OK | 逆に「Dynamic Island が変わるかどうかだけで買い替えを決めない」「正式発表まで様子見でもよい」と慎重 |

## 1パス目で見落とされていそうな点を追加で探す

- 内部リンク（line 241 `/articles/iphone-vs-android/` / line 243 `/categories/news/`）は実在ページ。`dist/articles/iphone-vs-android/index.html` と `dist/categories/news/index.html` が build 出力に含まれている（先ほどの npm build で確認済み）。
- frontmatter の `related` に `iphone-vs-android` / `smartphone-under-30000-guide` 2 件。両方とも dist 配下に存在する記事。
- `description`（line 6）は「iPhone 18 ProでDynamic Islandが変わるという噂を、普通の人向けに整理…」と内容を正しく要約しており、煽りなし。
- `thumbnailAlt`（line 8）は「iPhone 18 ProのDynamic Island変更噂を、すまラボが普通の人向けにやさしく整理したサムネイル」とアクセシビリティ的に妥当。
- `publishAt` (2026-05-11T07:22:48+09:00) は妥当な未来公開日時。
- `priority: 1` / `status: "review"` / `category: "ニュースをかみくだく"` の組み合わせは記事ポリシーに沿う。

## 修正必須

なし。

## 修正推奨

なし（参考URLの到達性は人間の最終確認時にチェック推奨、修正自体ではない）。

## 今回は見送り

- 参考情報の MacRumors / AppleInsider URL の到達性確認は人間の最終確認に委ねる。`status: "review"` の状態で人間承認待ちの位置にいるので、ここで blocking 化はしない。

## 2パス目の総合判定

**ファクトチェック上の重大な問題なし**。Apple 公式発表との混同、噂の断定、参考情報の偏り、すまほん露出のいずれも見当たらず、「公式発表ではない」注意文が冒頭・末尾の 2 ヶ所で明示されている。pass1 と合わせて、**修正必須項目ゼロ** で人間最終確認へ進めて良い。
