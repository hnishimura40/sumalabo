# research_report

## テーマ

Anthropic が発表した科学研究向けAIワークベンチ「Claude Science」

## 調査日時（2026年7月5日 JST時点）

2026年7月5日 JST時点で確認。

最優先確認結果：**Claude Science は実在する公式発表です。**  
Anthropic公式ブログに「Claude Science, an AI workbench for scientists, is now available」という発表ページがあり、公開日は**2026年6月30日**。Claude公式プロダクトページ、Claude公式ドキュメントにも専用ページがあります。citeturn240562view0turn643018view0turn596468view0

---

## 1. facts：公式一次情報で確認できること

### 1-1. Claude Science とは何か

Claude Science は、Anthropic が発表した**科学者向けのAIワークベンチ**です。研究で使うツールやパッケージを統合し、監査可能な成果物を作り、計算リソースにも柔軟にアクセスできるアプリとして説明されています。  
出所：Anthropic公式ブログ  
URL：https://www.anthropic.com/news/claude-science-ai-workbench citeturn240562view0

公式ドキュメントでは、Claude Science は「Claude と、ユーザーのコンピューター上の分析環境を組み合わせるデスクトップアプリ」と説明されています。ユーザーが自然文で研究タスクや分析を指示すると、Claude が Python、R、shell のコードを書いてサンドボックス内で実行し、許可されたフォルダを読み、科学データベースから情報を取得し、成果を provenance、つまり作成履歴付きのバージョン管理された成果物として保存します。  
出所：Claude公式ドキュメント  
URL：https://claude.com/docs/claude-science/overview citeturn596468view0

### 1-2. 対象ユーザー

対象は主に**科学者・研究者・研究室・ライフサイエンス領域のチーム**です。公式ページでは、genomics、single-cell、proteomics、structural biology、cheminformatics などの研究分野向けに事前構成されていると説明されています。  
出所：Anthropic公式ブログ / Claude公式プロダクトページ  
URL：https://www.anthropic.com/news/claude-science-ai-workbench  
URL：https://claude.com/product/claude-science citeturn240562view0turn643018view0

研究室向けには、学術機関・非営利研究機関の active scientific labs を対象にした割引版 Claude Team plan for research labs も用意されています。対象分野として、 biomedical、basic science、chemistry、math、computer science、physics などが挙げられています。  
出所：Claude公式プログラムページ  
URL：https://claude.com/programs/claude-team-plan-for-research-labs citeturn596468view1

### 1-3. 何ができるか

公式情報で確認できる主な機能は以下です。

| 機能 | 公式情報で確認できる内容 |
|---|---|
| 論文・文献分析 | 文献を分析し、複数段階の研究タスクを実行できる |
| データ解析 | Python、R、shell コードを書いて実行し、研究データを分析できる |
| 図表・原稿作成 | 図、表、manuscript を作成し、コード・環境・会話履歴と結びつけて保存できる |
| 科学成果物の表示 | 3Dタンパク質構造、ゲノムブラウザトラック、化学構造などをネイティブ表示できる |
| 研究履歴の追跡 | 生成物に、作成コード・環境・説明・会話履歴を含め、再現性を高める |
| レビューエージェント | 引用、計算、図とコードの不一致などを確認し、誤りを指摘・修正するバックグラウンド reviewer がある |
| 計算環境の管理 | ローカルPC、Linux box、HPC login node、SSH接続、Modal account などで計算を実行できる |
| 専門領域向け構成 | genomics、single-cell、proteomics、structural biology、cheminformatics など向けのスキル・コネクタを備える |

出所：Anthropic公式ブログ / Claude公式プロダクトページ / Claude公式ドキュメント  
URL：https://www.anthropic.com/news/claude-science-ai-workbench  
URL：https://claude.com/product/claude-science  
URL：https://claude.com/docs/claude-science/overview citeturn240562view0turn643018view0turn596468view0

### 1-4. いつ発表されたか

Anthropic公式ブログ上の発表日は**2026年6月30日**です。  
出所：Anthropic公式ブログ  
URL：https://www.anthropic.com/news/claude-science-ai-workbench citeturn240562view0

### 1-5. 対応プラットフォーム

