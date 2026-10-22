# Research Pass — 2026-10-23

## 調査対象と一次情報

- Anthropic, “Using Claude to reduce the attack surface of code”, 2026-10-20: https://www.anthropic.com/research/attack-surface-reduction
- OpenSSH, Release Notes 10.6, 2026-10-06: https://www.openssh.org/releasenotes.html
- スカウト対象の報道、ITmedia NEWS, 2026-10-22: https://www.itmedia.co.jp/news/article/2610/22/2000002498/

## facts（一次情報で確認）

- AnthropicはClaudeを使い、ソフトのうち外部から到達できるコードを調べ、不要な処理への到達を制限する研究を公表した。研究発表日は2026年10月20日。
- 対象は25のオープンソースプロジェクト、合計500万行超。Anthropicは493件の問題を見いだしたと報告している。この集計は同社の研究結果であり、独立した全件監査の結果とは扱わない。
- OpenSSH 10.4では、初期設定で有効でない実験的なML-DSA-44関連コード約4500行に、認証前のクライアント入力が届く経路があった。Anthropicによれば、この範囲は初期設定のsshdで認証前に到達できるOpenSSH自身のコードの約16％に相当する。
- OpenSSH 10.5で最初の確認位置を変えた後、Claudeが二つの抜け道を指摘したとAnthropicは説明している。10.6では鍵と証明書の署名方式を、読み取り時に許可リストと照合する修正が入った。
- OpenSSHの10.6リリースノートは、この修正とChris Rohlf、Claude、Anthropic Researchによる提案・検討を明記している。10.6の公開日は10月6日。

## claims（発表主体の評価・報道）

- Anthropicは、この修正で初期設定のOpenSSHの認証前に到達できたコードが約5分の1減ったと評価する。対象は「ソフト全体のコード」ではない。
- ITmediaは同研究を、個々の脆弱性探しとは異なる防御策として紹介した。記事公開日は10月22日。

## uncertain_points（未確定・適用範囲）

- この研究は全ソフトの安全を証明しない。見つかった493件すべてが直ちに悪用できる脆弱性という意味でもない。
- OpenSSHを組み込む個別の製品やサービスがいつ10.6相当の修正を受け取るかは、各提供元の配布・更新方針次第である。
- 一般利用者の端末で設定変更が必要かどうかは、利用する製品の状況を確認しなければ断定できない。

## 表現上の注意

「AIがOpenSSHの脆弱性を493件発見」「OpenSSHの全コードが20％削減」「Claudeだけで自動修正完了」とは書かない。OpenSSH公式が裏付けるのは10.6の具体的な確認処理の変更で、広い集計と削減割合はAnthropicの研究評価として帰属させる。
