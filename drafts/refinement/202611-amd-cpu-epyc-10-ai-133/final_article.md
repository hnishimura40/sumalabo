# 画像から顔を探す試験で、1秒あたりの処理枚数が約133倍。何を比べた数字？

## 30秒で分かる

1. **これは何？** EPYCは、AMD（コンピューターの部品を設計する会社）が手がける業務用の計算部品シリーズです。今回の試験では、この部品でAI（ここでは、画像の中から顔が写っている場所を探す仕組み）を動かしました。
2. **何があった？** 技術メディアのPhoronixが、初代EPYCを2基積んだ業務用コンピューターと、第6世代を2基積んだものを比較しました。画像から顔を探す試験で、新しい構成が1秒あたりに処理できた画像の枚数は、旧構成の約133倍だったと報告しています。 [Phoronixの測定結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2)
3. **誰に関係ある？** 大量の画像を処理する仕組みの導入や更新を考えている人には、比較の手がかりになります。普段使う生成AI（指示に応じて文章や画像を作る仕組み）や家庭用パソコンを選ぶ人には、実際に使うサービスやアプリに近い試験が参考になります。
4. **結局どうなの？** 大量の画像を処理したいなら、同じ作業で1秒に何枚処理できるかを見ます。画像1枚の結果を早く受け取りたいなら、その結果が返るまでに何秒かかるかを見ます。

## そもそもEPYCって何？

**サーバー**は、大量のデータを処理したり、利用者からの依頼を引き受けたりするコンピューターです。たとえば、サービスに届いた写真をまとめて調べる仕事を担います。

サーバーの中で計算や命令の実行を担う部品が**CPU**です。EPYCはサーバー向けのCPUで、今回の試験では**顔検出**（画像の中で顔が写っている場所を見つける処理）に使われました。 [AMDの製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html) [Phoronixの顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2)

## あなたに関係ある？

- **関係がある人**　仕事で大量の写真を扱い、画像を処理する仕組みの導入や更新を考えている人です。自分の仕事に近い画像と処理方法で、1秒あたりの処理枚数を比べると判断に使えます。
- **あまり関係がない人**　普段使う生成AIの返事を早く受け取りたい人や、家庭用パソコンの買い替えを考えている人です。サービスや製品を選ぶときは、普段使うアプリや作業に近い測定結果が参考になります。

## 今回何が変わった？

