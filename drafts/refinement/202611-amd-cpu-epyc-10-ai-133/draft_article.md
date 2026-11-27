# 顔を探す試験で、1秒あたりの処理枚数が約133倍。この数字は何を測った？

## 30秒で分かる

1. **これは何？** EPYCとは、AMD（コンピューターの部品を設計する会社）が出している業務用の計算部品のシリーズです。今回は、この部品でAI（ここでは、画像を見て顔を探す仕組み）を動かしました。
2. **何があった？** 性能を測るメディアのPhoronixが、初代と第6世代を載せた業務用コンピューターを比較しました。顔を探す試験で、新しい機械が1秒あたりに処理できた画像は、古い機械の約133倍でした。 [Phoronixの測定結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2)
3. **誰に関係ある？** 大量の画像を処理する仕組みを導入・更新する人には参考になります。普段使う生成AI（指示に応じて文章や画像を作る仕組み）や、手元のパソコンの買い替えを考えている人は、今の使い方や予定を変える必要はありません。
4. **結局どうなの？** 約133倍は、決められた試験で、同じ時間にどれだけ多くの画像を処理できたかを表す数字です。自分の用途に当てはめるときは、測った作業と、知りたい数字が合っているかを見ます。

## そもそもEPYCって何？

**サーバー**とは、大量のデータ処理や、利用者からの依頼を引き受けるコンピューターです。たとえば、サービスに届いたたくさんの画像をまとめて調べる仕事を担います。

そのサーバーの中で、計算や命令の実行を担う部品が**CPU**です。EPYCはサーバー向けのCPUで、今回の試験では、このCPUを使って**顔検出**（画像の中で顔が写っている場所を見つける処理）を行いました。 [AMDの製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html) [Phoronixの顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2)

## あなたに関係ある？

- **関係がある人**　仕事で大量の写真を処理し、処理待ちを減らすためにサーバーの更新を考えている人です。自分の仕事に近い画像や処理方法で、1秒あたりに何枚処理できるかを比べると、更新の判断に使えます。
- **あまり関係がない人**　生成AIの返事を待つ時間が気になる人や、家庭用パソコンの買い替えを考えている人です。製品やサービスを選ぶときは、普段使うアプリや作業に近い測定結果が参考になります。

## 今回何が変わった？

AMDが初代EPYCを発表したのは2017年6月です。約9年5か月後の2026年11月、AMDは第6世代EPYCの一般提供と、搭載サーバーの出荷を発表しました。 [AMDの初代発表](https://ir.amd.com/news-events/press-releases/detail/773/amd-epyc-datacenter-processor-launches-with-record-setting-performance-optimized-platforms-and-global-server-ecosystem-support) [AMDの第6世代発表](https://ir.amd.com/news-events/press-releases/detail/1305/amd-showcases-6th-gen-amd-epyc-processors-to-lead-next-era-of-ai-and-enterprise-computing)

その後、日本時間の11月24日にPhoronixが新旧の**ベンチマーク**（決められた作業で処理量や時間を測る性能試験）を公開しました。初代のEPYC 7601と第6世代のEPYC 9996を、それぞれ2基積んだサーバーで比較しています。顔検出の1秒あたりの処理枚数は約133倍、AI以外の作業も含む100件超の試験をまとめた値は12.1倍でした。同じ2台でも、どの作業を測るかで差の大きさが変わります。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) [顔検出の結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2) [全試験の集計](https://www.phoronix.com/review/amd-epyc-9006-7601/12)

## 何が便利になる？

たとえば、撮りためた写真を整理する前に、顔が写っている場所をまとめて調べる場面です。1秒あたりに処理できる枚数が増えれば、同じ時間でより多くの写真を調べられます。画像が次々に届く仕組みなら、届く量に処理が追いつくかを見る目安にもなります。 [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)

> **ひまり**「写真を1枚だけ送って、結果を待つときも、この数字を見ればいい？」
>
> **らぼまる**「そのときは、画像を送ってから1枚の結果が返るまでの時間を見よう。写真がたくさん届くときは、1秒に何枚処理できるかが役立つよ」

## 注意点

**知りたいことに合わせて、測る数字を選びます。**

- **画像1枚の結果を早く見たい**　1枚の処理が終わるまでの時間を見ます。
- **顔をどれだけ正確に見つけられるか知りたい**　見落としや誤検出の割合を見ます。
- **生成AIの返事を早く受け取りたい**　使いたいサービスで、同じような質問を送ってから回答が出るまでの時間を見ます。 [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)

約133倍には、CPUの設計や計算を担当する部分の数、データを一時的に置く場所など、新旧サーバーの構成の違いが含まれています。それぞれの違いが何倍分を説明するかは、この試験結果からは分かりません。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601)

## もう少し詳しく知りたい人向け

顔検出の試験には、**OpenVINO**（学習済みのAIをコンピューターで動かすためのソフトウェア）が使われました。試験の設定名は `Face Detection FP16-INT8` です。両方のサーバーで基本のソフトウェア環境をそろえ、CPUで画像を処理しました。約133倍はPhoronixが報告した倍率です。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) [顔検出の試験設定と結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2)

以下の**コア**とは、CPUの中で計算を担当する部分の一つです。**メモリ**とは、処理に使うデータを一時的に置いておく場所です。

| 比べた項目 | 初代の構成 | 第6世代の構成 |
|---|---|---|
| CPU | EPYC 7601を2基 | EPYC 9996を2基 |
| CPU1基あたりのコア数 | 32 | 256 |
| サーバー全体のメモリ容量 | 512GB | 2TB |

出典は[Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601)。

**日本での導入を考える場合**、AMDは日本語の製品案内を公開しています。インターネット経由で計算機を借りるサービスでは、Microsoftが第6世代EPYCを使うAzure HDv2を申請制の試用として案内し、AMDはOracleのCompute E7への採用予定を発表しています。国内の構成別価格・納期と、これらのサービスの日本での一般提供時期は、2026年11月28日時点で確認できていません。 [AMDの日本語製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html) [Microsoftの試用案内](https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/accelerating-ai-data-processing-hpc-and-agentic-workloads-with-azure-hdv2-virtua/4567877) [AMDのOracle向け発表](https://newsroom.amd.com/news/amd-expands-ai-cloud-infrastructure-oracle/)

## すまラボまとめ

約133倍は、新旧の業務用コンピューターが、顔を探す試験で**1秒あたりに処理できた画像の枚数**の差です。性能のニュースで大きな倍率を見かけたら、まず「何の作業をしたか」「何を数えたか」を確かめると、自分が使う場面に当てはめられる数字か判断できます。
