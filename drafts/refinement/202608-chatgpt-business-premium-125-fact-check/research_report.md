# Research Pass: 「ChatGPT Business Premium 125ドル」報道の検証

- 作成日: 2026-08-13 JST
- 対象run: 20260813T093629.771
- scout入力: 財経新聞として配信された「OpenAI、ChatGPT Businessに月額125ドルの『Premium』プランを追加　5時間制限を撤廃」という見出し
- 調査方針: 料金・プラン名・利用上限はOpenAIとAnthropicの公式料金／ヘルプを優先し、報道見出しは一致確認が取れるまで claims とする。

## facts（公式で確認できたこと）

1. OpenAI公式のChatGPT Business料金は、米ドル表示で年払いが1ユーザー月額20ドル、月払いが25ドル。最低2ユーザーで、通常のBusinessは「Premium」という別シート名では案内されていない。
   - https://openai.com/business/pricing/
   - https://help.openai.com/en/articles/8792828-what-is-chatgpt-team/
2. OpenAI公式はChatGPT Businessのメッセージとやり取りを「Unlimited」と案内する一方、不正利用防止のガードレールと、高度機能の利用枠・追加クレジットを明記している。したがって「すべての5時間制限が撤廃」と単純化できない。
   - https://openai.com/business/chatgpt-pricing/
   - https://help.openai.com/en/articles/11487671-flexible-pricing-for-chatgpt-enterprise-plans
3. AnthropicのClaude TeamにはStandardとPremiumのシートがあり、米国向けPremiumは月払い125ドル、年払い換算100ドルと案内されている。
   - https://support.claude.com/en/articles/9266767-what-is-the-team-plan
4. Anthropic公式はClaude Codeなどの利用上限について5時間のリセット期間を案内しており、Premiumシートでも使用量上限自体が一律に消えるとはしていない。上限到達後はusage creditsで継続できる仕組みがある。
   - https://support.claude.com/en/articles/12293051-use-claude-in-xcode
   - https://support.claude.com/en/articles/12005970-manage-usage-credits-for-team-and-seat-based-enterprise-plans

## claims（報道・見出しで主張されていること）

- scout見出しは、OpenAIがChatGPT Businessへ「Premium」を追加し、月額125ドルで5時間制限を撤廃したと主張している。
- 2026年8月13日の調査時点で、OpenAI公式料金・Help Center・公式検索結果からこの組み合わせを裏付ける発表は確認できない。
- 「Premium」「125ドル」「5時間」という3要素は、AnthropicのClaude Team Premiumの価格とClaude系の利用上限説明に一致するため、サービス名の取り違えが起きた可能性が高い。これは公式差分からの推定であり、報道元の編集経緯は断定しない。

## uncertain_points（断定しないこと）

- 元報道が今後訂正・削除・追記されるか。
- OpenAIが限定テストや未公開の価格を一部顧客へ提示している可能性。ただし公開記事で事実扱いできる根拠は現時点でない。
- 地域、税、為替、請求周期による実際の請求額。記事内では米ドルの公式表示として扱う。
- 「無制限」の実効範囲。一般メッセージ、モデル別利用枠、高度機能、追加クレジットを分ける。

## 読者向けの安全な結論

「ChatGPT Business Premium 125ドル」は公式料金表と一致しない。契約・社内稟議を進めず、OpenAI公式のBusiness料金とワークスペース内の請求画面を確認する。125ドルのPremiumという条件を見た場合はClaude Teamの情報と混ざっていないか確認する。
