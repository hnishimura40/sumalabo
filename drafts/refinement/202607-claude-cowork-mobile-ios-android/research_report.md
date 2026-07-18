<!-- provenance: すまラボ立ち会い / Research Pass。公式(support.claude.com リリースノート / claude.com/product/cowork / claude.com/blog)で裏取り -->

# research_report: 202607-claude-cowork-mobile-ios-android

## 一次情報（確認済み・公式）
- **Claude Cowork リリースノート（support.claude.com/en/articles/12138966）**
  - 2026-07-07: 「Claude Cowork is now available on web and mobile in addition to desktop.」（従来はデスクトップ）
  - 「Cowork runs your sessions remotely (in beta), so your sessions and files are saved to your Claude account and go where you go, on any device. Work continues when you close your laptop, and scheduled tasks run with no device online.」
  - ロールアウトは Max プランから開始。
  - 2026-07-07: M365 コネクタに書き込みツール追加。「Claude can draft, send, and organize email, manage calendar events, update mailbox settings, and create and update files in OneDrive and SharePoint.」／「Teams remains read-only.」
- **製品ページ（claude.com/product/cowork）**: 「web, desktop, and mobile」対応、web/mobile は beta。「start a task from your phone, and Claude keeps working in the cloud even when your laptop is closed.」「Schedule a task for any cadence, and it runs unattended.」
- **利用実態ブログ（claude.com/blog/how-people-are-using-claude-cowork）**: データ収集 **2026-05-11〜05-31**、**約120万（1.2 million）セッション / 60万（600,000+）組織超**。カテゴリ内訳: Business process and operations **33.4%** / Content creation and copywriting **16.4%** / Software development **8.7%** / DevOps 7% / Research 6.4% / Data analysis 5.8%。上位2カテゴリで約半分。「90%超がソフト開発以外」。

## facts（記事で確定として扱える）
1. 7/7 に Cowork がモバイル（iOS/Android）とウェブに対応（従来デスクトップ）。web/mobile は beta。
2. セッションはクラウドで実行され、端末を閉じても継続。スケジュールしたタスクは端末オフでも動く。
3. 7/7 に M365 連携へ書き込みツール追加（メール下書き/送信/整理、カレンダー管理、mailbox設定更新、OneDrive/SharePointのファイル作成・更新）。Teams は読み取り専用のまま。
4. 利用実態（5/11–5/31・120万セッション・60万組織超）: 業務プロセス33.4% / コンテンツ作成16.4% / ソフト開発8.7%。90%超が非コーディング。

## claims（報道/一部言及・断定しない）
- ロールアウトはMaxから開始し、Pro等へ順次拡大との言及（プラン別の細かな提供条件は変動しうる）。

## uncertain（未確認・記事では未確定として扱う）
- 日本での提供範囲・日本語UI/対象プランの細部（公式で日本個別の記載を確認できず）。
- 無料/下位プランでのモバイルCowork可否の細部。

## 編集メモ（線引き）
- 「スマホでできないこと」= Cowork（タスク委任・エージェント実行）と Claude Code（ターミナル/CLIでのコード実行）は別物。モバイルCoworkは"作業の委任"であって、Claude Code本体のターミナル操作をスマホでやる機能ではない。ここは editorial clarification として明示（overclaimしない）。
