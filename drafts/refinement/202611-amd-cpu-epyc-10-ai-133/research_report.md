# research_report.md — AMD EPYCの世代間ベンチマーク

出所：AMDの公式発表・製品仕様・技術資料、測定者Phoronixの公開レビュー、OpenVINO公式文書、Microsoft Azureの公式発表。調査日：2026年11月28日（日本時間）。採用情報の起点はGIGAZINEの2026年11月27日付記事。

---

**調査要旨**　「最大133倍」は、PhoronixがCPUで顔検出モデルを動かし、1秒あたりの画像処理量を比べた結果。AI以外も含む100件超のテストをまとめた値は、EPYC 7601からEPYC 9996への比較で12.1倍だった。いずれもCPUを2基搭載したサーバー同士の比較で、メモリなどの構成も世代間で異なる。 [Phoronixの顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2) ／ [全テストの集計](https://www.phoronix.com/review/amd-epyc-9006-7601/12)

## facts — 公式一次情報で確認した事実

- **発売・出荷時期**　AMDは2017年6月20日に初代EPYC 7000シリーズを発表し、上位機種としてEPYC 7601を掲載した。2026年11月10日（米国時間）には、第6世代EPYC 9006 SP7の一般提供と主要サーバーメーカーからの搭載機出荷を発表した。この2つの発表は約9年5か月離れている。Supermicroも11月11日に搭載サーバーH15の出荷を発表した。 [AMDの2017年発表](https://ir.amd.com/news-events/press-releases/detail/773/amd-epyc-datacenter-processor-launches-with-record-setting-performance-optimized-platforms-and-global-server-ecosystem-support) ／ [AMDの2026年発表](https://ir.amd.com/news-events/press-releases/detail/1305/amd-showcases-6th-gen-amd-epyc-processors-to-lead-next-era-of-ai-and-enterprise-computing) ／ [Supermicroの出荷発表](https://www.supermicro.com/en/pressreleases/supermicro-now-shipping-next-generation-servers-powered-6th-gen-amd-epyc-9006)
- **比較機種の公称仕様**　CPU1基あたりの物理コアは、EPYC 7601が32、EPYC 9996が256、EPYC 9686Fが96。AMDの2026年11月版技術資料では、Veniceの高密度型をZen 6c、高クロック型の基盤をZen 6 Classicとしている。製品仕様一覧の公開日は記載を確認できなかった。 [AMDの初代EPYC仕様](https://ir.amd.com/news-events/press-releases/detail/773/amd-epyc-datacenter-processor-launches-with-record-setting-performance-optimized-platforms-and-global-server-ecosystem-support) ／ [AMDのサーバーCPU仕様一覧](https://www.amd.com/en/products/specifications/server-processor.html) ／ [AMDのアーキテクチャ技術資料](https://docs.amd.com/api/khub/documents/erxSLln6OQx26yZNNjGVzw/content)
- **指標の定義**　OpenVINOの公式文書では、画像系のスループットは1秒あたりに処理できる画像数（FPS）などで表し、レイテンシーは1回の推論にかかる時間として扱う。文章生成モデルの出力速度には別の単位を使う。公式文書は2026年版で、ページの公開日は記載を確認できなかった。 [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)
- **クラウドの提供段階**　Microsoftは2026年11月10日、Venice搭載のAzure HDv2仮想マシンを申請制のプレビューとして発表した。記事の更新日は11月16日。AMDは10月27日、Oracle Cloud Infrastructureの今後のCompute E7に第6世代EPYCを採用すると発表した。 [MicrosoftのHDv2発表](https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/accelerating-ai-data-processing-hpc-and-agentic-workloads-with-azure-hdv2-virtua/4567877) ／ [AMDのOracle協業発表](https://newsroom.amd.com/news/amd-expands-ai-cloud-infrastructure-oracle/)

## claims — 測定者の報告と報道の照合

- **133倍の原典**　Michael Larabelが2026年11月23日11時35分（米国東部標準時、日本時間24日1時35分）にPhoronixで公開。OpenVINOの顔検出テストの設定は `Face Detection FP16-INT8`、実行先はCPU、測定モードは `Throughput`。本文は初代最上位機からZen 6cの最上位機への比較で約133倍と報告しており、機種紹介と照合するとEPYC 7601 2PとEPYC 9996 2Pを指す。 [Phoronixの機種・試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) ／ [顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2)
- **試験条件**　各構成はCPUを2基搭載。旧機はDell PowerEdge R7425とDDR4-2666メモリ512GB、新機はリファレンスサーバーとMRDIMM-12800メモリ2TB。ストレージも異なる。ソフトウェア環境はUbuntu 26.10、Linux 7.3、GCC 15.3で共通。比較値にはコア数やメモリ構成など、サーバー全体の世代差が含まれる。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601)
- **12.1倍と8.7倍**　EPYC 7601 2Pを基準に、100件超のテストの成績を幾何平均で集計すると、EPYC 9996 2Pは12.1倍、EPYC 9686F 2Pは8.7倍とPhoronixは報告した。集計にはAIのほか、科学技術計算や制作系などの処理も含まれる。133倍は顔検出1項目の値。 [Phoronixの集計と用途別結果](https://www.phoronix.com/review/amd-epyc-9006-7601/12)
- **採用情報との照合**　GIGAZINEは2026年11月27日7時（日本時間）に報道。見出しの「AI性能が133倍」より、本文の「顔検出のスループット」のほうが原典に即している。今回の更新点は世代間比較の公開。採用情報のRSS順位25はフィード内の掲載位置で、アプリ順位や報道の広がりを示す指標には使えない。 [GIGAZINEの報道](https://gigazine.net/news/20261127-amd-epyc-performance/) ／ [Phoronixの顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2)

## uncertain_points — 未確認事項と数値の適用範囲

- **元のFPSと細部の測定条件**　Phoronixの本文で133倍の記述を確認した。OpenBenchmarkingの結果ファイルは取得時に403を返し、元のFPSや試行ごとの値から倍率を再計算できなかった。Phoronixの図にはスレッドあたりの比較を示す代替テキストもあるため、本文にある「1コアあたり29倍」は比較機種と分母の対応を確認できるまで保留。実測日と測定国も確認できなかった。公開日時を観測時点として記録する。 [Phoronixの顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2) ／ [OpenBenchmarkingの結果ファイル](https://openbenchmarking.org/result/2611238-PTS-NAPLESVE19)
- **日本での導入可否と価格**　AMD日本語サイトで製品案内と法人向けの問い合わせ窓口を確認した。国内の具体的な構成別価格、在庫・納期、Azure HDv2やOCI Compute E7の日本リージョンでの提供開始日は未確認。世界向けの搭載機出荷、クラウドのプレビュー・採用予定、日本での一般提供はそれぞれ別の情報。 [AMD日本語の製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html) ／ [MicrosoftのHDv2発表](https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/accelerating-ai-data-processing-hpc-and-agentic-workloads-with-azure-hdv2-virtua/4567877) ／ [AMDのOracle協業発表](https://newsroom.amd.com/news/amd-expands-ai-cloud-infrastructure-oracle/)
- **実利用への適用**　構成差のうち、CPUの設計、コア数、メモリ、ソフトウェアの最適化がそれぞれ何倍分を説明するかは未確認。133倍から、生成AIの回答速度、顔検出の精度、AIの学習時間、既存サービスでの採用や体感改善は導けない。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) ／ [OpenVINO公式の性能指標](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)
