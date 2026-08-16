# Delphiの無料版が13へ。4OS向け開発を始める前に知りたい制限

Delphi Community Editionの無料版が、12.1からDelphi 13 Florence世代へ更新されました。学生や趣味の開発者にとっては、新しい64-bit IDEやAndroid 15、iOS 18対応を無料で使えるようになった朗報です。

ただし、「無料」「4OS対応」だけを見て導入すると、環境やライセンスでつまずく可能性があります。IDEを動かすPCはWindowsが前提で、macOS／iOS向けのビルドにはMac側の環境も必要です。商用利用には年間売上などの条件があり、AIコーディング支援のKaiはCommunity Editionでは利用できません。

## 30秒でわかる結論

- Delphi 13 CEは公式ページで提供開始を確認できる
- 12.1から64-bit IDE、64-bit language server、Android 15／iOS 18対応などが更新された
- Windows、macOS、Android、iOS向けアプリを単一コードベースから開発できる
- 無料でも利用資格があり、企業PCや年間売上の条件を確認する必要がある
- Windows on Armなど細かな対応範囲は、CEのFeature Managerで実物確認したい

## 無料版が12.1からDelphi 13へ

Embarcaderoの公式ダウンロードページは「Delphi 13 CE」を案内し、Community Editionが12.1からFlorence世代へ進んだと説明しています。

主な更新は、新しいDelphi言語機能、Android 15とiOS 18への対応、ネイティブ64-bit IDE、64-bit language server、エディターの分割表示、Focus Mode、コードナビゲーション改善です。特に64-bit化は、大きなプロジェクトでIDEやコード解析が従来のメモリ制約を受けにくくなる変化です。

ただし、公式が「フル機能のIDE」と表現していても、有料版とすべて同じではありません。利用できる追加機能や接続先、ライセンスには差があります。

## 4OS向けに作れる。でもIDEはWindowsで動かす

Delphi CEは、Windows、macOS、Android、iOS向けアプリを単一のDelphiコードベースから開発できると案内されています。ここでいう4OS対応は、作るアプリのターゲットを指します。

Delphi／RAD StudioのIDEそのものは、64-bit版Windows 10またはWindows 11が前提です。macOSやiOS向けのアプリをビルド、テスト、署名するには、Mac、Xcode、Apple Developer Programなど対象側の環境も必要になります。

つまり、Mac単体にDelphi IDEを入れて4OS開発が完結するわけではありません。Windows PCを開発の中心に置き、必要に応じてMacや実機を接続する構成です。

## 無料でも商用利用には線引きがある

Community Editionは、学生、趣味の個人開発者、条件内の小規模開発者が始めやすい無料版です。一方で、無条件に誰でも業務利用できるライセンスではありません。

公式日本語ページでは、個人が有料アプリやコンポーネントを販売する場合、年間売上が5,000 USドル未満であることを条件として示しています。スタートアップ企業では、企業全体の年間売上が5,000 USドル未満で、開発者が5名以下であることなどが条件です。

企業に所属していて個人的に使う場合も、企業支給PC、企業メール、企業ネットワークを使うと企業利用とみなされる可能性があります。購入前評価や社内研修の代わりとしてCEを使うことも、公式ページでは対象外の例に含まれます。

## IDE内AIのKaiは対象外

Delphi 13世代にはIDE内で動くAIアシスタントKaiがありますが、Community Editionには含まれず、対応もしないと公式ページに明記されています。

コード生成やビルド、エラー修正を支援するKaiまで試したい場合は、RAD Studio、Delphi、C++BuilderのTrialまたはKaiに対応する有料版を確認する必要があります。「Delphi 13 CEになったからKaiも無料で使える」という理解は誤りです。

## Windows on Armなどは実物確認が安全

スカウト元の見出しにはWindows x86／Armを含む幅広いターゲットが挙げられていました。一方、Delphi CE 13の公式ページが明記するのは、Windows、macOS、Android、iOS、Android 15、iOS 18、64-bit IDEなどです。

Windows on ArmはRAD Studio 13.1で追加された機能として公式資料にありますが、CE 13公式ページの説明だけでは、Community Editionに含まれると確認できません。Android 16やiOS 26など13.1相当の対応も同様です。特定ターゲットが目的なら、インストール後のFeature Managerとライセンス画面で利用可否を確認してから開発計画を立てましょう。

## 公式Q&Aには古い12.1表記が残る

2026年8月17日時点で、Delphi CEのダウンロードページとサイトメニューは「Delphi 13 CE」を明記しています。一方、Community Edition Q&Aには「現在の最新バージョンは12.1 Athens」と残る箇所があります。

提供開始自体は公式ダウンロードページで確認できますが、細かな説明ページは更新が揃っていない可能性があります。ダウンロード時に表示されるバージョン、Feature Manager、ライセンス本文を最終確認に使うのが確実です。

## 試しやすい人、先に有料版も見る人

Delphiを学び直したい個人、学生、趣味でデスクトップ／モバイルアプリを作りたい人、利用条件内の小規模開発者には有力な入口です。12.1 CEを使っていた人にとっても、64-bit IDEや新しい編集機能へ進める価値があります。

反対に、企業業務、上限を超える売上、Kai、エンタープライズ向け機能、Windows on Armなど特定のターゲットが必須なら、CEだけで決めずTrialや有料版との差を先に確認しましょう。

始める順番は、利用資格を読む、Windows環境を確認する、必要な対象OSの環境を用意する、Feature Managerでターゲットを確認する、の4段階です。無料という言葉より、自分の用途がライセンスと機能範囲に合うかを先に見ると迷いません。

## 参考情報

- https://www.embarcadero.com/jp/products/delphi/starter
- https://www.embarcadero.com/jp/products/delphi/starter/faq
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Installation_Notes
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Supported_Target_Platforms
