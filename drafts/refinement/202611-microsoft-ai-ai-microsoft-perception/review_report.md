# セルフレビュー報告｜Microsoft Perceptionの一般提供

**判定　要修正**  
**対象**　`draft_article.md`  
**確認日**　2026年11月21日（日本時間）

記事の主軸は、職場の警告をAIがどう仕分け、どこで人が判断するかに置けている。確定稿では、人による承認の説明を要約と会話でそろえ、一般提供と試験提供の範囲を明確にする。冒頭と提供経緯の説明も短くする。

## Pass 1

事実・数値・出典を、`research_report.md`、`editorial_selection.md`、マイクロソフトの公式資料と照合した。行番号は `draft_article.md` に対応する。

- **日付・数値の整合　不合格。** 6・23行目の米国時間11月17日の一般提供発表と、23行目の日本語発表の11月18日付は一致。8月3日について、本文が直接引く7月27日付の発表は開始予告なので、23行目は「7月、マイクロソフトは『Project Perception』を8月3日から試験提供すると発表しました」とする。ITmediaの11月20日は報道日。原稿に性能値の誤用はなく、約80％はマイクロソフトが分析した約800万件の警告のうち、仕分けの対象に入った割合。本文では省く判断を維持する。 [7月の公式発表](https://blogs.microsoft.com/blog/2026/07/27/rethinking-security-for-the-age-of-ai/)・[11月の公式発表](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)・[日本語発表](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)・[警告の集計注記](https://techcommunity.microsoft.com/blog/perception-blog/whats-new-with-microsoft-perception-at-ignite-2026/4571834)
- **煽り・断定　不合格。** タイトルに煽りはない。25行目の「AIの利用でサイバー攻撃が速くなっている」は範囲が広い。「マイクロソフトは、攻撃の一部にAIが使われ、短時間で進むようになったことを開発の背景に挙げています」とする。用語の説明は、侵入を伴わずサービスを妨害する場合も含めて「システムに侵入したり、情報を盗んだり、サービスの利用を妨げたりする行為」とする。 [マイクロソフトの開発背景](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)
- **事実と未確認事項の線引き　不合格。** 8行目の「承認を組み込みます」と32行目の「組み込めるよ」では、承認が必要な場面の説明が揺れる。公式発表に沿って「組織がAIに任せる範囲を決め、影響の大きい操作は担当者が確認して許可する」にそろえる。25行目の試験提供の例は「組織が許可したWebアプリの安全性を調べる機能」と対象を明示する。36〜38行目の利用量に応じた課金と、日本の各組織での導入条件が未確認という区別は適切。 [公式製品ページ・FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)・[Ignite公式発表資料](https://news.microsoft.com/events/ignite/2026/book-of-news/)
- **禁則語　合格。** タイトルを含む原稿を規定の17パターンで照合し、該当は0件。制作工程を説明するメタ表現も見当たらない。
- **旧情報の残存　合格。** 旧称「Project Perception」は試験提供の経緯に限って使用している。9月更新の導入手順は旧称を使っており、現行の提供段階や国内の契約条件の根拠には使われていない。 [9月更新の導入手順](https://learn.microsoft.com/en-us/security/agentic-security/agentic-security-get-started)・[11月の公式発表](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)

## Pass 2

| 項目 | 判定 | 確認結果 |
|---|---|---|
| (1) 主題の説明が冒頭にある | 合格 | タイトルと5行目で、職場の警告を仕分け、調査を手伝うサービスだと分かる。 |
| (2) 30秒欄の4項目だけで理解できる | 合格 | 5〜8行目で、サービスの正体、一般提供の発表、関係する人、AIと人の役割が分かる。6行目に「一部の機能は試験提供中です」と添えると、提供範囲もその場で分かる。 |
| (3) 関係がある人・薄い人が分かる | 合格 | 7・18〜19行目で職場の管理担当者と個人利用者を区別し、38行目で担当者が確認すべき契約・日本語対応・データの扱いを示している。 |
| (4) 読者翻訳設計の専門語が初出で説明される | 合格 | 設計で挙げた10語すべてに、初出の文か直後で説明がある。「サイバー攻撃」の定義はPass 1の修正を反映する。 |
| (5) キャラが読者の疑問を代弁する | 合格 | 31〜32行目で、ひまりが「仕事に影響する操作も進むのか」と尋ね、らぼまるが「どの操作を誰が判断するか」という導入時の確認につなげている。承認の表現はPass 1に沿ってそろえる。 |
| (6) 噛み砕きが長文化していない | 不合格 | 5行目は「警告」と「AI」の括弧説明が重なる。14・23・25行目は出典を除いて約159〜166字で、役割、用語、提供経緯、開発背景が一段落に詰まっている。 |
| (7) 公開文への内部情報の混入がない | 合格 | タイトル、本文、リンク表示・参照先を確認。スカウト元、コピー指示、自動公開、veto、内部用メモ、生成promptの混入は0件。 |

**短縮する箇所**

- **5行目**は「Microsoft Perceptionは、職場で不審な動きが見つかったときに届く警告を、AIで仕分けて調査を手伝うサービスです」とする。直後に「AIは記録を読み取り、警告の分類を手助けします」と置く。
- **14行目**は「警告を仕分ける、記録を調べる、対処の順番を提案する。こうした作業を、役割を分けた複数のAIが担います。割り当てられた作業を進めるAIを、AIエージェントと呼びます」と整理する。弱点を探す役割は、25行目の提供機能の説明に移す。
- **23・25行目**は、提供経緯、正式提供と試験提供の範囲、開発背景を短い段落に分ける。36行目は利用の入口と課金を分け、38行目は確認事項を「契約で使える機能と料金」「日本語で使える範囲」「データの処理・保存場所」の3点に整理する。

図解候補は、サービスの全体像、不審なログインの例、AIの役割分担、人の承認、正式提供と試験提供、日本の職場での確認事項。発表日や料金の条件は、出典をたどれる本文で補う。

## Pass 3

- **出典の配置。** 23行目は、8月3日の試験提供予告に7月の公式発表、11月17日の一般提供に英語の公式発表、11月18日付の掲載に日本語発表を添える。32行目の会話の直後には、承認の根拠となる公式FAQを置く。 [7月の公式発表](https://blogs.microsoft.com/blog/2026/07/27/rethinking-security-for-the-age-of-ai/)・[11月の公式発表](https://www.microsoft.com/en-us/security/blog/2026/11/17/security-for-the-agentic-era-powered-by-microsoft-perception/)・[日本語発表](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)・[公式FAQ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system#faq)
- **提供条件の再確認。** 正式提供の例として、警告の仕分け、攻撃の調査、対応の優先順位付けを使える。Webアプリの検査は試験提供。日本の各組織での利用開始日、対象契約、円建て単価、日本語対応の範囲、データの処理・保存場所は、確認した公式資料では特定できなかった。確定稿でも確認時点を添える。 [Ignite公式発表資料](https://news.microsoft.com/events/ignite/2026/book-of-news/)・[日本語発表](https://news.microsoft.com/source/asia/features/microsoft-ignite-2026-empowering-human-ambition-intelligence-and-trust/?lang=ja)・[公式製品ページ](https://www.microsoft.com/en-us/security/business/microsoft-perception-agentic-system)

**画像工程へ進める判定は保留。** 確定稿で、8月3日の記述、人による承認の説明、機能ごとの提供範囲、長い段落の修正を確認する。
