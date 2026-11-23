# research_report.md — Research Pass

- 題材　MetaのAIエージェント「Muse」は何ができる？　ChatGPTやGeminiとの違い、注意点を解説
- 保存先　`drafts/refinement/202611-meta-ai-muse-chatgpt-gemini/research_report.md`
- 作成　すまラボ夜間本文の独立Codexセッション
- 確認日　2026年11月23日（日本時間）。公開資料を照合。日本のアカウントでの実機検証や購入画面の確認は未実施。
- 調査の起点　ITmedia Mobile、2026年11月22日11時14分公開。[1ページ目](https://www.itmedia.co.jp/mobile/articles/2611/22/news005.html)・[2ページ目](https://www.itmedia.co.jp/mobile/articles/2611/22/news005_2.html)

---

## 調査要約

MetaのMuseは2026年10月23日に日本で提供が始まった。目標を伝えると、情報収集、資料の作成、対応サイトへの入力などを進める。アプリを閉じた後も作業を続けられ、定期実行も設定できる。利用量に上限のある無料枠がある。11月6日には、予定表や進捗ボードなどをMuse内に作れる「スペース」も提供地域全体に追加された。[Metaの日本提供発表](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[Metaの定期タスクの案内](https://www.meta.com/en-gb/help/superintelligence/1484325780075655/)・[Metaのスペース発表](https://about.fb.com/news/2026/11/introducing-spaces-customize-muse-app/)

ChatGPT WorkとGeminiのタスク機能にも、複数の手順を進めて成果物を作る機能がある。日本のGeminiでは契約なしでタスクを使え、ChatGPTにも無料で使える時間指定タスクがある。比較の軸は、**いつ起動できるか、どのサービスを読み書きできるか、送信・予約・購入のどこで本人確認が入るか**。無料枠の有無だけでは、同じ作業を任せられるか判断できない。[OpenAIのWork発表](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)・[OpenAIの定期タスクの案内](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt)・[Googleのタスク機能の案内](https://support.google.com/gemini/answer/17094507?hl=ja-JP)

## facts

### Museの提供範囲とできること

- **日本提供。** Metaの2026年9月8日付の発表は米国での提供開始を明記。10月23日付の日本発表では、日本が9月に先行した北米以外で初の提供地域としている。日本の開始時の利用先はiOS、Android、Web版 `muse.ai`。Appleの日本向け掲載ページでも日本語対応を確認した。[Metaの初回発表（9月8日、11月10日更新）](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)・[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[日本のApp Store（11月23日確認）](https://apps.apple.com/jp/app/muse-from-meta/id6760173601)
- **単発の作業と定期実行。** Metaは、利用者ごとのクラウド上の作業環境で、アプリを閉じた後も作業を継続できると説明。対応するWebサイトを開く、入力欄を埋める、文書・表計算ファイル・簡易Webツールを作る、日次・週次の作業を設定するなどが案内されている。作ったファイルは作業環境に保存できる。スペースは文章で要望を伝えて作るMuse内の専用画面で、Metaは11月6日付で提供済みの全地域への追加を発表した。[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[成果物のヘルプ（11月23日確認）](https://www.meta.com/help/superintelligence/2074655449783957/)・[定期タスクのヘルプ（11月23日確認）](https://www.meta.com/en-gb/help/superintelligence/1484325780075655/)・[スペースの発表（11月6日）](https://about.fb.com/news/2026/11/introducing-spaces-customize-muse-app/)
- **日本向けの外部サービス連携。** MetaはGmail、Googleカレンダー、Instagramを案内。マネーフォワードホームは10月26日に「マネーフォワード ME」との連携開始を発表した。本人の同意に基づく参照専用で、明細や資産・負債を使った支出整理や計画づくりに対応する。金融商品の売買、振込、出金は連携対象外。マネーフォワード MEはChatGPT向けの連携手順も案内している。[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[マネーフォワードの開始発表（10月26日）](https://corp.moneyforward.com/news/release/service/20261026-mf-press-2/)・[マネーフォワードのChatGPT連携案内（11月23日確認）](https://support.me.moneyforward.com/hc/ja/articles/61486406210841)
- **無料枠と有料プラン。** Metaの公開ヘルプには上限付き無料枠と、Power月額20米ドル、Maximum月額100米ドルの記載がある。有料プランは週あたりの利用枠が増える。日本で支払う円額は `claims` を参照。Metaは特典・提供条件が地域やアカウントによって変わり、契約前に表示されると案内している。[Metaのサブスクリプション案内（11月23日確認）](https://www.meta.com/ja-jp/help/subscriptions/1021145227643680/)
- **製品名とモデル名。** Museは作業を依頼するサービス。Muse Spark、Muse Wonder、Muse Wonder FullはAIモデルの名前。Metaは10月12日にWonderシリーズを発表し、消費者向けMuseでは契約者から順次使う方針を示した。11月6日には、Wonderを使って訓練した専用モデルをMuseとMeta AIへ順次導入すると発表した。日本の各プランでタスクごとに実際に使われるモデルの確定には、別の根拠が必要。[MetaのWonderシリーズ発表（10月12日、10月13日更新）](https://about.fb.com/news/2026/10/introducing-muse-wonder-models/)・[Meta AI Researchの専用モデル発表（11月6日）](https://research.meta.ai/blog/specialized-models-for-muse-and-metaai)

### ChatGPT・Geminiとの比較

| 比較対象 | 頼める作業 | 日本での利用条件 |
|---|---|---|
| Muse | 対応サイトでの調査やフォーム入力、外部サービスとの連携、成果物の作成、定期実行。メール送信や購入などに承認の仕組みがある。 | 日本ではWeb・iOS・Androidで提供開始。上限付き無料枠あり。[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[Metaの定期タスクの案内（11月23日確認）](https://www.meta.com/en-gb/help/superintelligence/1484325780075655/) |
| ChatGPT Work・ChatGPTの定期タスク | Workは連携アプリやファイルを使う調査、資料作成、対応サイトでの操作を進める。対象プランのWorkではGmailの新着などをきっかけに作業を始められる。 | 日本はChatGPTの対応地域。Web・モバイルのWorkとそのクラウドブラウザは対象有料プラン向けで、Free・Goは対象外。ChatGPTの時間指定タスクはFreeでも使え、有効枠は3件、繰り返しは1日1回まで。[OpenAIのWork発表（7月9日）](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)・[対応地域](https://help.openai.com/en/articles/7947663-chatgpt-and-openai-api-supported-countries-and-territories)・[クラウドブラウザ](https://help.openai.com/en/articles/20001280-using-cloud-browser-in-chatgpt)・[定期タスク（各11月23日確認）](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt) |
| Geminiのタスク機能（Gemini Task） | Googleのアプリや対応サイトを使う複数手順の作業、資料作成、定期実行。Googleは試験提供時の名称「Gemini Spark」を「Task」に変更したと説明している。 | 日本はGoogle AI契約なしでも対象。18歳以上、個人のGoogleアカウント、履歴オンが条件。契約なし・AI Plusは大まかな時間帯で1日1回まで。Pro・Ultraは時刻や頻度の指定、Gmailの条件に合う受信をきっかけにした実行などに対応。[Googleのタスク機能](https://support.google.com/gemini/answer/17094507?hl=ja-JP)・[名称変更の案内](https://support.google.com/gemini/answer/17094507?co=GENIE.Platform%3DDesktop&hl=en)・[スケジュールの条件（各11月23日確認）](https://support.google.com/gemini/answer/17094710?co=GENIE.Platform%3DDesktop&hl=ja-JP) |

ChatGPTで継続的に仕事を任せる比較対象には、クラウド上の専用環境で動く「dot」もある。個人向けは18歳以上の対象地域のProと一部Plusで、Plusは段階展開中。米国のPro利用者などを対象とする購入機能ChatGPT Walletは、日本の条件に含めない。旧「ChatGPTエージェント」のヘルプは概要で提供終了を告知し、同じページに旧モードの操作・上限の記述が残る。現行の比較にはWorkの資料を使う。[OpenAIのdotの案内（11月23日確認）](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)・[Wallet発表（11月13日）](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)・[旧モードの案内（11月23日確認）](https://help.openai.com/ja-jp/articles/11752874-chatgpt-agent)

### Museを使う前に確認できる設定

- **モデル改善への利用。** Metaのヘルプでは初期設定がオン。設定の「データコントロール」で変更でき、オフにすると過去のやり取りも今後のモデル開発・改善の利用対象から外れると説明している。会話と専用環境内のデータをMetaの広告システムと共有しないという説明は、モデル改善の設定とは別に確認できる。専用環境へのデータ保存や、リンクしたサービスとのデータのやり取りは設定項目ごとに確認する。[Metaのプライバシー・安全性の案内（11月23日確認）](https://www.meta.com/ja-jp/help/superintelligence/1047255454427887/)
- **操作の承認と連携権限。** Metaはメール送信や購入などで利用者に確認する設計と説明している。確認が入る範囲は操作、連携先、既定の権限設定により変わる。連携先ごとの権限変更・解除と活動履歴の確認が可能。外部文書やメールに紛れた指示でAIが意図しない処理に誘導されるリスクもMeta自身が説明している。送信時は宛先・本文・添付、予約・購入時は日程・数量・金額を確認する、という具体例に落とし込める。[Metaの承認と権限の案内（11月23日確認）](https://www.meta.com/ja-jp/help/superintelligence/1385290430137537/)・[Metaのプライバシー・安全性の案内（11月23日確認）](https://www.meta.com/ja-jp/help/superintelligence/1047255454427887/)

## claims

- **円建て料金。** ITmediaは11月22日付で、Web申込時はPower月額2,799円・Maximum月額13,990円、アプリ内課金ではPower月額3,499円・Maximum月額16,990円と報道している。掲載された比較画像の対象はiOSとWeb。Android側の購入画面の裏取りは取れていない。金額を使う場合は媒体・掲載日・申込経路を併記し、支払額は各経路の契約画面で確認する扱いとする。[ITmedia Mobile（11月22日）](https://www.itmedia.co.jp/mobile/articles/2611/22/news005.html)・[Metaの登録案内（11月23日確認）](https://www.meta.com/ja-jp/help/subscriptions/1627861775532967/)
- **利用例と容量。** ITmedia筆者は無料枠で、Googleカレンダーの予定を表示する案件管理画面を作ったと報告。これは筆者の事例。記事中の約100GBという作業環境の容量は第三者の報告で、計測条件とMetaによる仕様の裏付けは未確認。[ITmedia Mobile（11月22日）](https://www.itmedia.co.jp/mobile/articles/2611/22/news005.html)
- **ベンチマーク。** Meta AI Researchは11月6日付で、自社の複数課題をまとめたPersonal Superintelligence Indexで、当時のMuse向けモデルが47％、従来モデルが38％と報告した。測定対象は新旧のMuse向けモデル。実測日、日本語特化の結果、国別内訳、比較した各モデルの厳密な版名は同発表で確認できない。10月公表のWonder／Wonder Fullのモデル資料は、別のモデル評価で、最大の推論設定などの測定条件を記載している。両資料の数字から、日本の無料枠の性能やChatGPT・Geminiとの実サービスの優劣は判定できない。[Meta AI Researchの新旧比較（11月6日）](https://research.meta.ai/blog/specialized-models-for-muse-and-metaai)・[Wonderのモデル資料](https://research.meta.ai/static/muse-wonder-model-card)

## uncertain_points

| 論点 | 確認状況と扱い |
|---|---|
| 円建て料金・無料枠の上限 | 公式の公開ヘルプでは米ドル表記と無料利用に上限があることを確認。日本の現在のWeb・iOS・Android別円額と、無料枠の具体的な上限・更新周期は未確認。[Metaのサブスクリプション案内（11月23日確認）](https://www.meta.com/ja-jp/help/subscriptions/1021145227643680/) |
| メルカリ・チケットぴあ | Metaは10月23日付で連携を進めると発表。11月23日の確認範囲では、開始日・使える操作範囲を示す一次資料は見つからなかった。出品・購入・チケット申込を現行機能として扱う根拠はない。[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/) |
| 海外発表の追加機能 | 高度な音声、英語のみのRealtime Avatar、Muse独自のメールアドレスは、日本発表で提供状況を別途案内とされた。独自メールの一般向けヘルプはあるが、日本の個別提供条件は未確認。日本のAIグラス対応もMeta Connectの日本向け発表では未定。[Meta Connect（9月24日）](https://about.fb.com/ja/news/2026/09/meta-connect-2026-everything-we-announced/)・[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[独自メールのヘルプ（11月23日確認）](https://www.meta.com/help/superintelligence/1149305437517250/) |
| Metaからも見えない専用環境 | 通常のMuse Secure VMは利用者ごとに隔離。Metaからも内容を見られない設計のMuse Confidential VMは、11月23日に確認した公式ヘルプで将来の選択肢とされ、日本での提供開始は未確認。[Metaのプライバシー・安全性の案内（11月23日確認）](https://www.meta.com/ja-jp/help/superintelligence/1047255454427887/) |

## 採用情報との照合

- **時系列。** 11月22日はITmediaの解説公開日。日本でのMuse提供開始は10月23日、スペースの提供発表は11月6日。選定データの「提供開始」「料金」「設定」は解説の論点として裏付けられるが、11月22日に値下げや設定変更があったことを示す一次資料は確認していない。[ITmedia Mobile（11月22日）](https://www.itmedia.co.jp/mobile/articles/2611/22/news005.html)・[Metaの日本提供発表（10月23日）](https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/)・[スペースの発表（11月6日）](https://about.fb.com/news/2026/11/introducing-spaces-customize-muse-app/)
- **掲載面とアプリ順位。** 選定データの `publisherCount: 3` はITmediaの記事、同記事を載せたYahoo!ニュース、ITmediaのRSSという3件。独立した3媒体による取材の裏付けには使えない。Google News技術欄13位は選定データ上の2026年11月23日4時30分ごろ（日本時間）の掲載位置。一方、Apple公式の日本ストアで同日4時32分ごろに確認した**iPhone向け「仕事効率化」の無料アプリ**の表示は、Muse from Metaが1位、ChatGPTが2位、Google Geminiが3位だった。この順位は当該ストア・カテゴリの一時点の表示で、利用者数、継続率、モデル性能、順位が動いた原因は確認できない。[ITmedia Mobile（11月22日）](https://www.itmedia.co.jp/mobile/articles/2611/22/news005.html)・[Appleの日本向け無料アプリランキング（11月23日確認）](https://apps.apple.com/jp/iphone/charts/6007?chart=top-free)
