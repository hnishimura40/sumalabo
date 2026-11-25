# Editorial Selection

判定: 限定採用

- カテゴリ候補は「ニュースをかみくだく」。
- 調査根拠は `drafts/refinement/202611-anthropic-openai-gigazine/research_report.md`（2026年11月26日、日本時間確認）。

## なぜ今注目するか

11月24日にAxiosが、AnthropicとOpenAIの一部の従業員の間で、未公開モデルを安全に一般提供できるか懸念が出ていると報じた。翌25日にGIGAZINEが紹介した。同じ11月に両社が公表した資料からは、安全性を段階ごとに確かめる仕組みや、同じ基盤モデルでも機能の制限と利用できる相手を変えた具体例が分かる。報道をきっかけに、新しいAIが一般の利用者に届くまでに開発会社が何を判断するのかを解説する。 [Axios](https://www.axios.com/2026/11/24/anthropic-openai-unreleased-ai-safety-risks) · [GIGAZINE](https://gigazine.net/news/20261125-anthropic-openai-employees-fear-unreleased-ai-models/) · [OpenAIの安全対策](https://openai.com/index/managing-frontier-ai-risk/) · [Anthropicの提供発表](https://www.anthropic.com/claude-fable-and-mythos-5-2)

## 採用範囲と根拠

- **OpenAIはどの段階で何を確かめるか。** 11月18日の公式説明では、研究、社内利用、社外提供の各段階で、次に進む前にAIモデルと安全対策を審査する。学習の一時停止とGPT‑6.1 Astraの提供見合わせを、判断する時点が異なる実例として使う。Axiosが取材したモデルとの関係は未確認。 [OpenAIの安全対策](https://openai.com/index/managing-frontier-ai-risk/)
- **Anthropicは誰がどの条件で使えるようにしたか。** 11月9日の発表では、Claude Fable 5.2とClaude Mythos 5.2は同じ基盤モデルを使う。Fable 5.2は悪用を抑える制限を設けて幅広く提供し、Mythos 5.2は審査を伴う枠組みを通じて提供している。AIの土台が同じでも、使える機能や利用者の条件に違いがあることを示す例として使う。 [Anthropicの提供発表](https://www.anthropic.com/claude-fable-and-mythos-5-2)
- **従業員の懸念はAxiosの取材に帰属させる。** 報道対象の名前や各社の最終判断は未確認。「取材源24人超」は警告した従業員の人数として扱えない。個別の内部テストや数学の成果は採用範囲から外す。報道対象と結びつけて、性能や危険性を評価できる公開資料が確認できないため。 [Axios](https://www.axios.com/2026/11/24/anthropic-openai-unreleased-ai-safety-risks)
- **採用情報との照合。** 採用情報は「一般公開」を新モデルの提供開始に関する語として拾った。今回確認できたニュースは一般提供を巡る懸念の報道で、対象モデルの提供日、価格、日本での利用条件は未確認。フィード掲載位置から報道の広がりや人気は判断できない。

## 見出しと30秒まとめの設計

**見出しの問い案**  
新しいAIは、何を確かめて誰に提供される？ OpenAIとAnthropicの事例

- **これは何？** 新しいAIを社外に出す前に、安全に使える条件と、誰に使ってもらうかを決める話。
- **何があった？** Axiosが、まだ一般に出ていないAIを安全に提供できるか懸念する従業員がいると報じた。両社の公式資料には、段階ごとに安全性を確かめたり、利用者を絞って提供したりした事例がある。
- **誰に関係ある？** 仕事や学習で次のAIを試したい人、導入先を選ぶ人に関係する。今のChatGPTやClaudeで用が足りている人が、今回の報道を受けて契約や使い方を見直す材料は確認できていない。
- **結局どうなの？** 開発会社は、AIが何をできるかに加え、どんな使い方を制限し、誰に使ってもらうかを判断する。日本で使えるかを知りたいときは、そのモデルの公式案内で提供先、申込条件、日本が対象かを確認する。

## 読者翻訳設計

**主題の一言説明**  
新しいAIを社外に出すとき、開発会社は問題のある使い方を抑えられるかを確かめ、使える機能と利用できる人の範囲を決める。

**関係がある人**  
次のAIを仕事や学習で試したい人や、職場で導入を検討する人。ニュースでAIの名前を見たときに、日本から使えるか、申込や審査が必要か、どの機能を使えるかを公式案内で判断できる。

**あまり関係がない人**  
現在使っているChatGPTやClaudeで目的を満たしていて、新しいAIの利用予定がない人。今回の調査では、報道に伴う既存サービスの料金や利用条件の変更は確認できていない。 [OpenAIの対応国一覧](https://help.openai.com/en/articles/7947663-chatgpt-and-openai-api-supported-countries-and-territories) · [Anthropicの対応地域](https://www.anthropic.com/legal/supported-regions)

**専門用語**

- AIモデル → 質問に答えたり文章を作ったりするAIの中核部分
- 未公開モデル → まだ一般に提供されていないAI
- 基盤モデル → 複数の製品やサービスに使えるAIの土台
- 学習 → AIに多くのデータを読み込ませ、答え方などを身につけさせる工程
- 安全対策 → 問題のある使い方や動きを抑えるための仕組みや制限
- 安全審査 → AIの動きや対策を調べ、次の段階に進めてよいか確かめること
- 一般提供 → 対象地域などの条件を満たせば、幅広い人が使える形で出すこと
- 限定提供 → 審査を通った人や組織など、相手を絞って使えるようにすること
- 提供見合わせ → その時点では利用者に出さないという判断

**事実から言えること**  
公開資料は、学習を一時停止する判断、提供を見合わせる判断、使える機能と利用できる相手を変える判断の実例を示している。日本が通常サービスの対応地域に含まれることも確認できる。 [OpenAIの安全対策](https://openai.com/index/managing-frontier-ai-risk/) · [Anthropicの提供発表](https://www.anthropic.com/claude-fable-and-mythos-5-2) · [OpenAIの対応国一覧](https://help.openai.com/en/articles/7947663-chatgpt-and-openai-api-supported-countries-and-territories) · [Anthropicの対応地域](https://www.anthropic.com/legal/supported-regions)

**事実から言えないこと**  
報道対象のモデル名、個々のモデルで実証された危険性、一般提供を恒久的に見送る決定、日本での提供日・価格・利用条件は確認できない。公式資料に出てくるモデルと、取材で言及されたモデルの対応関係も未確認。 [Axios](https://www.axios.com/2026/11/24/anthropic-openai-unreleased-ai-safety-risks) · [OpenAIの安全対策](https://openai.com/index/managing-frontier-ai-risk/) · [Anthropicの提供発表](https://www.anthropic.com/claude-fable-and-mythos-5-2)
