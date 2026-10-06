# Research Pass — OpenClawの仕組みとChatGPTとの違い

調査日: 2026-10-07 JST。対象: 2026-10-06 19:30 UTCに採用されたAIsmileyのOpenClaw解説。記事はスカウト元の記述を事実の根拠にせず、以下の一次情報で検証した。

## facts（公式に確認）

- OpenClawは利用者自身の機器・環境でGatewayを動かし、チャットアプリからAIアシスタントへ話しかける仕組み。モデルの接続先は選択できる。[公式FAQ](https://docs.openclaw.ai/help/faq/what-is-openclaw)
- WindowsではWindows Hub、PowerShellのCLI、WSL2という導入経路がある。[Windows公式案内](https://docs.openclaw.ai/platforms/windows)
- 初回の導入にはインストールとオンボーディングが必要。外部サービスへの接続は設定に応じる。[公式セットアップ](https://docs.openclaw.ai/help/faq-first-run/quick-start)
- 通常のホスト導入でGatewayはループバックに結びつき、チャット送信者のペアリングや許可リストを使う構成がある。設定によって例外がある。[公式セキュリティ](https://docs.openclaw.ai/gateway/security)
- `openclaw security audit` は設定の監査を行う公式コマンド。[監査手順](https://docs.openclaw.ai/gateway/security/running-the-audit)
- OpenClaw側の利用額はAIモデルの接続先・認証・追加機能で異なる。ローカル表示は請求書の代わりにならない。[公式利用額資料](https://docs.openclaw.ai/reference/api-usage-costs)
- ChatGPT契約とOpenAI API利用は別会計。API経由の利用はChatGPTの月額料金に自動的には含まれない。[OpenAI請求案内](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)
- OpenClawにはOpenAIのサブスクリプション認証経路もあり、全利用がAPI従量課金と断定できない。[OpenClaw OpenAI接続案内](https://docs.openclaw.ai/providers/openai)

## claims（報道・二次情報）

- [AIsmileyの解説](https://aismiley.co.jp/ai_news/openclaw-chatgpt-difference-price-security/)がOpenClawとChatGPTの違い・料金・導入手順を扱う。見出し由来の話題設定にのみ利用し、仕様の根拠は公式資料を使う。記事本文URLは未確認のため参考情報として採用しない。

## uncertain_points（未確定・変動）

- 個々の接続先の料金、利用枠、対応機能はプランや更新で変わる。固定額を記事に書かない。
- 日本語入力に対応するチャットアプリの組み合わせや利用可能機能は、利用者の選択したサービス・設定に依存する。日本で一律利用可能とは書かない。
- この説明は実機検証ではない。導入操作の成功や安全性を保証しない。
