# すまラボ 優先12記事 管理表

このファイルは、すまラボで最初に整備する12記事のslug、type、category、priority、内部リンク導線、キャラクター使用、サムネイル方針を固定するための管理表です。

まだ記事本文の作成、既存txt記事の移動、MDX化は行いません。今後MDX化するときは、この表と `docs/article_frontmatter_template.md` をもとにfrontmatterを作成します。

## type運用メモ

この管理表では、依頼内容に合わせてtypeを以下の3種類で固定します。

- `foundation`: 土台記事
- `revenue`: 収益記事
- `news`: 流入記事・話題解説記事

Astro schemaでも、流入記事typeは `news` に統一します。旧type名は今後使わない方針です。

## 優先12記事一覧

| No | 記事タイトル | slug | type | category | categorySlug | priority | 想定読者 | 記事の目的 | 先に結論 | 主な内部リンク先 | 収益導線 | 推奨キャラクター使用 | 推奨サムネイル方針 | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | iPhoneとAndroid、結局どっちが向いている？ | `iphone-vs-android` | foundation | スマホの選び方 | smartphone | 1 | 次のスマホ選びでiPhoneかAndroidか迷っている人 | OS選びの判断軸を整理し、端末選び記事へ送る | 迷ったら「長く安心して使いたい人はiPhone」「価格や選択肢を重視する人はAndroid」が基本。ただし使っているサービスや予算で変わる。 | `what-is-ai-smartphone`, `used-smartphone-guide`, `smartphone-under-30000-guide`, `smartphone-under-30000-comparison` | 3万円台スマホおすすめ比較、中古スマホ選び、将来のスマホ購入導線 | `duo_talk_half.webp`, `himari_question_icon.webp`, `labomaru_normal_icon.webp` | iPhoneとAndroid端末を左右に並べ、ひまりが迷い、らぼまるが判断軸を示す構図 | planned |
| 2 | eSIMとは何か。初心者向けにやさしく解説 | `what-is-esim` | foundation | 通信費を下げる | mobile-plan | 1 | eSIMという言葉は聞いたが、SIMカードとの違いが分からない人 | eSIMの基本を理解させ、格安SIM・乗り換え記事へ送る | eSIMは物理カードではなく、スマホ本体に通信契約を入れる仕組み。便利だが対応端末と設定手順の確認が必要。 | `what-is-cheap-sim`, `cheap-sim-comparison`, `rakuten-mobile-vs-ahamo` | 格安SIMおすすめ比較、楽天モバイルとahamo比較 | `duo_talk_half.webp`, `himari_question_icon.webp`, `labomaru_normal_icon.webp` | スマホ画面の通信設定とSIMカードの違いを、ひまりとらぼまるが見比べる構図 | ready |
| 3 | 格安SIMとは何か。大手と何が違う？ | `what-is-cheap-sim` | foundation | 通信費を下げる | mobile-plan | 1 | 通信費を下げたいが、格安SIMに不安がある人 | 格安SIMの安さの理由と注意点を整理し、比較記事へ送る | 格安SIMは料金を下げやすい一方、混雑時の速度・店舗サポート・初期設定に違いが出る。安さだけでなく使い方で選ぶ。 | `what-is-esim`, `cheap-sim-comparison`, `rakuten-mobile-vs-ahamo` | 格安SIMおすすめ比較、楽天モバイルとahamo比較 | `himari_question_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | スマホ料金明細を見ながら、安くなる理由と注意点を整理する構図 | planned |
| 4 | AIスマホとは何か。何が便利で何がまだ微妙？ | `what-is-ai-smartphone` | news | ニュースをかみくだく | news | 1 | AIスマホという言葉が気になるが、自分に必要か分からない人 | AIスマホの実用性と過度な期待を分け、スマホ選び記事へ送る | AIスマホは写真編集、要約、翻訳などで便利になり始めているが、まだ全員が買い替える決め手になるとは限らない。 | `iphone-vs-android`, `smartphone-under-30000-guide`, `smartphone-under-30000-comparison` | 3万円台スマホおすすめ比較、将来のAI対応スマホ比較 | `himari_device_half.webp`, `labomaru_normal_icon.webp` | ひまりがAI機能付きスマホを見ながら、便利な点とまだ微妙な点を比較する構図 | planned |
| 5 | 中古スマホは危ないのか。失敗しにくい選び方 | `used-smartphone-guide` | foundation | スマホの選び方 | smartphone | 2 | 中古スマホを安く買いたいが、バッテリーや赤ロムが不安な人 | 中古スマホのリスクと確認ポイントを整理し、予算別比較へ送る | 中古スマホは危ない商品もあるが、販売元・バッテリー状態・ネットワーク利用制限・保証を確認すれば失敗は減らせる。 | `iphone-vs-android`, `smartphone-under-30000-guide`, `smartphone-under-30000-comparison` | 3万円台スマホおすすめ比較、中古購入先比較の将来導線 | `labomaru_worried_icon.webp`, `himari_question_icon.webp`, `duo_guide_half.webp` | 中古スマホをチェックリストで確認するらぼまると、不安そうに見るひまり | planned |
| 6 | 3万円台スマホの選び方 | `smartphone-under-30000-guide` | foundation | スマホの選び方 | smartphone | 2 | 予算3万円台でスマホを探している人 | 価格帯の妥協点と重視すべき項目を整理し、比較記事へ送る | 3万円台スマホは全部入りではないため、カメラ・処理性能・電池・防水・おサイフのどれを優先するか決めるのが大事。 | `iphone-vs-android`, `used-smartphone-guide`, `smartphone-under-30000-comparison` | 3万円台スマホおすすめ比較 | `labomaru_chart_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | 3万円台スマホを複数並べ、価格と重視ポイントを整理する構図 | planned |
| 7 | USB-C充電器の選び方 | `usb-c-charger-guide` | foundation | 周辺機器・ガジェット | gadgets | 2 | USB-C充電器のW数やPDがよく分からない人 | 充電器選びの基礎を整理し、おすすめ比較へ送る | USB-C充電器は端子だけで選ばず、必要なW数、USB PD対応、ポート数、安全性を見て選ぶ。 | `power-bank-guide`, `usb-c-charger-comparison` | USB-C充電器おすすめ比較 | `labomaru_chart_icon.webp`, `himari_question_icon.webp`, `duo_guide_half.webp` | 充電器、スマホ、ノートPCを並べ、必要W数をらぼまるが整理する構図 | planned |
| 8 | モバイルバッテリーの選び方 | `power-bank-guide` | foundation | 周辺機器・ガジェット | gadgets | 2 | 外出用バッテリーの容量や出力で迷う人 | 容量・出力・持ち運びやすさの判断軸を整理し、周辺機器導線へ送る | モバイルバッテリーは容量だけでなく、出力、重さ、充電速度、安全機能を合わせて見ると失敗しにくい。 | `usb-c-charger-guide`, `usb-c-charger-comparison` | USB-C充電器おすすめ比較、将来のモバイルバッテリー比較 | `labomaru_worried_icon.webp`, `labomaru_chart_icon.webp`, `duo_guide_half.webp` | 外出先でスマホとバッテリーを使い、容量と重さのバランスを示す構図 | planned |
| 9 | 格安SIMおすすめ比較 | `cheap-sim-comparison` | revenue | 通信費を下げる | mobile-plan | 3 | 自分に合う格安SIMを具体的に選びたい人 | 料金・通信品質・サポートの比較で候補を絞る | 最安だけで選ばず、使うデータ量、通話、店舗サポート、混雑時速度で選ぶと失敗しにくい。 | `what-is-cheap-sim`, `what-is-esim`, `rakuten-mobile-vs-ahamo` | 格安SIM申込、乗り換え導線 | `labomaru_chart_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | 複数の料金プランを比較表で見せ、らぼまるが選び方を示す構図 | planned |
| 10 | 楽天モバイルとahamoはどっち向き？ | `rakuten-mobile-vs-ahamo` | revenue | 通信費を下げる | mobile-plan | 3 | 楽天モバイルとahamoで迷っている人 | 使い方別に向き不向きを整理し、申込判断に近づける | 楽天モバイルは料金の伸縮や楽天経済圏重視の人、ahamoはドコモ回線の安心感と分かりやすさを重視する人に向きやすい。 | `what-is-cheap-sim`, `what-is-esim`, `cheap-sim-comparison` | 楽天モバイル・ahamo申込、格安SIM比較導線 | `labomaru_chart_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | 楽天モバイルとahamoの2択を左右比較し、利用シーン別に分ける構図 | planned |
| 11 | 3万円台スマホおすすめ比較 | `smartphone-under-30000-comparison` | revenue | スマホの選び方 | smartphone | 3 | 3万円台で具体的なおすすめ機種を知りたい人 | 予算内でおすすめ候補を比較し、購入判断を助ける | 3万円台では万能機を探すより、カメラ・ゲーム・電池・防水など自分の優先軸に合う機種を選ぶのが正解。 | `smartphone-under-30000-guide`, `used-smartphone-guide`, `iphone-vs-android` | スマホ購入・中古スマホ導線 | `labomaru_chart_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | 3万円台スマホを比較表と一緒に並べ、用途別おすすめを示す構図 | planned |
| 12 | USB-C充電器おすすめ比較 | `usb-c-charger-comparison` | revenue | 周辺機器・ガジェット | gadgets | 3 | 具体的に買うUSB-C充電器を選びたい人 | W数・ポート数・安全性で候補を比較し、購入判断を助ける | 充電器は安さだけでなく、必要W数、同時充電、PSEなどの安全性、持ち運びやすさで選ぶ。 | `usb-c-charger-guide`, `power-bank-guide` | USB-C充電器購入導線、周辺機器比較導線 | `labomaru_chart_icon.webp`, `labomaru_worried_icon.webp`, `duo_guide_half.webp` | 複数のUSB-C充電器をW数・ポート数別に並べた比較構図 | planned |

## 優先順位メモ

- 第1陣: No.1〜4
- 第2陣: No.5〜8
- 第3陣: No.9〜12

最初に土台記事を整え、その後に収益記事へ内部リンクをつなぐ形にします。収益記事を先に作る場合でも、必要な土台記事への戻りリンクを必ず用意します。
