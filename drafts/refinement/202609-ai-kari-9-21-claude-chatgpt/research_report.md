# research_report.md — Kari提供開始のResearch Pass

出所: GotoAI公式製品ページ、GotoAI発表（PR TIMES掲載）、OpenAI Help Centerを2026年9月22日に確認。

---

## 調査テーマ

デスクトップAIエージェント「Kari」が2026年9月21日に正式提供を開始した。既存のClaude・ChatGPT契約を使えるという説明、無償条件、できること、導入前の注意を一般読者向けに整理する。

## facts（一次情報で確認できたこと）

- GotoAIはKariを2026年9月21日から正式提供すると発表した。
- 公式製品ページで公開されているバージョンは、2026年9月22日の確認時点で0.6.0。
- 対応環境はWindows 10/11（64bit）、macOS 12以降（Apple Silicon / Intel）、Ubuntu 24.04以降またはDebian 13以降（x86_64のdeb）。
- Kariはローカルファイル、ウェブ調査、ブラウザー処理を1つのデスクトップ画面から扱うアプリとして説明されている。
- 公式が挙げる用途は、PDF・Wordの要約や翻訳、PowerPointの下書き、Excelの集計・可視化、ウェブ検索、ブラウザー操作の自動化など。
- コミュニティライセンスは個人利用、100人未満の法人での業務利用、100人以上の法人による60日以内の検証利用を無償対象としている。
- 100人以上の法人で60日を超えて業務利用する場合は有償のコーポレートライセンス対象。
- コミュニティ版は現状有姿・無保証と明記されている。
- GotoAIは、Claude Pro / MaxとOpenAI ChatGPTのサブスクリプションへ本人がサインインして利用でき、Kariが認証情報やトークンを受け取ったり保存・中継したりしないと説明している。
- GotoAIは70種類以上のAIプロバイダー、APIキー、ローカルLLM、独自プロバイダーにも対応すると説明している。
- OpenAI公式はChatGPTとAPI Platformを別の課金体系として扱い、API利用料はChatGPT契約とは別に請求されると説明している。

## claims（提供元の説明として扱うこと）

- 「ChatGPTやClaudeのサブスクをそのまま使える」「別途API従量課金が不要」は、Kariの連携方式についてのGotoAIの説明。OpenAIやAnthropicがKari向けの特別契約を公式発表した、という意味ではない。
- 「レイアウトを保持した翻訳」「APIやMCPのないサイトも自動操作」「70種類以上のプロバイダー対応」などの実用性は、提供元の機能説明。すまラボで実機検証した事実ではない。
- 認証情報やトークンをKariが受け取らないという説明も提供元の説明であり、第三者監査結果を確認したものではない。

## uncertain（確認できない・変わり得ること）

- ChatGPTのどの有料プランがサブスクリプション連携の対象になるか、各プランで利用できるモデルや上限がどう反映されるかの細部。
- 各AIサービス側の規約・認証仕様が変わった場合に、現在の連携方式がそのまま続くか。
- 法人向け有償ライセンスの価格。
- 実際の処理精度、ブラウザー自動化の成功率、大規模ファイルでの速度。
- 機密情報を含む業務での適合性。利用者側の社内規程、アクセス権、外部AIへの送信範囲の確認が必要。

## 参考情報

- GotoAI公式製品ページ: https://gotoai.com/ai-products/kari-jp/
- GotoAI発表（PR TIMES掲載）: https://prtimes.jp/main/html/rd/p/000000003.000190819.html
- Kari公式ドキュメント: https://docs.kari.gotoai.com/
- OpenAI Help Center「Managing billing for ChatGPT and the API platform」: https://help.openai.com/en/articles/9039756

