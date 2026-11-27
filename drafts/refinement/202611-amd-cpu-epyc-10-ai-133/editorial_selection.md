# Editorial Selection — AMD EPYCの顔検出テスト

判定: 限定採用

カテゴリ候補「ニュースをかみくだく」

## 採用理由と記事の問い

**見出し案**　AMD EPYCの「133倍」は、AIの何が速くなった数字？

**AIの主題**　約9年離れた2世代のサーバーで顔検出AIが1秒に処理できた画像の枚数を比べ、「133倍」がどの作業に当てはまるのかを解きほぐす。

**なぜ今注目するか**　AMDが2026年11月に第6世代EPYCの一般提供を発表し、Phoronixが日本時間11月24日に初代との比較を公開した。GIGAZINEは11月27日に「AI性能が133倍」と報じた。今取り上げる理由は、新旧の比較が公開され、目を引く数字の測定対象を一次資料までたどれることにある。広い報道の盛り上がりは確認できていない。 [AMDの提供発表](https://ir.amd.com/news-events/press-releases/detail/1305/amd-showcases-6th-gen-amd-epyc-processors-to-lead-next-era-of-ai-and-enterprise-computing) ／ [Phoronixの比較](https://www.phoronix.com/review/amd-epyc-9006-7601) ／ [GIGAZINEの報道](https://gigazine.net/news/20261127-amd-epyc-performance/)

## 30秒まとめの設計

1. **これは何？**　AMDのEPYCは、サーバーで計算を担うCPUの製品名。今回の比較では、CPUで画像の中から顔を見つけるAIを動かした。
2. **何があった？**　Phoronixが初代と第6世代の上位機種を、それぞれCPUを2基積んだサーバーで比較した。顔検出テストで、新しい構成が1秒に処理できた画像の枚数は旧構成の約133倍だった。
3. **誰に関係ある？**　大量の画像を処理する仕組みの導入や更新を考える人には、何を測れば役立つかが分かる。普段の生成AIや手元のパソコンの使い方を変える材料は、今回の測定からは得られない。
4. **結局どうなの？**　133倍は、特定の顔検出テストで一度に多くの画像を処理できるようになった度合い。自分の用途に当てはめるときは、同じ作業を測っているか、知りたいのが1秒あたりの処理量か1件の待ち時間かを確かめる。

## 根拠と採用範囲

- **公式発表・仕様**　AMDによる初代の発表は2017年6月20日、第6世代の一般提供発表は2026年11月10日（米国時間）。約9年5か月は発表間隔として扱う。比較機種のコア数はCPU1基あたり旧32、新256。機種による構成差を示すために使う。 [AMDの初代発表](https://ir.amd.com/news-events/press-releases/detail/773/amd-epyc-datacenter-processor-launches-with-record-setting-performance-optimized-platforms-and-global-server-ecosystem-support) ／ [AMDの第6世代発表](https://ir.amd.com/news-events/press-releases/detail/1305/amd-showcases-6th-gen-amd-epyc-processors-to-lead-next-era-of-ai-and-enterprise-computing) ／ [AMDの仕様一覧](https://www.amd.com/en/products/specifications/server-processor.html)
- **測定者の報告**　約133倍は、EPYC 7601とEPYC 9996をそれぞれ2基搭載し、CPU上でOpenVINOの `Face Detection FP16-INT8` を実行した際の処理量。メモリ構成も異なる。AI以外も含む100件超のテストの集計では、同じ2構成の比較は12.1倍だった。12.1倍は試験項目によって差の出方が変わることを示す補足に限り、顔検出の倍率と測定対象を添えて示す。 [Phoronixの試験環境](https://www.phoronix.com/review/amd-epyc-9006-7601) ／ [顔検出テスト](https://www.phoronix.com/review/amd-epyc-9006-7601/2) ／ [全テストの集計](https://www.phoronix.com/review/amd-epyc-9006-7601/12)
- **未確認事項**　引き継ぎ調査では、元の測定値を取得できず、133倍の再計算には至っていない。倍率はPhoronixの報告として扱う。「1コアあたり29倍」は比較の分母が未確認のため採用を見送る。国内の構成別価格・納期や、国内クラウドでの一般提供時期も未確認。ニュースの更新点は比較の公開であり、国内での提供開始や購入期限の変更は確認されていない。 [Phoronixの測定記事](https://www.phoronix.com/review/amd-epyc-9006-7601/2) ／ [OpenBenchmarkingの結果ページ](https://openbenchmarking.org/result/2611238-PTS-NAPLESVE19) ／ [AMDの日本語製品案内](https://www.amd.com/ja/products/processors/server/epyc/9006-series.html)

## 読者翻訳設計

### 主題の一言説明

新旧の業務用コンピューターで、画像から顔を見つけるAIが1秒に何枚処理できるかを測り、「133倍」の意味がどこまで及ぶかを考える話。

### 関係がある人

大量の画像を処理する仕組みの導入や更新を検討する人。比較結果を判断に使うなら、自分が使う画像や処理方法に近い試験を探し、一定時間内に何枚さばけるかと、画像1枚でどのくらい待つかを確認する。AIの性能ニュースを読む人にも、数字が表す作業と測り方を確かめる手がかりになる。

### あまり関係がない人

普段使う生成AIの回答待ちが短くなるか知りたい人や、手元のパソコンの買い替えを考えている人。今回の測定だけで、サービスの選択や買い替え時期を変える必要はない。

### 専門用語

- AI → 今回は、画像を見て顔が写っている場所を探す仕組み。
- AMD → 比較に使われた計算用の部品を設計した会社。
- EPYC → AMDが業務用コンピューター向けに出している計算用部品のシリーズ名。
- サーバー → 大量のデータ処理や、利用者からの依頼を引き受けるコンピューター。
- CPU → コンピューターで計算や命令の実行を担う部品。
- 顔検出 → 画像の中で顔が写っている場所を見つける処理。
- ベンチマーク → 決められた作業を行い、処理量や時間を測る性能試験。
- OpenVINO → 学習済みのAIをコンピューターで動かすためのソフトウェア。
- コア → CPUの中で計算を担当する部分の一つ。
- メモリ → 処理に使うデータを一時的に置いておく場所。
- 生成AI → 入力された指示などに応じて、文章や画像を作る仕組み。

### 事実から言えること

- 試験した顔検出では、新構成が同じ1秒間に処理できた画像の枚数は、旧構成の約133倍だったと測定者が報告している。
- 1秒あたりの処理量は、画像を次々と処理する用途の目安になる。画像1枚の処理が終わるまでの待ち時間を知るには、別の測定値が要る。 [OpenVINO公式の指標説明](https://docs.openvino.ai/2026/about-openvino/performance-benchmarks.html)

### 事実から言えないこと

- 顔検出の精度が上がった、画像1枚の待ち時間が133分の1になった、生成AIの回答やAIの学習が133倍速くなった、とは言えない。
- CPUの設計変更だけで何倍になったか、普段使うサービスがこのCPUを採用しているか、国内でいついくらで導入できるかは、この測定からは分からない。
