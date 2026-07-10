# Research Report — GPT-5.6 一般公開（Sol / Terra / Luna）

日付: 2026-07-10（JST）／ 調査主体: Claude（Web実取得）＋ユーザー提示メモとの照合

## 一次情報・公式

- **OpenAI 公式（プレビュー発表）**: https://openai.com/index/previewing-gpt-5-6-sol/
  - 6/26（現地）に GPT-5.6 シリーズを米政府と調整した限定プレビューとして発表
- **OpenAI Help Center**: https://help.openai.com/en/articles/20001325-a-preview-of-gpt-56-sol-terra-and-luna
  - （直接取得は403。検索スニペットで、7/9 GA・ChatGPT/Codex/API・24時間ロールアウトを確認）
- **OpenAI Developer Community（公式アナウンス）**: https://community.openai.com/t/introducing-gpt-5-6-series-sol-terra-and-luna/1384931
  - 「Coming July 9 10am PT」

## 主要報道・二次情報

- **Engadget**: https://www.engadget.com/2210308/openai-rolls-out-gpt5-6-july-9/
  - 7/9 に Sol / Luna / Terra の3種を一般公開。API価格 Sol $5/$30、Terra $2.50/$15、Luna $1/$6（100万トークン・入力/出力）
  - 政府経緯: 最強モデルは公開30日前に政府審査に提出する枠組み。商務省の追加テストを経て一般公開許可
- **DataCamp**: https://www.datacamp.com/blog/gpt-5-6-sol-luna-terra
  - Sol: コーディング・生物学・サイバーで大幅向上。**Terminal-Bench 2.1 で 88.8%（SOTA）、ultra モード（Sol Ultra）で 91.9%**。ExploitBench では約1/3の出力トークンで競合水準
  - Terra: 「GPT-5.5 と競合する性能で約2倍安い」
  - Luna: 大量・低遅延・低予算向け。「最安=常に最弱ではない」
  - **max reasoning effort**（最も長く考える）と **ultra モード**（単一エージェントでなくサブエージェントを使う）を確認
- **GitHub Changelog**: https://github.blog/changelog/2026-07-09-openais-gpt-5-6-sol-terra-and-luna-are-now-available-in-github-copilot/
  - 7/9 に GitHub Copilot でも3モデル利用可（GAの傍証）

## ユーザー提示メモとの照合結果

| 項目 | 照合 |
|---|---|
| 7/9(現地) GA、ChatGPT/Codex/API、24時間ロールアウト | **一致**（検索スニペット＋Engadget＋GitHub changelog） |
| Sol=最上位（コーディング/サイバー/科学SOTA） | **一致**（DataCamp: Terminal-Bench SOTA・サイバー・生物学） |
| Terra=GPT-5.5同等性能を半額 | **一致**（「competitive with GPT-5.5 while ~2x cheaper」） |
| Luna=最速・最安 | **一致** |
| API価格 Sol $5/$30・Terra $2.5/$15・Luna $1/$6 | **一致**（Engadget） |
| ChatGPTは Plus/Pro/Business/Enterprise が Sol（Pro/Enterprise は Sol Pro も） | **ユーザー確認済み**（公式ヘルプは403で直接未取得。報道でもプラン別詳細なし→本文では公式ヘルプ準拠の記載とし、無料枠は断定しない） |
| 経緯: 6/26 限定プレビュー→政府協議→一般公開 | **一致**（OpenAI公式＋Engadget） |
| max推論モード・ultraモード(サブエージェント) | **一致**（DataCamp） |
| 無料ユーザーへの提供範囲の詳細 | **未確認**（「詳しい公開範囲は示さず」の報道あり→claims扱い） |
| Claudeが同日に利用制限を全リセット（対抗の見方） | **報道ベース**（一次未確認→claims扱い） |
| GPT-6が数週間以内 | **憶測**→ユーザー指示により**非掲載** |

## 確認不能・注意点

- 日本のユーザー画面での反映タイミング（24時間ロールアウト中）→ uncertain
- 無料プランでの利用可否の細部 → uncertain
- 「科学」の内訳は生物学中心の記述（DataCamp）。本文では「科学（生物学など）」と幅を持たせる
