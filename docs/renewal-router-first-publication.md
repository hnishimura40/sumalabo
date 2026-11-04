# Wi-Fiルーター初回公開の承認・検証

2026-11-04、Hiroが「ルーター公開OK。」と明示承認。A6の白地修正版を公開する。AI記事および他3カテゴリの初回公開は承認していない。生成の共通フラグはfalseを維持する。

- 承認記録: `data/automation/sumalabo-editorial-identity.json` の `renewal.firstPublicationApprovals.wifi-router`。
- 既存の `202611-wifi-router-comparison.webp` を記事一覧、OGP、Twitterカード、構造化データのサムネイルに使う。記事冒頭の旧大画像枠は復活させない。
- 公開直前に価格.comの2026/11/04ランキングを再取得。10候補と順序は一致。3000D4AX: 15,698→15,499円、WRC-X1500GS2-B: 6,136→6,550円、WX5400T6: 22,208→22,369円。価格、差額、対数マップを再生成。3枠は同じ機種。
- 公式製品ページを再確認。WRC-X1500GS2-Bの旧ファームウェアの自動更新に関する2025年4月24日案内を更新欄へ明記。最新バージョンの数値は断定しない。
- デザイン確認: 320/390/1280pxで旧大画像0、白背景、横はみ出し0、全10商品写真ロード成功。価格更新は同じ構成・スタイルを使用。
- チェック: editorial-picks / reading-order / no-repeated-cells / origin-escalation / price-buttons / mobile-overflow は全項目pass。詳細記録は作業領域のrouter-checks.json。

本番配備はこのPRをmainへマージ後、正規のdeploy-production-from-main.mjsで行い、公開URL・同一バージョン・strict verifyを照合する。承認記録のみでは配備完了と扱わない。

表示を戻す場合は `src/config/site.ts` の `renewalArticleLayout=false`。新規生成を旧形式へ戻す設定は `renewal.enabled=false`（現時点でもfalse）。公開済み本文のロールバックは既存の本番ロールバック手順を使う。
