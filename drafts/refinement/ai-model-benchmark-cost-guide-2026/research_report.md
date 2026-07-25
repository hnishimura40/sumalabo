# Research Report — AIモデルのベンチマークとコスパ 2026

- 調査時点: 2026-07-25 JST
- 方針: モデル名・提供範囲・価格は一次情報を優先し、評価値は「自社発表」と「第三者」を分離する。

## Anthropic（一次情報）

- Claude Opus 5（2026-07-24発表）は、Anthropicの表現でFable 5の知能に「近い（comes close）」モデル。Fable 5超えとは扱わない。
- Opus 5はMaxのデフォルト、Proで使える最上位モデル。APIは入力$5・出力$25/100万トークンでOpus 4.8と同額。
- Frontier-Bench v0.1、GDPval-AAなどの数値はAnthropic自身の発表。サイバー能力はMythos 5未満。
- Fable 5 APIは入力$10・出力$50/100万トークン。
- Claude Proは米国価格$20/月、Maxは5x $100/月・20x $200/月。地域・税で変動。

## OpenAI（一次情報）

- GPT-5.6はSol（最上位）、Terra（バランス）、Luna（高速・低価格）の3系統。
- 標準ChatGPTの推論表示はMedium / High / Extra High / Pro。TerraとLunaは標準チャットのモデル選択肢ではなく、Work・Codex・APIなどで提供。
- APIはSol $5/$30、Terra $2.50/$15、Luna $1/$6（入力/出力、100万トークン）。
- ChatGPT Plus $20/月、Pro $200/月（米国価格）。
- 5時間制限は2026-07-12に製品責任者がPlus/Business/Pro向けの一時撤廃を告知。2026-07-25時点で終了告知は見当たらないが、公式ヘルプは上限がプラン・システム状況等で動的と説明。恒久撤廃とは書かない。

## Google（一次情報）

- Gemini 3.6 Flashは2026-07-21発表。モデルID `gemini-3.6-flash`、入力コンテキスト1,048,576、最大出力65,536、入力$1.50・出力$7.50/100万トークン。
- Gemini Omniは実在。最初の提供モデルはOmni Flashで、入力から動画などを出すマルチモーダル生成モデル。Geminiアプリ、Flow、YouTube Shorts系へ展開。テキストAIの3階級表とは別枠にする。
- Google AI Proは日本で月額2,900円、5TB、Geminiの上限拡大、Omni Flash、Flow、Notebook等を含む（2026-07-25時点。公式プラン画面は価格を動的表示するため、申込画面を最終確認する）。

## 第三者評価

- LMArena / Chatbot Arenaは匿名のモデル比較に対する利用者投票を集計する。ベンダーが選んだ固定ベンチとは違うが、投票者・質問の偏りや時期の影響を受ける。

## 編集上の線引き

- API料金は標準テキスト料金だけを比較し、キャッシュ、バッチ、長文、ツール料金は表外。
- サブスク料金とAPI従量課金を混同しない。
- Gemini Omniを「Gemini 3.6 Flashの上位版」と扱わない。
- 使い分け実例は個人の運用例として一般化し、サイト制作の自動化や内部体制を推測できる表現を避ける。