公式発表では、Claude Science は**macOS と Linux**で利用できる beta アプリです。Claude公式プロダクトページには Mac Apple Silicon、Mac Intel、Linux のダウンロード導線があります。  
出所：Anthropic公式ブログ / Claude公式プロダクトページ  
URL：https://www.anthropic.com/news/claude-science-ai-workbench  
URL：https://claude.com/product/claude-science citeturn240562view0turn643018view0

公式ドキュメントでは要件として、**macOS 13以降、または Linux x64、約5GBの空き容量**が記載されています。Windowsについてはネイティブ版はまだなく、WSL 2 上で Linux バイナリを動かす方法が公式ドキュメントにあります。  
出所：Claude公式ドキュメント  
URL：https://claude.com/docs/claude-science/overview  
URL：https://claude.com/docs/claude-science/run-on-windows-wsl citeturn596468view0turn539572view0

### 1-6. 提供形態

Claude Science は**public beta app**で、Claude Pro、Max、Team、Enterprise ユーザー向けに提供されています。Team / Enterprise では管理者による有効化が必要です。  
出所：Anthropic公式ブログ / Claude公式プロダクトページ / Claude公式ドキュメント  
URL：https://www.anthropic.com/news/claude-science-ai-workbench  
URL：https://claude.com/product/claude-science  
URL：https://claude.com/docs/claude-science/overview citeturn240562view0turn643018view0turn596468view0

### 1-7. 価格・課金の有無

Claude Science 単体の追加料金は公式ページ上では明記されていません。ただし、Claude の料金ページでは Pro プランに「Includes Claude Science」と記載され、Pro は年払い換算で月17ドル、月払いで20ドルと記載されています。Max は月100ドルから、Team は Standard seat が年払いで月20ドル、Premium seat が年払いで月100ドルです。  
出所：Claude公式料金ページ  
URL：https://claude.com/pricing citeturn648520view0

研究室向け割引プランでは、Standard が月15ドル/ユーザー、Premium が月75ドル/ユーザーと記載されています。ただし、価格は税別で変更される可能性がある旨も明記されています。  
出所：Claude公式プログラムページ  
URL：https://claude.com/programs/claude-team-plan-for-research-labs citeturn596468view1

外部計算リソースについては、Modal を利用する場合、ユーザー自身の Modal アカウントで実行され、Modal が直接課金し、Anthropic は計算リソースを提供・請求しないと公式ドキュメントにあります。  
出所：Claude公式ドキュメント  
URL：https://claude.com/docs/claude-science/compute-providers citeturn159572view1

### 1-8. 新しいAIモデルではない

Claude Science は**新しいAIモデルではなく、アプリ / ワークベンチ**です。Claude公式プロダクトページのFAQでは、「public beta app, not a model」であり、ユーザーのプランに含まれる同じ Claude モデルを使うと説明されています。  
出所：Claude公式プロダクトページ  
URL：https://claude.com/product/claude-science citeturn643018view0

### 1-9. データの扱い・注意点

Claude Science は local-first アプリで、会話履歴と成果物はユーザーの端末に保存されます。ただし、Claude に送るプロンプトと応答は Anthropic のサーバーで処理され、標準の保持・Trust & Safety ポリシーに従うと説明されています。  
出所：Claude公式ドキュメント  
URL：https://claude.com/docs/claude-science/how-claude-science-works-with-your-data citeturn867367view1

また、Claude Science は研究ツールであり、**臨床・診断用途を意図したものではない**と公式ドキュメントに明記されています。  
出所：Claude公式ドキュメント  
URL：https://claude.com/docs/claude-science/overview citeturn596468view0

---

## 2. claims：報道・関係者発言として扱うべきこと

### 2-1. Anthropic が自社の前臨床薬剤プログラムも始めるという報道

Reuters は、Anthropic の life sciences head である Eric Kauderer-Abrams 氏が、Anthropic が neglected diseases、つまり製薬会社が商業的に優先しにくい疾患を対象に、自社の pre-clinical drug programs を開始すると述べたと報じています。これは公式ブログ本文では確認できなかったため、**報道・関係者発言ベースの claim**として扱うべきです。  
出所：Reuters / CNA転載  
URL：https://www.reuters.com/science/anthropic-unveils-claude-science-ai-platform-scientific-research-2026-06-30/  
URL：https://www.channelnewsasia.com/business/anthropic-unveils-claude-science-scientific-research-6222366 citeturn240562view3turn427065view1

