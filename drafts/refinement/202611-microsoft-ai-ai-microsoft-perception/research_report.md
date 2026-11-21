<!-- research_report | slug: 202611-microsoft-ai-ai-microsoft-perception | source: Codex Research Pass（すまラボ夜間本文・独立セッション） | at: 2026-11-21 JST -->

# Research Pass｜Microsoft Perceptionの一般提供開始

**調査日**　2026年11月21日（日本時間）  
**調査対象**　一般提供の範囲、AIエージェントの役割、人による承認、料金と日本での利用条件

Microsoftは米国時間2026年11月17日のIgnite 2026で、組織のセキュリティ運用を支援する「Microsoft Perception」の一般提供を発表した。複数のAIエージェントが、弱点の発見、警告の仕分け・調査、修正の優先順位付けを分担する。影響の大きい操作は担当者が承認する。製品全体は一般提供に移ったが、一部の機能は引き続きプレビュー段階にある。[Microsoft Security Blog、2026年11月17日](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)

## facts｜公式一次情報で確認できたこと

1. **2026年7月発表の「Project Perception」が一般提供に移った。** Microsoftは7月27日の初報で8月3日からの公開プレビューを案内し、11月17日のIgnite基調講演で「Microsoft Perception」の一般提供を発表した。日本語の公式発表は11月18日付。採用元のITmedia掲載日は11月20日で、発表日とは別の日付。[Microsoft公式ブログの初報、2026年7月27日](https://blogs.microsoft.com/blog/2026/07/27/rethinking-security-for-the-age-of-ai/)、[Ignite基調講演公式記録、2026年11月17日](https://news.microsoft.com/events/wp-content/uploads/2026/11/Nadella_TRANSCRIPT_Ignite-Keynote_Nov-2026.pdf)、[Microsoft Japan News Center、2026年11月18日](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)、[ITmedia NEWS、2026年11月20日](https://www.itmedia.co.jp/news/article/2611/20/2000003368/)
2. **AIは担当ごとに作業を分担する。** レッドは攻撃者の視点から組織の弱点を探し、ブルーは警告を仕分けて脅威を調査し、グリーンは対処の優先順位付けや修正を支援する。「プレイブック」は、その作業を複数のエージェントに割り振る実行手順。組織が定めた条件で自動実行でき、影響の大きい操作には人の承認を組み込む。製品にはMAI-Cyberシリーズなど複数のAIモデルが使われる。[Microsoft Security Blog、2026年11月17日](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)、[Microsoft Perception公式製品ページ、公開日表示なし](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)
3. **一般提供とプレビューが機能ごとに併存する。** 警告の仕分け、攻撃の調査、検知ルール作成、脅威情報の整理を担うブルーの4機能と、弱点を探すRecon Agent、対処の優先順位を付けるPosture Prioritization Agentは一般提供。Webアプリのセキュリティ検査はプレビュー、Risk Reduction Agentは公開プレビュー、業務用AIエージェント自体のリスクを調べて対処する新機能は非公開プレビュー。[Microsoft Security Blog、2026年11月17日](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)、[Ignite 2026 Book of News、2026年11月17日開幕時の発表資料](https://news.microsoft.com/events/ignite/2026/book-of-news/)
4. **他社クラウドへの対応範囲は作業によって異なる。** Microsoftはリスクの優先順位付け・低減の節で、Microsoft環境、AWS、Google Cloudを対象に挙げている。外部サービスの警告やログを取り込む連携については、AWS、Okta、Salesforceを挙げ、プレビューと案内している。例えば、警告の仕分けにはAWSとSalesforce、攻撃の調査にはAWSとOktaの情報を使うと説明している。[Microsoft Security Blog、2026年11月17日](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)、[Ignite 2026 Book of NewsのPerception節](https://news.microsoft.com/events/ignite/2026/book-of-news/)
5. **利用の入口と課金方式。** 組織のMicrosoft Defender管理画面から利用する。製品ページは従量課金を案内し、使った分だけ支払う方法とAI Flex Planを示している。費用の見積もりと利用状況を確認する機能があり、Microsoft Security Copilotとは別料金と明記されている。[Microsoft Perception公式製品ページ・FAQ、公開日表示なし](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)

## claims｜提供元の評価・報道の説明

- **「約80％」はMicrosoft社内分析での警告カバー率。** 11月17日公表の注記によると、ID、端末、メール・共同作業、クラウドアプリ、クラウドセキュリティにまたがるMicrosoft Defenderの約800万件の警告を分析し、その約80％がAlert Triage Agentの仕分け対象に入った。よく発生し、セキュリティ担当者の対応対象となる警告を対象とした集計。観測期間、参加組織・国の内訳、日本単独の値は当該資料で確認できなかった。検知精度、攻撃阻止率、個別企業の処理率には転用できない。[Microsoft Community Hub、2026年11月17日、記事末尾の注記](https://techcommunity.microsoft.com/blog/perception-blog/whats-new-with-microsoft-perception-at-ignite-2026/4571834)
- **「AIによるサイバー攻撃にAIで対抗」は発表の背景。** Microsoftは攻撃の自動化・高速化を製品開発の背景に挙げ、ITmediaもこの点を見出しにした。公表された機能の対象は、組織の警告、脅威、設定上の弱点などで、攻撃側のAI利用を判別する機能としては説明されていない。対応速度の向上は提供元が掲げる効果として扱う。[Microsoft Security Blog、2026年11月17日](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)、[ITmedia NEWS、2026年11月20日](https://www.itmedia.co.jp/news/article/2611/20/2000003368/)

## uncertain｜日本での条件・効果の未確認事項

- **国内の提供条件。** 日本語の公式発表で一般提供の告知を確認した。日本の組織が利用を開始できる日、対象の契約・クラウド環境、日本リージョンでの処理・保存条件、日本語対応の範囲、円建て単価は、確認した公開資料から特定できなかった。Microsoft Learnの導入手順には管理画面と必要な権限が載っているが、9月6日更新のページには限定プレビュー表記が残る。一般提供の判断には11月の発表を用い、正式提供後の契約条件には旧手順を転用しない。[Microsoft Japan News Center、2026年11月18日](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)、[Microsoft Learn導入手順、2026年9月6日更新](https://learn.microsoft.com/en-us/security/agentic-security/agentic-security-get-started)、[Microsoft Perception公式製品ページ・FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)
- **実際の攻撃でのAI利用と防御効果。** 個別の実被害で攻撃側がAIを使ったか、Perceptionの導入によって被害や対応時間がどの程度変わるかは、今回確認した資料からは確定できない。基調講演で紹介された事例は、研究者がDefenderで保護された環境を試験したもの。実被害でのPerceptionの阻止実績としては扱わない。[Ignite基調講演公式記録、2026年11月17日](https://news.microsoft.com/events/wp-content/uploads/2026/11/Nadella_TRANSCRIPT_Ignite-Keynote_Nov-2026.pdf)

## 採用情報との照合

- **一致**　製品名、Igniteでの一般提供発表、複数のAIエージェントが連携する仕組みは公式発表と一致する。採用情報の `aiModelLaunch` は選定上の分類で、今回確認したニュースの中心は組織向けセキュリティ製品の一般提供。[Ignite 2026 Book of NewsのPerception節](https://news.microsoft.com/events/ignite/2026/book-of-news/)
- **話題の広がりは未確認**　採用情報の観測は2026年11月21日04時30分ごろ（日本時間）、ITmedia AI+のRSS上で4番目、収録媒体は1件。ITmediaは11月19日掲載のPublickey記事を編集転載したと明示している。RSSの掲載順はアプリ順位や人気の根拠にはならない。今回の主題に該当するアプリ順位・モデル間ベンチマークはなく、約80％は上記の提供元分析として扱う。[ITmedia NEWSの転載注記、2026年11月20日](https://www.itmedia.co.jp/news/article/2611/20/2000003368/)
