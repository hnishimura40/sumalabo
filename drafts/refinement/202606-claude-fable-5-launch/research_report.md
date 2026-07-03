# research_report.md — Claude Fable 5（Turn1 Research Pass）

出所: ChatGPT「すまラボ台本」チャット（c/6a29555d-615c-8321-a61d-60ac4dd62b52）から backend-api 経由で 2026-07-03 に再取得（P7復旧）。元ファイルは 2026-07 Temp クリーンアップで消失。

---

了解です。今回は **Research Pass** と **Editorial Selection** だけに絞ります。初稿には入りません。

# 1. Research Pass

## facts：公式情報として扱える確定事実

### 発表・モデル位置づけ

Claude Fable 5 と Claude Mythos 5 は、Anthropicが **2026年6月9日** に発表した新モデル。Fable 5 は「Mythos-classモデルを一般利用向けに安全化したもの」と位置づけられており、Anthropicが広く公開する中で最も高性能なモデルと説明されている。citeturn254762view0turn236596view1

Mythos-class は、Opusクラスの上に置かれる能力階層。Fable 5 はその能力を安全装置つきで一般提供するモデル、Mythos 5 は同じ土台で一部領域の安全装置を外した限定提供モデルという整理になる。citeturn254762view0

### Fable 5 と Mythos 5 の違い

Fable 5 と Mythos 5 の違いは、基本的に **安全装置の有無**。公式脚注では、Fable はラテン語の *fabula*、Mythos はギリシャ語の *mythos* に由来し、両者を分けている理由は safeguards、つまり安全装置だと説明されている。citeturn254762view0

Mythos 5 は一般提供されず、Project Glasswing 参加者など承認された顧客向けの限定提供。公式ドキュメント上でも、Fable 5 は一般提供、Mythos 5 は limited availability と明記されている。citeturn236596view1turn254762view0

### スペック・APIまわり

Fable 5 / Mythos 5 は、どちらも **1Mトークンのコンテキストウィンドウ**、**最大128kトークン出力**、**adaptive thinking 常時オン**。extended thinking は非対応。citeturn236596view1turn236596view2

Claude Fable 5 と Mythos 5 では adaptive thinking が唯一のthinking modeで、無効化や手動のextended thinking予算指定はできない。生の思考過程は返されず、必要に応じて要約表示のみが可能。citeturn236596view2

トークナイザは Claude Opus 4.7 で導入されたものを使い、旧モデルと比べて同じ文章でもおおむね30%多いトークンになるとリリースノートに記載されている。citeturn236596view2

### 価格

Fable 5 / Mythos 5 は、どちらも **100万トークンあたり入力10ドル、出力50ドル**。Opus 4.8 は入力5ドル、出力25ドルなので、API単価では Fable 5 は Opus 4.8 の2倍。citeturn254762view0turn236596view3

公式ドキュメントの価格表では、すべて米ドル表記。日本円価格は確認できないため、円換算を主情報にしない。citeturn236596view3

### 提供状況

Fable 5 は 2026年6月9日から Claude API、Claude Platform on AWS、Amazon Bedrock、Vertex AI、Microsoft Foundry で一般提供。Mythos 5 は Project Glasswing など承認された顧客向けの限定提供。citeturn236596view1turn254762view0

サブスクでは、6月9日から6月22日まで Pro / Max / Team / シート型Enterprise に追加費用なしで含まれる。6月23日以降はそれらのプランから外れ、利用には usage credits が必要になる。容量が許せば、将来的に標準サブスクへ戻す方針。citeturn254762view0

### 安全装置・フォールバック

Fable 5 は、リクエスト時と応答生成中に安全分類器を実行する。分類器が検知する主な対象は、サイバーセキュリティ、生物・化学、distillation。該当すると Fable 5 が直接答えるのではなく、Claude Opus 4.8 が代わりに応答する。citeturn254762view0turn236596view2

公式は、初期データとして **95%超のFableセッションではフォールバックが発生しない** と説明している。一方で、無害な依頼でも分類器に拾われる可能性があり、今後false positiveを減らす方針としている。citeturn254762view0

APIでは、拒否が発生した場合 `stop_reason: "refusal"` として返る。出力前に拒否されたリクエストは課金されない。citeturn236596view2

### データ保持

Fable 5 は Claude API で **30日間のデータ保持が必須**。zero data retention には対応しない。公式は、このデータを新しいClaudeモデルの学習や安全以外の目的には使わないと説明している。citeturn236596view2turn254762view0

### レッドチーム・安全評価

Anthropicは、外部バグバウンティを含む1,000時間超のテストで、ユニバーサル脱獄は見つからなかったと説明している。ただし、UK AISI は短い初期テスト期間の中で進展があったと注記されている。これは脱獄成立とは書かない。citeturn254762view0

公式は、30種類の公開脱獄手法を含む有害な単発サイバー関連リクエストに対し、Fable 5 は応答しなかったと説明している。citeturn254762view0

### ベンチマーク・定性評価

公式記事には、Fable 5 / Mythos 5 と他モデルを比較するベンチマーク表が掲載されている。ただしページ上では表が画像として扱われているため、数値は今回ユーザー提示の「公式表視覚確認済み」情報を採用する。citeturn254762view0

