<!-- provenance: すまラボ立ち会い / Research Pass。1Password公式ブログ+サポート+主要報道で裏取り -->

# research_report: 202607-1password-for-claude-agentic-login

## 一次情報（確認済み・公式）
- **1Password公式ブログ「1password.com/blog/1password-for-claude」**
  - 2026-07-16 発表・提供開始。
  - ゼロ露出設計: Claudeがログイン必要なブラウザ作業をする際、1Passwordが「どの認証情報を・なぜ使うか」を提示→生体認証(Touch ID等)で承認→ページに直接注入。「Claude never sees the vault item, password, or one-time code.」パスワード/ワンタイムコードは Claude のモデル・記憶・Anthropic のシステムに一切入らない。
  - アクセスは当該タスク限定で完了と同時に終了。注入後にページ上で秘密が露出していないか自動チェック。フォーム送信が失敗したら入力値をクリアしてから Claude に制御を返す。
  - Agentic Mode: AIエージェントがブラウザを操作し始めると 1Password 拡張が自動ロックダウン。UIが隠れ、明示許可した認証情報のみ使用可、保管庫の閲覧・検索も不可。まず Claude 対応、他エージェントにも拡大予定。
  - CTO Nancy Wang: 「答えはエージェントに秘密を渡すことではない。ユーザーがエージェントに“認証情報を見せずに使う”許可を与えることだ」。エージェントは新しい種類のアイデンティティ、という位置づけ。
- **1Passwordサポート「support.1password.com/1password-claude/」**
  - 提供OS: **Mac のみ**（1Password for Mac 8.12.28 以降）。
  - 必要: 1Password for Mac + 1Password ブラウザ拡張（8.12.28以降）/ Claude デスクトップアプリ + Claude ブラウザ拡張。
  - Claude Team / Enterprise は Owner が組織設定で有効化が必要。
  - 対象は Login アイテムの **ユーザー名・パスワード・ワンタイムコードのみ**。**パスキーは非対応**。ソーシャルログイン（Sign with Google 等）は意図通り動かないことがある。
- **1Password プラン対象**: ビジネス / ファミリー / 個人（公式ブログ）。

## facts（記事で確定として扱える）
1. 7/16 に「1Password for Claude」発表・提供開始。
2. ゼロ露出設計（承認だけして中身は見せない・直接注入・Claude/Anthropicに秘密が入らない）。
3. タスク限定アクセス+露出自動チェック+送信失敗時の入力値クリア。
4. Agentic Mode（AIエージェント操作開始で自動ロックダウン、明示許可以外は閲覧・検索も不可、まずClaude・他エージェント拡大予定）。
5. 提供条件: Mac向け / 1Password=ビジネス・ファミリー・個人 / 必要アプリ4点 / Team・Enterpriseは管理者が有効化。
6. 現時点の対象はログイン情報とワンタイムコードのみ（クレカ・身元情報は将来対応予定）。パスキー非対応。

## claims（公式言及・断定しすぎない）
- 「エージェントは新しい種類のアイデンティティ」というCTO発言の位置づけ（=設計思想の標準化の流れ）。
- 他エージェント対応の時期。他社追随の予想（すまラボの見立て）。
- Claude側の対象プラン（user brief: Pro/Max/Team/Enterprise。公式はTeam/Enterpriseの管理者有効化を明記、個人はPro/Max想定）。→ 記事では「Claude Team/Enterpriseは管理者有効化」「個人はPro/Max想定」と幅を持たせる。

## uncertain（未確認）
- Windows対応時期。
- 日本語環境での提供細部。

## 編集メモ（切り口・線引き）
- 主軸: 「AIに仕事を任せたい。でもパスワードを渡すのは怖い」という本音に、「渡さずに使わせる」という発明で答える構図。図解の主役は 従来(渡す=怖い) vs 新方式(承認だけ・中身は見せない) の対比。
- 「1Passwordに乗り換えないとダメ?」節: 不要。これは新課題への先行実装。Bitwarden/Google/Apple利用者は変わらず。Claudeにログイン作業を任せない使い方なら不要。注目は製品名でなく設計思想の標準化。Mac限定の制約も明記。
- overclaim回避: 「全部安全」ではなく、対象はログイン+OTPのみ・Mac限定・パスキー非対応 を明示。
