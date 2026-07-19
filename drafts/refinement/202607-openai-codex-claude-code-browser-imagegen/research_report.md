<!-- provenance: すまラボ立ち会い / Research Pass 2026-07-19 / OpenAI・Anthropic公式確認 -->

# Research Pass: CodexとClaude Code、ブラウザ・画像運用の違い

## facts（公式確認済み）

- Codexは、コードを読み、変更し、テスト・検証まで進めるOpenAIのエージェント。現在の主要な入口はChatGPTデスクトップアプリ、Web/クラウド、CLI、IDE拡張、iOS。PlusではWeb・CLI・IDE・iOSを含み、上位プランも同じ利用プールを使う。APIキー利用は別課金。
- ChatGPTデスクトップアプリの内蔵Browserは、普段のブラウザと分離した専用プロファイルを使う。必要なら内蔵側でログインできる。localhostも開け、クリック・入力・画面確認・スクリーンショット・結果検証まで可能。
- 既存のChromeタブや普段のChromeプロファイルのログイン状態が必要な場合は、ChatGPTのChrome拡張を使うのが公式の整理。
- Codex/ChatGPTのbuilt-in画像生成はgpt-image-2を使い、一般のCodex利用上限から消費される。CLIでは参照画像を添付でき、成果物をファイルとして保存できる。
- Computer Useは対応地域のmacOS/Windowsで、Work modeまたはCodexからGUIを操作できる。macOSにはバックグラウンド/Locked use系の機能があるが、地域・OS・設定に依存する。
- Claude Codeはターミナルからコードベースを読み、ファイルを変更し、テストを実行するエージェント型コーディングシステム。ターミナル、IDE、Claude Desktopからローカル/リモートセッションを扱える。
- Claude in ChromeはClaude Code本体ではなく、ClaudeがユーザーのChromeタブを操作する拡張。既存タブ・ログイン済みサイトを使える。
- Claude Pro/MaxではClaudeアプリとClaude Codeが利用枠を共有する。

## 本サイトの運用実例（一次資料=リポジトリ内の運用記録）

- 従来の画像生成は、Chromeを前面化し、参照画像2枚をCF_HDROPで1枚ずつ貼り付け、各貼り付けの間を待ち、DOMで添付数を確認し、生成後にblob/ダウンロードを回収する方式だった。
- 2枚同時貼り付けでは1枚しか添付されない、フォーカス・可視タブ・クリップボード上書き・重複モーダル・ダウンロード失敗など、生成モデル以外の失敗点が複数あった。
- 今回はCodex execからbuilt-in imagegenを呼び、正本画像2枚を引数で添付し、絶対パスへ直接保存する方式を本番初適用する。生成工程と独立検品を分離し、画像別の時間・usage・寸法・SHA-256を記録する。

## claims（運用上の評価）

- 内蔵ブラウザはログイン済みの普段のChromeと分離されるため、環境を固定しやすい。一方、既存ログインを使うには再ログインまたはChrome拡張への切り替えが必要。
- 既存Chromeを借りる方式はログイン済みサイトで便利だが、可視タブ・拡張接続・ブラウザ更新・フォーカスの影響を受けやすい。
- 画像量産では、UIを経由して「貼る→待つ→ダウンロードする」より、生成物の保存先をジョブとして指定する方が工程を減らしやすい。

## uncertain_points（断定しない）

- 機能の提供地域、対象プラン、UI名称、利用上限は段階展開で変わる。
- 「どちらが安定するか」は対象サイト、ログイン要否、OS、拡張、組織設定で変わる。普遍的な優劣とはしない。
- 本番初適用の成功率・所要時間・使用量は生成完了後の実測値のみを報告する。

## 公式ソース

- OpenAI Codex Manual: https://developers.openai.com/codex/codex-manual.md
- OpenAI Browser: https://learn.chatgpt.com/docs/browser
- OpenAI Chrome extension: https://learn.chatgpt.com/docs/chrome-extension
- OpenAI Image generation: https://learn.chatgpt.com/docs/image-generation
- OpenAI Computer Use: https://learn.chatgpt.com/docs/computer-use
- Anthropic Claude Code: https://www.anthropic.com/product/claude-code
- Anthropic Claude Code setup: https://docs.anthropic.com/en/docs/claude-code/getting-started
- Anthropic Claude Code in desktop / Claude in Chrome: https://www.anthropic.com/news/claude-opus-4-5
- Anthropic Pro/Max shared usage: https://support.anthropic.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan
