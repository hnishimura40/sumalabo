# Editorial Selection — GPT-5.6 一般公開（Sol / Terra / Luna）

slug: 202607-gpt-5-6-sol-terra-luna-release
記事の主軸: 「GPT-5.6が一般公開。今日からChatGPTで何が使えて、3モデルは何が違うのか」をやさしく噛み砕く。読者判断（どれを使う？）は補助。

## facts（確定・公式ベース）→ Callout kind="facts" に 1:1

- 7/9（現地）に GPT-5.6 が一般提供開始。ChatGPT / Codex / API でグローバル展開、24時間かけて段階ロールアウト
- 3モデル構成: **Sol**（最上位。コーディング・サイバー・科学で最高水準）／**Terra**（バランス型。GPT-5.5同等性能を約半額）／**Luna**（最速・最安）
- ChatGPT では Plus / Pro / Business / Enterprise が Sol を利用可（Pro / Enterprise は Sol Pro も）
- API価格（100万トークン・入力/出力）: Sol $5/$30、Terra $2.5/$15、Luna $1/$6
- 経緯: 6/26 に政府共有の限定パートナーへプレビュー → 政府協議（商務省の追加テスト）を経て一般公開
- 新機能: **max推論モード**（最も長く考える）、**ultraモード**（サブエージェントで並列処理。Terminal-Bench 2.1 で Sol 88.8% → Sol Ultra 91.9%）

## claims（報道ベース・断定しない）→ Callout kind="claims" に 1:1

- 無料ユーザーへの提供範囲の詳細は「詳しい公開範囲は示さず」とする報道あり（断定しない）
- 「Claude が同日に利用制限を全リセット」の報道（対抗との見方）— 触れるなら1行・出典明示

## uncertain（未確定）→ Callout kind="unc" に 1:1

- 日本のユーザー画面での反映タイミング（24時間ロールアウト中のため個人差）
- 無料プランでの利用可否の細部

## 不採用

- **GPT-6が数週間以内との憶測 → 非掲載**（ユーザー指示・推奨に従う）
- ベンチマーク数値の羅列（Terminal-Bench/ExploitBench は ultra の説明とSolの強みの根拠として最小限のみ）
- 円換算の断定（$表記を主、円は書かない）

## 内部リンク

- /articles/202607-openai-gpt-5-6-chatgpt-work/（直接の前報: ChatGPT Work と GPT-5.6 発表）
- /articles/202607-claude-fable-5-free-extension-july13/（指定: fable5 無料枠延長）
- /articles/202607-claude-fable-5-usage-credits-switch/（指定: usage credits）

## v3コンポーネント設計（article_components_v3.md 準拠）

- Summary30: 冒頭に要点4つ（GA/3モデル/プラン/価格）
- NumCards: 「$5/$30」「$2.5/$15」「$1/$6」…ではなく「3モデル」「7/9」「24時間」等の読者向け数字3枚 ＋ 比較表（3モデル×価格・特徴）は ComparisonTable でなく従来tableでも可（4列以内なら ComparisonTable）
- Timeline: 6/26 プレビュー → 7/9 GA（hot）→ 24時間ロールアウト→日本反映
- CharacterBubble: ひまり（curious→aha）／らぼまる（point・smile・worried=unc併設）
- Chip: 文中確度ラベル（1段落2個まで）
- スライド8枚 + ライトボックス + ## 参考情報（従来どおり）

## サムネ方針（新方針・衣装をテーマで変える）

- 型: 活用シーン/お披露目（発表会型）
- 装い: **発表会・ステージ・スポットライト系**。ひまり=ジャケット（プレゼン司会風・露出控えめ）、らぼまる=服なし・ステージや3モデルカードの小道具
- 文字: 大見出し「GPT-5.6、一般公開」＋サブ「3モデルどう違う？」
- 認識アンカー不変・実在ロゴなし
