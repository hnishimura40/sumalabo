# すまラボ 初期サムネイル案・参考プロンプト

これはCLIが記事素材から作る初期サムネイル案です。
実運用では、本文・ブログ化用資料一式を作ったあと、台本チャット内で最終版サムネイル画像生成プロンプトを作ります。
最終版プロンプトは drafts/materials/{slug}.thumbnail-prompt.md に保存します。

サムネイル画像生成は、毎回サムネイル生成専用の新規ChatGPTチャットで行います（使い回しチャットや台本チャットの中では生成しません）。
新規ChatGPTチャット: https://chatgpt.com/

1200x630px、ブログ/YouTubeサムネイル向け、16:9に近い横長構図。

## 記事
Apple、裸眼3D「空間iPhone」開発か？とは？普通の人向けに要点を整理

## 1枚で伝えたい芯
iPhoneニュースの細かなスペック紹介ではなく、「普通の人が今知っておくと判断しやすい変化」を1枚で見せる。

## 雰囲気
期待感 / まじめ / 少し驚き

## 主役
新しいiPhoneの話題を想像させるスマホシルエットと選び方の分岐

## キャラクターの使い方
- らぼまる: 画面端で要点を整理する案内役。主役を邪魔しない小さめ配置。
- ひまり: 読者目線で『これ何？』と気づく表情。必要なら片側だけに配置。
- 補足: 必ず2人固定にしない。ニュースの主役を中心にし、キャラクターは理解補助にする。

サムネイル構図方針:
- 「ひまりが質問、らぼまるが説明」の固定構図にしない
- 2人とも記事内容を理解した後の反応を見せる
- 良いニュースなら前向きな反応、悪いニュースなら悲しむ・心配する反応、判断が分かれる話なら慎重・困惑など、話題に応じたリアクションにする

既存キャラクター素材を参照する前提。候補:
- public/images/characters/duo_guide_half.webp
- public/images/characters/duo_talk_half.webp
- public/images/characters/himari_device_half.webp
- public/images/characters/himari_question_icon.webp
- public/images/characters/labomaru_normal_icon.webp
- public/images/characters/labomaru_chart_icon.webp
- public/images/characters/labomaru_worried_icon.webp
- assets/characters/full/himari_device_full.webp
- assets/characters/full/labomaru_normal_full.webp
- assets/characters/half/duo_talk_half.webp
- assets/characters/half/duo_guide_half.webp

## 入れたい視覚モチーフ
- スマホシルエット
- 選択肢の分岐
- 比較ライン
- Apple風ロゴは使わない
- 大きな短文見出し
- ミント/ティール系アクセント
- チェックマーク
- やわらかい光

## 文字案
見出し候補:
- Apple、裸眼3D空間iPhon…って何？
- iPhoneニュースを整理
- 普通の人はここだけ確認

補足文候補:
- 何が変わるのかをやさしく解説
- 買う・待つ・様子見の判断材料に
- iPhoneの話題をかみくだく

## デザイン指示
- すまラボらしいミント/ティール系アクセント
- やさしく親しみやすいが、安っぽくしない
- ニュースのテーマそのものを主役にする
- 毎回同じテンプレ構図にしない
- 文字は短く、大きく、スマホでも読める量にする
- キャラクターを使う場合も、記事理解を助ける役に留める
- 実在企業ロゴは入れない
- 元記事画像や実在写真を再現しない
- 煽りすぎず、「気になる」「理解できる」方向で見せる

## 避けること
- 実在企業ロゴ
- 元記事画像コピー
- 文字詰め込み
- 毎回同じ構図
- 煽りすぎる表現
- 細かすぎるスペック表現
