---
artifact_type: research_report
stage: Research Pass
slug: 202611-ai-gpu-unite-ai
topic: AI性能指標としてのGPU使用率に異議を唱える「推論経済性スコアカード」
source_session: 独立調査セッション
researched_at: 2026-11-18
timezone: Asia/Tokyo
intended_path: drafts/refinement/202611-ai-gpu-unite-ai/research_report.md
delivery: Markdown本文を直接出力。保存は外側の工程が担当
source_basis: 公開された公式発表・署名付き報告書・共同試験報告・公式技術文書
---

# Research Report

## 調査結論

WEKAは2026年11月16日、NAND Researchと共同で、AI推論基盤の評価枠組み「Inference Economics Scorecard」を発表した。焦点は、GPUの稼働状況に加えて、電力・設置スペース・費用に対して、要求された条件を満たす出力をどれだけ提供できたかを見ることにある。[WEKA公式発表](https://www.weka.io/news/new-research-challenges-gpu-utilization-as-measure-of-inference-infrastructure)

**記事で説明できる核は「GPUが忙しいことと、利用者の役に立つ処理が進むことは区別して測る」という提案である。** AIモデルの知能や回答の正確さを順位付けする指標として紹介するのは不適切。スコアカードの定義と、WEKA製品について公表された性能数値も分けて扱う。

## 出所と確認範囲

確認日はすべて2026年11月18日。公開日は各ページの表示に基づく。

| ID | 出所・URL | 公開日・更新日 | 確認事項 |
|---|---|---|---|
| S1 | [WEKA公式発表](https://www.weka.io/news/new-research-challenges-gpu-utilization-as-measure-of-inference-infrastructure) | 公開2026-11-16 | 発表主体、目的、9指標、4原則、共同試験の紹介 |
| S2 | [The Inference Economics Scorecard](https://www.weka.io/resources/analyst-report/the-inference-economics-scorecard) | 公開・更新2026-11-16 | Steve McDowell署名、発行者NAND Research、指標の定義と開示条件 |
| S3 | [WEKA CEOによる解説](https://www.weka.io/article/inference-economics-scorecard-open-source) | 公開2026-11-16 | 問題提起、研究へのスポンサー関与、効果が小さい利用条件 |
| S4 | [WEKAの共同ベンチマーク詳細](https://www.weka.io/article/benchmarking-weka-on-nebius-ai-cloud) | 公開2026-09-24 | モデル・ソフトウェア版、試験日、同時実行条件、比較対象、数値の分母 |
| S5 | [Nebiusの共同ベンチマーク報告](https://nebius.com/blog/posts/nebius-weka-shared-kv-cache-benchmark-hgx-b300) | 公開2026-09-24 | 試験構成、出力・応答時間・エラー率、外部キャッシュの構成 |
| S6 | [WEKA kvlab技術解説](https://www.weka.io/article/meet-weka-kvlab) | 公開2026-11-16 | トラフィック構造の記録、代替内容による再生、任意の検証機能 |
| S7 | [WEKA公式公開リポジトリ：kvlab](https://github.com/weka/kvlab) | ページに公開日の明記なし | 公開コードとREADMEの存在、版をそろえた比較の必要性 |
| S8 | [NVIDIA：Useful nvidia-smi Queries](https://nvidia.custhelp.com/app/answers/detail/a_id/3751/~/useful-nvidia-smi-queries) | 更新2021-09-29、公開日不明 | `utilization.gpu` の定義 |

採用情報のGoogle News RSSリンクは取得できず、Unite.AI記事本文との照合は未完了。提示された見出し・配信日時は発見情報として扱い、以下の事実認定は公式資料に基づく。

## facts：一次情報で確認できた事項

ここでいうfactsは、発表・定義・公開資料の存在を確認できた事項を指す。企業が発表した性能数値を、独立した再現試験で確定した事実へ格上げする意味ではない。

### F1．評価対象は推論を提供する基盤

「推論」は、学習済みのAIが入力を受けて応答を生成する処理。今回の枠組みは、これを多数の利用者へ継続提供する設備の生産性と経済性を評価するものとして発表された。[S1：公式発表](https://www.weka.io/news/new-research-challenges-gpu-utilization-as-measure-of-inference-infrastructure)

### F2．9つの評価項目が示されている

| 項目 | 短い説明 |
|---|---|
| Tokens per watt | 消費エネルギーに対する有用な出力 |
| Tokens per rack | 設置スペースに対する有用な出力 |
| Cost per inference | 成功した処理当たりの費用 |
| GPU goodput | GPU時間当たりの、条件を満たした処理量 |
| TTFT／end-to-end latency | 応答開始まで／応答完了までの時間 |
| Memory efficiency | 応答条件を保ちながら使える記憶容量 |
| Operational density | 電力・温度などの条件下での設備密度 |
| Agent concurrency | 条件を保って同時に動かせるエージェント等の数 |
| Context retention | 過去の文脈に対応する計算結果の保持・再利用 |

単一の総合点やモデル順位表として扱わない。[S1：9項目の公式説明](https://www.weka.io/news/new-research-challenges-gpu-utilization-as-measure-of-inference-infrastructure)

### F3．比較条件をそろえる原則がある

報告書は、同じモデル・計算精度・リクエスト構成・同時実行条件・品質基準・応答目標で比較し、提供システム全体を測ることを求める。試験は最低8時間とし、失敗・再試行等も報告する。成果として数えるのは品質と応答目標を満たす出力で、推計値は実測と分ける。[S2：測定原則](https://www.weka.io/resources/analyst-report/the-inference-economics-scorecard)

「Tokens per watt」という名称に対し、定義表の分母は試験中の総消費エネルギーWhになっている。本文では「消費電力量当たりの有用な出力」と説明し、WとWhを混同しない。[S2：定義表](https://www.weka.io/resources/analyst-report/the-inference-economics-scorecard)

### F4．一般的なGPU使用率は成果の量を直接表さない

NVIDIAは`utilization.gpu`を、観測期間中にGPUで1つ以上の計算処理が動いていた時間の割合として説明している。この定義から、使用率だけでは回答品質や成功件数は読み取れない、と整理できる。これは定義に基づく編集上の推論である。[S8：NVIDIA公式説明](https://nvidia.custhelp.com/app/answers/detail/a_id/3751/~/useful-nvidia-smi-queries)

WEKAの解説に登場するMFUと、`nvidia-smi`のGPU使用率を同一の測定値として記述しない。

### F5．スポンサー関与と効果の限界が明記されている

WEKA CEOは、同社がスコアカード研究を支援し、試験用の負荷を提供したと記している。また、短いセッションや、必要な文脈がGPUメモリーに十分収まる用途では、共有キャッシュ層による改善は小さいとしている。[S3：スポンサー関与と限界](https://www.weka.io/article/inference-economics-scorecard-open-source)

### F6．公開ツールは処理の構造を再生する

WEKAの説明では、kvlabは文章そのものではなく、繰り返しを識別する情報、長さ、時刻、エージェントの分岐関係などを記録する。再生時には代替内容を生成する。文脈の保持等を調べる任意の検証機能も説明されている。[S6：kvlab技術解説](https://www.weka.io/article/meet-weka-kvlab)

したがって、「実際のエージェント通信に由来する負荷」と説明できるが、「実際のソースコードを使って開発成果の正しさを採点した」とは書けない。

## claims：発信者への帰属を残す主張・性能数値

### C1．使用率だけでは再計算の無駄を見落とす、という問題提起

WEKAは、長い処理の途中で過去の計算結果がメモリーから追い出されると、その再計算でもGPU使用率が高くなると説明する。「GPU使用率が高くても、同じ仕事のやり直しが含まれ得る」という説明に使える。すべてのAI処理で同じ程度の無駄が発生すると一般化しない。[S3：WEKAの説明](https://www.weka.io/article/inference-economics-scorecard-open-source)

### C2．共同試験の公表値

以下はWEKA・Nebiusの共同試験についての公表値であり、本調査で再現した結果ではない。

| 指標 | GPU内メモリーのみ | WEKAの共有キャッシュ併用 |
|---|---:|---:|
| GPU・1時間当たりの出力トークン | 約46,000 | 約169,000 |
| 上記の比較 | 基準 | 約3.7倍 |
| 最初の出力までの中央値 | 約5.68秒 | 約1.05秒 |
| エラー率 | 2.32% | 0.64% |

Nebiusは、同じ推論ノードで出力や応答性が改善したと報告している。これは特定構成・負荷での結果であり、製品全般の倍率ではない。[S5：共同試験報告](https://nebius.com/blog/posts/nebius-weka-shared-kv-cache-benchmark-hgx-b300)

### C3．試験条件と比較の境界

| 項目 | 公表された条件 |
|---|---|
| 推論ノード | NVIDIA HGX B300、8GPU、TP=8 |
| モデル | `nvidia/DeepSeek-V4-Pro-NVFP4` |
| ソフトウェア | vLLM v0.23.0、WEKA NeuralMesh 5.1.1.41 |
| 最大モデル長 | 1,048,576トークン |
| セッションプール | 512 |
| 同時リクエスト設定 | 32：通常28＋高頻度4 |
| 試験時間 | 各構成8時間 |
| 試験日 | HBMのみ：2026-07-22／WEKA併用：2026-07-26〜27 |
| 比較対象 | GPU内メモリーのみ／外部共有キャッシュ併用 |

共有キャッシュには8ノードのローカルNVMeを利用する。「8GPUだけで全設備が完結」「外部設備の費用も同じ」とは解釈しない。512セッションと同時リクエスト32も区別する。[S4：試験条件](https://www.weka.io/article/benchmarking-weka-on-nebius-ai-cloud)、[S5：設備構成](https://nebius.com/blog/posts/nebius-weka-shared-kv-cache-benchmark-hgx-b300)

比較対象をHBMのみにした理由について、WEKAは試験当時、このモデルに対応するDRAMへの退避実装を利用できなかったと説明している。ほかのキャッシュ方式全般に対する優位性を示した比較ではない。[S4：比較対象の説明](https://www.weka.io/article/benchmarking-weka-on-nebius-ai-cloud)

### C4．応答開始の割合には分母の違いがある

「5秒以内に最初の出力が出た割合」は、成功したリクエストだけなら44.4%対97.0%。試行全体では43.3%対96.3%とされる。約97%という数値を使う場合は、成功したリクエストを分母とすることを添える。[S4：集計条件](https://www.weka.io/article/benchmarking-weka-on-nebius-ai-cloud)

## uncertain_points：未確認・断定できない事項

| 論点 | 確認状況と記事上の扱い |
|---|---|
| 独立した再現試験 | 今回確認した資料には含まれない。「第三者が性能を実証」としない |
| 9項目すべての実測達成 | 枠組みの定義と、共同試験で公表された測定項目は別。全項目検証済みとはしない |
| 回答の正確さ・開発タスクの成功率 | 共同試験における品質基準、任意の検証機能の使用状況は確認できず。回答品質向上は断定しない |
| 電力・総費用・ラック当たりの改善率 | 出力の3.7倍から換算しない。設備全体の電力、価格、運用費を含む裏付けが必要 |
| 業界標準としての普及 | 提案・公開は確認できたが、共通標準として広く採用済みとは確認できない |
| 日本の一般向けサービスへの影響 | 国内サービスの料金変更、応答速度改善、採用事実は未確認 |
| 日本での商用利用条件 | 公開資料の閲覧と、製品の国内契約・提供地域・日本語支援は別。後者は未確認 |
| 試験の国・施設 | 発表場所は米シカゴ。試験設備の所在国・施設は確認できず、シカゴで測ったとは書かない |
| 前回からの改善 | 旧スコアカードとの比較は確認できない。3.7倍は2構成間の比較 |
| 公開データの版 | 共同試験の5,000超セッションと、現在のツール解説にある公開コーパスを同一版と断定しない |
| 話題の広がり | 採用情報も`verified:false`。「世界で話題」「急速に普及」は裏付け不足 |

AgentXの参照先も取得したが、取得ページには非公式配備である旨の表示があった。今回のモデル順位・性能値の根拠には採用しない。[取得したAgentXページ](https://inferencex.semianalysis.com/infx/agentx)

## 採用情報との照合

| 採用情報の要素 | 判定 |
|---|---|
| 「推論経済性スコアカード」が存在する | 公式発表・報告書で確認 |
| GPU使用率への異議という主題 | WEKAの問題提起と整合。ただし使用率そのものの無効化とは説明しない |
| 「AI性能指標」という表現 | 対象を「AI推論基盤の効率・経済性」と具体化する必要あり |
| Unite.AI記事の本文・配信日時 | 直接照合できず、提示情報として保持 |
| 新しいモデルの性能順位 | 該当しない |
| アプリ順位の国・対象・観測時点 | アプリ順位を扱う題材ではないため対象外 |

## 読者向け説明への引き継ぎ

これは、AIを動かす設備について「忙しさ」だけでなく「役に立つ処理をどれだけ提供できたか」を測ろうという話である。

直接関係するのは、AIサービスの設備や運用費を検討する担当者。一般の利用者には、性能広告を見る際に、速度だけでなく負荷・失敗・測定時間を確認する視点として説明できる。今回の発表だけで契約や課金判断を変える根拠はない。

| 専門語 | 説明に使う短い日本語 |
|---|---|
| GPU | AIなどの大量の計算を担う装置 |
| トークン | AIが文章を処理する際の区切り。日本語の文字数とは一致しない |
| KVキャッシュ | 過去の文脈を処理した計算結果の保存 |
| HBM | GPUに搭載された高速メモリー |
| プリフィル | 応答生成前に入力文を処理する段階 |
| TTFT | 最初の出力が届くまでの待ち時間 |
| Goodput | 決めた品質・応答条件を満たした処理量 |

**事実から言えること：** 比較には、同じ条件、長時間の測定、失敗の記録が必要だという枠組みが提示された。

**事実から言えないこと：** AIが3.7倍賢くなった、電気代が3.7分の1になった、日本のサービスが速くなった、WEKAがあらゆる構成で優れる。

## 調査レビュー

- 発表日、試験報告の公開日、実際の試験日を分けた。
- スコアカードの定義と、企業による性能主張を分けた。
- セッション数、同時リクエスト数、推論ノードとキャッシュ設備を区別した。
- 速度・出力量から品質、電力、費用の改善を推測していない。
- 取得できなかった資料や、独立検証の不足は未確認として残した。
- Research Passの範囲で終了し、記事本文・画像・公開の判定には進んでいない。
