# Microsoft Perceptionとは？ 職場に届く不審な知らせを仕分けるサービス

## 30秒で分かる

- **これは何？** Microsoft Perceptionは、職場のシステムを守るための調査を手伝うサービスです。不審な動きが見つかったときに担当者に届く警告を、AI（記録を読み取り、分類や判断を手助けする技術）で仕分けます。 [マイクロソフトの製品ページ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)
- **何があった？** マイクロソフトは2026年11月17日（米国時間）、一般提供（対象の契約や環境で正式に使える段階）を発表しました。一部の機能は試験提供（条件を満たす利用者が正式提供前に試せる段階）です。 [マイクロソフトの発表](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)
- **誰に関係ある？** 主に、職場のパソコンや業務システムを管理する担当者です。個人のパソコンやスマホの設定を、今回の発表を受けて変える必要はありません。
- **結局どうなの？** AIが警告を整理し、担当者がどれから調べるかを決めやすくします。組織がAIに任せる範囲を決め、影響の大きい操作には承認（権限のある担当者が内容を確認して実行を許可すること）が必要です。 [公式FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)

## 警告が届いたら、AIは何をする？

Microsoft Perceptionでは、複数のAIエージェント（任された作業を、決められた手順に沿って進めるAI）が役割を分担します。警告を仕分ける、関連する記録を調べる、対処する順番を提案する、といった作業をそれぞれ受け持ちます。 [マイクロソフトの機能解説](https://techcommunity.microsoft.com/blog/perception-blog/whats-new-with-microsoft-perception-at-ignite-2026/4571834)

たとえば、普段と違う場所から業務システムが使われたと知らせが届いたとします。出張中の社員が使った可能性もあれば、本人以外が使った可能性もあります。AIが関連する記録を集め、担当者はその記録を見て、急いで調べるべきかを判断します。

## あなたに関係ある？

- **関係がある人**　会社や学校などで、職場のパソコンや業務システムを管理し、不審な動きを調べる人。普段の作業のうち、記録集めや警告の仕分けをどこまで任せられるかが、導入の判断材料になります。
- **あまり関係がない人**　職場のシステム管理を担当していない人。自宅のパソコンやスマホの使い方や契約を、今回の発表に合わせて見直す必要はありません。

## 今回、何が変わった？

2026年7月、マイクロソフトは「Project Perception」を8月3日から試験提供すると発表しました。 [7月の公式発表](https://blogs.microsoft.com/blog/2026/07/27/rethinking-security-for-the-age-of-ai/)

同社は米国時間11月17日に、イベント「Microsoft Ignite 2026」で「Microsoft Perception」として一般提供を発表しました。日本語の公式発表は11月18日付で、ITmediaは11月20日に報じました。 [11月の公式発表](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)、[基調講演の公式記録](https://news.microsoft.com/events/wp-content/uploads/2026/11/Nadella_TRANSCRIPT_Ignite-Keynote_Nov-2026.pdf)、[日本語の公式発表](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)、[ITmedia NEWSの報道](https://www.itmedia.co.jp/news/article/2611/20/2000003368/)

警告の仕分け、攻撃の調査、職場のシステムの弱点を探す作業、対処の優先順位付けは一般提供の対象です。組織が検査を許可した、ブラウザで使う業務サービスの安全性を調べる機能は、試験提供の段階にあります。 [Microsoft Ignite 2026の公式発表資料](https://news.microsoft.com/events/ignite/2026/book-of-news/)

マイクロソフトは、サイバー攻撃（システムに侵入したり、情報を盗んだり、サービスの利用を妨げたりする行為）の一部にAIが使われ、短時間で進むようになったことを開発の背景に挙げています。導入によって攻撃をどの程度防げるかや、対応時間がどのくらい変わるかは、今回の発表からは分かりません。 [マイクロソフトの開発背景](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)

## AIに任せる作業と、人が判断する場面

警告がいくつも届くと、AIは仕分けの理由を示します。担当者はその理由と関連する記録を確認し、どの警告から詳しく調べるかを決められます。 [マイクロソフトの警告仕分けの解説](https://techcommunity.microsoft.com/blog/perception-blog/whats-new-with-microsoft-perception-at-ignite-2026/4571834)

> **ひまり**「仕事に影響する操作も、AIがそのまま進めるの？」
>
> **らぼまる**「AIに任せる範囲は職場で決めるよ。影響の大きい操作は、担当者が内容を確認して許可してから進む。使う前に、どの操作で誰の承認が要るかを決めておくんだ。」 [人による承認についての公式FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)

## 日本の職場で使う前に確認すること

利用の入口は、Microsoft Defender（職場のパソコンなどを監視し、不審な動きを担当者に知らせるマイクロソフトの製品）です。その管理画面（担当者がシステムの状態や設定を確認する画面）から利用します。 [公式製品ページ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)

料金は利用量に応じてかかります。公式案内では、費用の見積もりや利用状況の確認ができます。 [料金の公式FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)

2026年11月21日時点で確認した公開資料では、日本の各組織が使い始められる日や、次の利用条件は特定できませんでした。導入を検討する際の確認項目です。 [日本語の公式発表](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)、[公式製品ページ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)

- **契約で使える機能と料金**　自組織の契約が対象か、必要な機能や他社サービスとの連携が使えるか、円建ての単価はいくらか。
- **日本語で使える範囲**　操作画面やAIが示す調査結果を、どこまで日本語で確認できるか。
- **データの処理・保存場所**　調査に使う記録がどこで処理され、どこに保存されるか。

## もう少し詳しく知りたい人へ

- 機能ごとの提供段階を確認する。 [Microsoft Ignite 2026の公式発表資料](https://news.microsoft.com/events/ignite/2026/book-of-news/)
- 利用量に応じた料金の仕組みや、費用の見積もり方を確認する。 [Microsoft Perceptionの公式FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)