AMDは2017年6月20日に初代EPYC 7000シリーズの発売を発表しました。約9年5か月後の2026年11月10日には、第6世代のうちEPYC 9006 SP7の一般提供と、搭載サーバーの出荷を発表しました。いずれも米国時間です。サーバーメーカーのSupermicroも11月11日に搭載機「H15」の出荷を発表しました。 [AMDの初代発売発表](https://ir.amd.com/news-events/press-releases/detail/773/amd-epyc-datacenter-processor-launches-with-record-setting-performance-optimized-platforms-and-global-server-ecosystem-support) [AMDの第6世代提供発表](https://ir.amd.com/news-events/press-releases/detail/1305/amd-showcases-6th-gen-amd-epyc-processors-to-lead-next-era-of-ai-and-enterprise-computing) [Supermicroの出荷発表](https://www.supermicro.com/en/pressreleases/supermicro-now-shipping-next-generation-servers-powered-6th-gen-amd-epyc-9006)

日本時間の2026年11月24日、Phoronixが新旧の**ベンチマーク**（決められた作業を行い、処理量や時間を測る性能試験）を公開しました。初代のEPYC 7601を2基積んだサーバーを基準に、第6世代のEPYC 9996を2基積んだサーバーでは、顔検出で1秒あたりに処理できた画像が約133倍だったと報告しています。GIGAZINEも11月27日にこの比較を取り上げました。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) [顔検出の結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2) [GIGAZINEの報道](https://gigazine.net/news/20261127-amd-epyc-performance/)

同じ2構成で、科学技術計算や制作などAI以外の作業も含む100件超の試験をまとめると、Phoronixの集計では12.1倍でした。各試験の倍率を掛け合わせて求める幾何平均です。第6世代の別機種、EPYC 9686Fを2基積んだ構成では、同じ初代を基準とした集計値は8.7倍でした。どの機種で何の作業を測るかによって、差の大きさは変わります。 [Phoronixの集計結果](https://www.phoronix.com/review/amd-epyc-9006-7601/12)

## 何が便利になる？

たとえば、撮りためた写真を整理する前に、顔が写っている場所をまとめて調べる場面です。1秒あたりに処理できる枚数が増えれば、同じ時間でより多くの写真を調べられます。画像が次々に届くサービスなら、届く量に処理が追いつくかを見る目安になります。 [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html) [処理量と待ち時間の技術資料](https://docs.openvino.ai/2026/openvino-workflow/running-inference/optimize-inference/optimizing-throughput.html)

> **ひまり**「写真を1枚だけ送って結果を待つときも、1秒あたりの枚数を見ればいい？」
>
> **らぼまる**「そのときは、写真を送ってから画面に結果が出るまでを測ろう。写真を送る時間も含めると、実際にどれだけ待つかが分かるよ」

## 注意点

約133倍が表すのは、試験した条件で1秒間に処理できた画像の枚数です。知りたいことに合わせて、見る数字を選びます。 [Phoronixの顔検出結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2) [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)

- **画像1枚の処理を早く終えたい**　1枚の処理にかかる時間を見ます。
- **顔をどれだけ正確に見つけられるか知りたい**　顔を見落としたり、顔のない場所を顔と判定したりした割合を見ます。
- **生成AIの返事を早く受け取りたい**　使いたいサービスで、同じような質問を送ってから回答が出るまでの時間を見ます。
- **AIを学習させる時間を短くしたい**　使うデータや学習の条件をそろえ、学習が終わるまでの時間を見ます。

## もう少し詳しく知りたい人向け

顔検出の試験では、**OpenVINO**（学習済みのAIをコンピューターで動かすためのソフトウェア）を使用しました。試験の設定名は `Face Detection FP16-INT8` です。両方のサーバーで基本のソフトウェア環境（Ubuntu 26.10、Linux 7.3、GCC 15.3）をそろえ、CPUで画像を処理しました。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) [顔検出の試験設定と結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2)

約133倍はPhoronixの報告値です。当該試験の元データを取得できなかったため、各構成の処理枚数と、それを使った倍率の再計算は未確認です。公開されている同じ設定の集計ページには、複数の試験結果がまとめられています。実際に測定した日と国も確認できていません。 [Phoronixの顔検出結果](https://www.phoronix.com/review/amd-epyc-9006-7601/2) [OpenBenchmarkingの当該比較の結果ページ](https://openbenchmarking.org/result/2611238-PTS-NAPLESVE19) [同じ設定の複数の試験結果](https://openbenchmarking.org/performance/test/pts/openvino/aed2f11af6e9ef02cbc7d157782e069255aba200)

新旧のサーバーでは、CPUに備わるコア（CPUの中で計算を担当する部分）の数と、メモリ（処理に使うデータを一時的に置いておく場所）の容量が異なります。 [Phoronixの試験構成](https://www.phoronix.com/review/amd-epyc-9006-7601) [AMDのサーバー向けCPU仕様一覧](https://www.amd.com/en/products/specifications/server-processor.html)

| 比べた項目 | 初代の構成 | 第6世代の構成 |
|---|---|---|
| CPU | EPYC 7601を2基 | EPYC 9996を2基 |
| CPU1基あたりのコア数 | 32 | 256 |
| サーバー全体のメモリ容量 | 512GB | 2TB |
| メモリの種類 | DDR4-2666 | MRDIMM-12800 |

旧機はDell PowerEdge R7425、新機は評価用のサーバーで、データを保存する装置も異なります。AMDの技術資料では、第6世代の「Venice」に、より多くのコアを載せるZen 6cと、高い動作速度を重視する機種の土台となるZen 6 Classicがあります。約133倍を記録したEPYC 9996はZen 6cの上位機種です。今回の倍率にはサーバー全体の構成差が含まれ、CPUの設計やコア数、メモリなど、個々の違いがどの程度効いたかは分かりません。 [Phoronixの試験構成](https://www.phoronix.com/review/amd-epyc-9006-7601) [AMDの技術資料](https://docs.amd.com/api/khub/documents/erxSLln6OQx26yZNNjGVzw/content)

### 日本での導入は？

AMDは日本語の製品案内と法人向けの問い合わせ窓口を公開しています。インターネット経由で計算機を借りるサービスでは、Microsoftが第6世代EPYCを使うAzure HDv2を申請制の試用として案内しています。AMDはOracleの今後のCompute E7に第6世代EPYCを採用する予定も発表しました。国内の構成別価格・在庫・納期と、両サービスの日本での一般提供時期は、2026年11月28日時点で確認できていません。 [AMDの日本語製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html) [Microsoftの試用案内](https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/accelerating-ai-data-processing-hpc-and-agentic-workloads-with-azure-hdv2-virtua/4567877) [AMDのOracle向け発表](https://newsroom.amd.com/news/amd-expands-ai-cloud-infrastructure-oracle/)

## すまラボまとめ

約133倍は、Phoronixが新旧のEPYC搭載サーバーで顔検出を試し、**1秒あたりに処理できた画像の枚数**を比べた結果です。自分の用途に当てはめるときは、まず同じ作業を測っているかを確かめます。1秒に何枚処理できるかと、1枚の結果が返るまで何秒かかるかは、別々に測る数字です。