採用できる主要な数字は、SWE-Bench Pro 80.3、OSWorld-Verified 85.0 / 85.4、Humanity’s Last Exam no tools 59.0 / 56.8、with tools 64.5 / 64.7、ExploitBench 78.0 / 69.0、HealthBench Professional 66.0 / 64.7 など。ただし、公式注記に従い、サイバー・バイオ系は safeguards の影響で一般利用の Fable 5 では Opus 4.8寄りの挙動になる領域がある、と必ず添える。

定性面では、Stripeの事例として、数か月分のエンジニアリング作業を数日に圧縮し、5,000万行のRubyコードベース移行を1日で実施したと公式記事に掲載されている。citeturn254762view0

Fable 5 は、ソフトウェア開発、知識作業、ビジョン、長期タスク、メモリ活用、科学研究領域で強いと公式が説明している。特にビジョンでは、科学図からの数値抽出、スクリーンショットからWebアプリ再構築、Pokémon FireRedをビジョンのみでクリアした例が紹介されている。citeturn254762view0

## claims：公式だが、記事では言い方を調整する主張

### 「ほぼ全ベンチでSOTA」

公式は Fable 5 / Mythos 5 を、ほぼ全ベンチマークでSOTAと説明している。ただし、すまラボの記事ではそのまま大きく煽らず、「多くの公式ベンチで上位」「特に長い作業・コーディング・資料理解で強さが出ている」程度に言い換える。

### 「世界最高レベルのサイバー能力」

Mythos 5 について、公式はサイバーセキュリティ能力を非常に高く評価している。ただし、一般読者向け記事では能力の強さを過度に前面へ出さず、「危険な使い方につながり得る領域だから、Fable 5では安全装置つきで出している」という構造説明を主役にする。

### 企業・顧客の早期評価

Stripe、Hebbia、GitHubなどの早期評価は公式記事内に掲載されているが、顧客コメント・事例紹介として扱う。記事本文では「公式が紹介した早期利用事例」と明示し、第三者検証済みの一般評価のようには書かない。citeturn254762view0

### 科学研究での成果

分子生物学やゲノミクスの成果は公式が強く打ち出しているが、記事では「研究支援の可能性」として扱う。読者にとっては、日常利用よりも「モデルの能力がどこまで広がっているか」を示す材料にする。

## uncertain：未確定・断定しない情報

- 日本での提供可否
- 日本語対応の実使用感
- 国内サブスク画面での表示
- 日本円価格
- 6月23日以降の usage credits の必要量・金額
- サブスク標準復帰の時期
- 外部解説にある公式表外のベンチ数値
- Mythos 5 の一般提供予定
- UK AISIの「進展」を脱獄成功と読むこと
- Redditや個人検証を主根拠にすること

## 参考URLの確認状況

| 参考URL | 確認状況 | 記事での扱い |
|---|---:|---|
| Anthropic公式「Claude Fable 5 and Claude Mythos 5」 | 到達・内容一致 | 最重要ソース。発表日、モデル位置づけ、安全装置、提供条件、価格、定性評価の根拠にする。 |
| Claude API Docs「Introducing Claude Fable 5 and Claude Mythos 5」 | 直接ページとしては公式記事・関連Docsへの導線を確認 | API変更点はRelease NotesとModels overviewで補完する。 |
| Claude API Docs「Models overview」 | 到達・内容一致 | Fable 5 / Mythos 5 のモデルID、提供状況、1M context、128k output、価格、Opus 4.8との位置関係に使う。 |
| Claude API Release Notes 2026-06-09 | 到達・内容一致 | adaptive thinking、トークナイザ、refusal、zero data retention非対応などAPI仕様寄りの確認に使う。 |

## 確定事実との照合

### 一致

ユーザー提示の確定事実は、公式記事・Models overview・Release Notes・Pricingの内容と大きく一致。

特に一致確認できた点は以下。

- 2026年6月9日発表
- Fable 5 は広く公開される中で最も高性能なモデル
- Mythos 5 は Project Glasswing など限定提供
- Fable / Mythos の違いは安全装置
- 1M context / 128k output / adaptive thinking常時オン
- 生の思考過程は返さない
- Opus 4.7系トークナイザでトークン数増加
- Fable 5 / Mythos 5 は入力10ドル・出力50ドル
- Opus 4.8は入力5ドル・出力25ドル
- Fable 5は6月9日からAPI等で一般提供
- サブスクでは6月22日まで含まれ、6月23日以降はusage creditsが必要
- 安全分類器とOpus 4.8フォールバック
- 95%超のセッションではフォールバックなし
- APIのrefusal扱い
- 30日データ保持必須
- 外部バグバウンティ1,000時間超でユニバーサル脱獄未発見
- UK AISIの注記は「進展」であり、脱獄成立ではない

### 補足

- Pricingページでは、通常価格に加えてキャッシュ・Batch・長文コンテキスト関連の価格表もある。ただし記事主軸から外れるため、本文では通常の入力/出力単価だけで十分。
- Release Notesでは、`reasoning_extraction` というrefusalカテゴリにも触れている。記事では「能力抽出・蒸留対策」として噛み砕けばよい。
- Models overviewでは、迷った場合はOpus 4.8から始め、最高能力が必要ならFable 5を見る、という文脈がある。読者判断の補助として使える。

### 食い違い

大きな食い違いはなし。

注意点として、公式記事の一部では「Claude Fable 5 is available everywhere today」という表現があるが、日本の一般ユーザー向け記事では、国内画面・日本円価格・サブスク表示まで確認できたとは書かない方が安全。

---