### 2-2. 「既存モデル上で動く、ワークフロー勝負の製品」という見方

TechCrunch は、Claude Science は新しいAIモデルではなく、科学者がデータベース・パイプライン・ツールを行き来する負担を減らす「研究作業環境」だと整理しています。これは公式FAQとも整合しますが、TechCrunchの「Anthropic はモデル提供だけでなく、業界別ワークフロー製品へ広げている」という解釈は報道側の分析として扱うのが安全です。  
出所：TechCrunch  
URL：https://techcrunch.com/2026/06/30/anthropics-claude-science-bets-on-workflow-not-a-new-model-to-win-over-scientists/ citeturn240562view4

### 2-3. AI創薬はまだ患者に届く段階ではないという専門家コメント

The Verge は、Claude Science の発表と、Anthropic が自社で薬剤開発を目指す可能性を報じたうえで、AI創薬は実験・毒性・臨床試験・規制承認が必要であり、AI設計薬が患者に届くまでには長い道のりがあるという専門家コメントを紹介しています。これは一般読者向け記事では重要な注意点ですが、**外部専門家コメントを含む報道ベース**として扱うべきです。  
出所：The Verge  
URL：https://www.theverge.com/ai-artificial-intelligence/961311/anthropic-claude-science-ai-drug-development citeturn180417view0

### 2-4. Beta導入企業・研究機関で効率向上が報告されているという話

公式ブログ・Reuters ともに、Beta利用中の研究者・企業が効率向上を報告したとしています。ただし、第三者検証されたベンチマークではなく、事例・コメント・関係者発言として扱うのが安全です。  
出所：Anthropic公式ブログ / Reuters  
URL：https://www.anthropic.com/news/claude-science-ai-workbench  
URL：https://www.reuters.com/science/anthropic-unveils-claude-science-ai-platform-scientific-research-2026-06-30/ citeturn240562view0turn240562view3

---

## 3. uncertain：未確定・断定しない方がよい点

### 3-1. 日本での Claude Science 個別提供状況

Anthropic の supported countries ページでは、日本は Claude.ai と商用APIアクセスの対象地域に含まれています。  
出所：Anthropic公式 supported countries  
URL：https://www.anthropic.com/supported-countries citeturn142535view0

ただし、**Claude Science 単体について、日本語UI、日本の個人ユーザー/法人ユーザー向けの個別条件、日本国内でのサポート体制まで明示した公式情報は確認できませんでした。**  
記事では「日本でも使える」と断定するより、**“Claude.aiの提供対象地域に日本は含まれるが、Claude Science固有の国内提供条件は公式ページで要確認”**くらいが安全です。

### 3-2. 一般スマホユーザーに直接関係あるか

公式情報上、Claude Science は macOS / Linux / WSL などのPC・研究環境向けで、iPhone / Android の一般スマホアプリとして提供されるものではありません。スマホユーザーが日常的に使う「便利AIアプリ」というより、研究室・大学・製薬・バイオ系の作業環境です。  
出所：Claude公式プロダクトページ / Claude公式ドキュメント  
URL：https://claude.com/product/claude-science  
URL：https://claude.com/docs/claude-science/overview citeturn643018view0turn596468view0

一般読者への影響は、現時点では「研究や医療開発の裏側でAI利用が進む可能性がある」程度にとどめるのが安全です。**スマホユーザーがすぐ使う新機能、医療診断に使えるAI、薬がすぐできるAI**のようには書かない方がよいです。

### 3-3. 薬が本当に早くできるか

Anthropic や報道は、研究効率化や創薬支援の可能性を強調していますが、薬剤開発には実験、動物試験、臨床試験、規制承認が必要です。The Verge も、AI創薬が患者に届くには長い時間がかかるという専門家コメントを紹介しています。  
出所：The Verge  
URL：https://www.theverge.com/ai-artificial-intelligence/961311/anthropic-claude-science-ai-drug-development citeturn180417view0

---

## すまラボ向けの整理

### 何が起きたか

Anthropic が、科学者向けのAI作業環境「Claude Science」を正式発表しました。これは新しいClaudeモデルではなく、研究者が論文検索、データ解析、コード実行、図表作成、HPCやクラウド計算、研究成果の再現性確認までをまとめて行える**研究用ワークベンチ**です。

