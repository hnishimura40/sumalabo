# Delphiの無料版が13へ。4OS向け開発を始める前に知りたい制限

Delphi Community Editionの無料版が、12.1からDelphi 13 Florence世代へ更新されました。学生や趣味の開発者にとっては、新しい64-bit IDEやAndroid 15、iOS 18対応を無料で試せる朗報です。

ただし、「無料」「4OS対応」だけを見て入れるとつまずきやすい点があります。IDEを動かすPCはWindowsが前提で、macOS／iOS向けビルドにはMac側の環境も必要です。また、商用利用には年間売上などの条件があり、AIコーディング支援のKaiはCommunity Editionでは使えません。

## 30秒でわかる結論

- Delphi 13 CEは公式ページで提供開始を確認できる
- 12.1から64-bit IDE、64-bit language server、Android 15／iOS 18対応などが更新された
- Windows、macOS、Android、iOS向けアプリを単一コードベースから開発できる
- 無料でも利用資格があり、企業PCや年間売上の条件を確認する必要がある
- Windows on Armなど13.1固有機能は、CEで使えるかインストール後に確認したい

## 何が新しくなった？

公式のDelphi CEページは、12.1からFlorence世代へ進んだと説明しています。新しいDelphi言語機能に加え、Android 15とiOS 18への対応更新、ネイティブ64-bit IDE、64-bit language server、分割エディター、Focus Mode、コードナビゲーションの改善が主なポイントです。

大規模なコードを扱う人には、64-bit化でIDEや解析系が従来よりメモリ制約を受けにくくなる点が実用上の変化です。ただし、Community Editionに有料版の全機能が入るわけではありません。

## 「4OS対応」と「4OSでIDEが動く」は別

Delphi CEは、Windows、macOS、Android、iOS向けアプリを単一コードベースから開発できると案内されています。ここでいう対応は、生成するアプリのターゲットです。

Delphi／RAD StudioのIDEそのものはWindows 10またはWindows 11の64-bit環境が前提です。macOSやiOS向けアプリをビルド、テスト、署名する場合はMac、Xcode、Apple Developer Programなども必要になります。MacだけにDelphi IDEを入れて完結する話ではありません。

## 無料でも、使える人には条件がある

個人が趣味や学習、フリーウェア開発に使う場合は入りやすい一方、有料アプリやコンポーネントの年間売上が5,000 USドル以上になると有料版が必要です。スタートアップ企業では企業全体の年間売上が5,000 USドル未満、開発者5名以下などの条件があります。

企業所属者が個人利用する場合も、企業支給PC、企業メール、企業ネットワークを使うと企業利用とみなされる可能性があります。購入前評価や社内研修の代わりにCEを使うことも、公式ページでは対象外の例として挙げられています。

## KaiはCommunity Editionでは使えない

Delphi 13世代にはIDE内のAIアシスタントKaiがありますが、公式ページはCommunity EditionがKaiを含まず、対応もしないと明記しています。AI支援まで試したい場合は、RAD Studio、Delphi、C++BuilderのTrialまたは対象の有料版を確認する必要があります。

## 公式ページ内に古い「12.1」表記も残る

2026年8月17日時点では、Delphi CEのダウンロードページとメニューは「Delphi 13 CE」を明記しています。その一方で、Community Edition Q&Aには「現在の最新バージョンは12.1 Athens」と残る箇所があります。

提供開始自体はダウンロードページで確認できますが、実際のビルド番号やWindows on Armターゲットなど細かな範囲は、ダウンロード後のFeature Managerとライセンス情報で確認するのが確実です。13.1の有料版資料にある機能を、そのままCEにもあると考えないほうが安全です。

## こんな人なら試しやすい

Delphiを学び直したい個人、学生、趣味でデスクトップ／モバイルアプリを作りたい人、利用条件内の小規模開発者には有力な選択肢です。反対に、企業業務、上限を超える売上、Kai、エンタープライズ接続、Windows on Armなど特定機能が必須なら、CEだけで決めず有料版との差を先に確認しましょう。

## 参考情報

- https://www.embarcadero.com/jp/products/delphi/starter
- https://www.embarcadero.com/jp/products/delphi/starter/faq
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Installation_Notes
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Supported_Target_Platforms