### なぜ話題か

ポイントは「AIに聞く」から一歩進んで、**AIに研究作業そのものを進めさせる環境**に近づいていることです。  
たとえば、論文を探す、データを読み込む、PythonやRで解析する、図を作る、どのコードで作った図なのかを残す、といった作業を1つの環境にまとめようとしています。

### 誤解されやすい点

一番大きな誤解は、**Claude Science が“新しい超高性能AIモデル”ではない**ことです。公式FAQでも、新モデルではなく、既存のClaudeモデルを研究用のツール・データベース・計算環境と組み合わせたアプリだと説明されています。citeturn643018view0

もう1つは、**医療診断AIではない**ことです。公式ドキュメントでは、臨床・診断用途を意図していないと明記されています。citeturn596468view0

### 確定と未確定

確定していることは、Claude Science が公式発表済みで、macOS / Linux向けの beta アプリとして Pro、Max、Team、Enterprise ユーザーに提供されることです。  
未確定なのは、日本向けの細かい提供条件、一般ユーザーへの広がり、創薬成果が実際にどこまで出るか、という部分です。

### 読者への意味づけ

すまラボ向けには、こう整理するとよさそうです。

**Claude Science は、普通のスマホユーザーが今すぐ使うAIアプリではありません。**  
ただし、AIの使われ方が「チャットで質問する」から、「専門職の作業環境に入り込んで、実際の仕事を進める」方向へ進んでいる象徴的なニュースです。

記事の結論としては、

> Claude Science は、研究者向けのかなり専門的なAIワークベンチ。  
> 一般ユーザー向けの新機能ではないが、AIが“相談相手”から“作業環境そのもの”へ広がっている流れとして注目。

このくらいが、すまラボ読者にはちょうどよいです。

---

## 参照ソース一覧（URL付き）

1. Anthropic公式ブログ  
   Claude Science, an AI workbench for scientists, is now available  
   https://www.anthropic.com/news/claude-science-ai-workbench citeturn240562view0

2. Claude公式プロダクトページ  
   Claude Science beta  
   https://claude.com/product/claude-science citeturn643018view0

3. Claude公式ドキュメント  
   Claude Science overview  
   https://claude.com/docs/claude-science/overview citeturn596468view0

4. Claude公式ドキュメント  
   Get started  
   https://claude.com/docs/claude-science/get-started citeturn867367view0

5. Claude公式ドキュメント  
   How Claude Science works with your data  
   https://claude.com/docs/claude-science/how-claude-science-works-with-your-data citeturn867367view1

6. Claude公式ドキュメント  
   Compute providers  
   https://claude.com/docs/claude-science/compute-providers citeturn159572view1

7. Claude公式ドキュメント  
   Run on Windows with WSL  
   https://claude.com/docs/claude-science/run-on-windows-wsl citeturn539572view0

8. Claude公式料金ページ  
   Plans & Pricing  
   https://claude.com/pricing citeturn648520view0

9. Claude公式プログラムページ  
   Claude Team plan for research labs  
   https://claude.com/programs/claude-team-plan-for-research-labs citeturn596468view1

10. Anthropic公式  
    Supported countries & regions  
    https://www.anthropic.com/supported-countries citeturn142535view0

11. Reuters  
    Anthropic unveils ‘Claude Science’ for scientific research  
    https://www.reuters.com/science/anthropic-unveils-claude-science-ai-platform-scientific-research-2026-06-30/ citeturn240562view3

12. CNA / Reuters転載  
    Anthropic unveils ‘Claude Science’ for scientific research  
    https://www.channelnewsasia.com/business/anthropic-unveils-claude-science-scientific-research-6222366 citeturn427065view1

13. TechCrunch  
    Anthropic’s Claude Science bets on workflow, not a new model, to win over scientists  
    https://techcrunch.com/2026/06/30/anthropics-claude-science-bets-on-workflow-not-a-new-model-to-win-over-scientists/ citeturn240562view4

14. The Verge  
    Anthropic wants to develop its own drugs  
    https://www.theverge.com/ai-artificial-intelligence/961311/anthropic-claude-science-ai-drug-development citeturn180417view0
