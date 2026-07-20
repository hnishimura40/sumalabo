<!-- provenance: すまラボ立ち会い / Research Pass 2026-07-20 -->

# research_report: AIを使うのに高いPCは必要？

## 調査結論

サブスク型のチャットAIやWebサービス型生成AIは、主要な推論をサービス側で行う。手元のPCはブラウザ・アプリ・ファイル操作を担うため、専用GPUは通常の必須条件ではない。一方、ローカルLLM、ローカル画像・動画生成、重い動画編集は手元のGPU・メモリ・SSDの影響を強く受ける。

「10万円台で十分」は公式の性能保証ではなく、16GBメモリ、実用的な画面、SSD、安定した回線を満たす一般利用向けの編集判断として扱う。

## facts：公式・一次情報

### クラウドAIの動作要件

- OpenAIのWindows版ChatGPTはWindows 10 x64/arm64 version 17763.0以降を要件とし、専用GPUを必須としていない。
  - https://help.openai.com/en/articles/9982051-using-the-chatgpt-windows-app
- OpenAIのmacOS版ChatGPTはmacOS 14、Apple Silicon M1以降またはIntelを要件とする。
  - https://help.openai.com/en/articles/9395554-what-are-the-system-requirements-for-the-chatgpt-macos-app
- Claude DesktopはWindows 10以降、macOS 11以降を要件とし、チャット利用に専用GPUを必須としていない。
  - https://support.claude.com/en/articles/10065433-install-claude-desktop
- 以上から、主要チャットAIのクライアント要件にゲーミングGPU級の条件がないことは確認できる。ただし、ローカルで実行するコマンド、ビルド、編集ソフトの負荷は別。

### Copilot+ PC / NPU

- MicrosoftはCopilot+ PCを40 TOPS以上のNPUを持つWindows 11 PCと説明。
- 消費者向け基準は16GB RAM、256GB SSD、Windows 11 24H2以降。
- Recall、Click to Do、Live Captions、Cocreator、Windows Studio Effects等がNPU利用例。
- NPUの恩恵にはソフトウェア側の対応が必要。
  - https://learn.microsoft.com/en-us/windows/ai/npu-devices/
  - https://www.microsoft.com/en-us/windows/learning-center/copilot-plus-pcs-windows-pcs-differences

### 国内PC平均単価

- JEITA 2026年4月：出荷56.0万台、金額783億円。全体平均は約139,821円。
- 2026年3月平均103,458円との比較で約35%上昇（PC WatchによるJEITAデータの計算）。
- 4月の上昇には、3月に5.5万円のGIGAスクール向けが多かった反動が含まれる。
- 2026年5月：ノート44.5万台、596億円。平均は596億円÷44.5万台＝約133,933円（約13.4万円）。
  - https://www.jeita.or.jp/japanese/stat/pc/2026/
  - https://pc.watch.impress.co.jp/docs/news/2111549.html

### Intelの2026年7月価格改定

- Core Ultra 7 270K PlusとCore Ultra 5 250K Plusの米国希望カスタマー価格が30〜50ドル上昇。
- 対象は一部の新型デスクトップCPUであり、Intel CPU全般の一律値上げとは書かない。
  - https://pc.watch.impress.co.jp/docs/news/2122119.html

### 商品公式仕様

- MacBook Air M4 13インチ：2025年3月発売、標準16GBユニファイドメモリ、内蔵画面に加え最大2台の外部ディスプレイ対応。M4は2026年7月時点で最新世代ではないため「2025年モデル」と明示。
  - https://www.apple.com/jp/newsroom/2025/03/apple-introduces-the-new-macbook-air-with-the-m4-chip-and-a-sky-blue-color/
- Dell S2425HSM：23.8インチ、FHD、144Hz、スイベル・高さ・ピボット・チルト調整。
  - https://www.dell.com/ja-jp/shop/dell-24-plus-s2425hsm/apd/210-bsqf/-
- サンワダイレクト600-USSH1TB：1TB、USB Type-C、USB 20Gbps、最大読出2000MB/s（接続環境で変動）。
  - https://direct.sanwa.co.jp/ItemPage/600-USSH1TB

## claims：報道・調査会社の見立て

- TrendForceは2026年1QのPC DRAM価格が前四半期比で倍以上になると予測し、AI・データセンター需要と供給不足を背景に挙げた。
  - https://www.trendforce.com/presscenter/news/20260202-12911.html
- 2026年5月のTrendForce資料は、供給不足と上昇圧力が2027年まで続く見通しを示す。
  - https://www.trendforce.com/presscenter/news/20260529-13068.html
- 2026年3QはDRAMの上昇率が13〜18%へ鈍化する予測がある。これは価格低下ではなく上昇率鈍化。
  - https://www.trendforce.cn/presscenter/news/20260703-13133.html
- IDCやGartner系の報道にはエントリーPC縮小・2027年までの供給逼迫予測がある。本文では「調査会社の予測」と明示し、決定事項にしない。

## uncertain：2026年7月20日時点で決まっていないこと

- 消費者向けPC価格が下がり始める時期。
- メモリ需給が2027年に正常化するか、2028年以降まで長引くか。
- 現在の40 TOPS級NPUが数年後の主要機能にも十分か。
- NPU対応アプリの一般化の速度、地域・機種別の機能展開。
- 為替・在庫・セールによる個別商品の実売価格。

## 楽天3段照合（2026年7月20日）

| 記事内表記 | 検索結果の必須トークン | 楽天og:title（EUC-JP明示デコード） | NG除外 | 画像 |
|---|---|---|---|---|
| MacBook Air M4 13インチ 16GB MW0Y3J/A | M4 / 13インチ / 16GB / MW0Y3J/A | アップル Apple MW0Y3J/A 13インチMacBook Air Apple M4チップ 10コアCPUと8コアGPU 16GB 256GB SSD スターライト：ぎおん楽天市場店 | M2 / M3 / 8GBなし | tshop.r10s.jp、HTTP 200 |
| Dell 24 Plus S2425HSM-R | Dell / 23.8型 / S2425HSM-R | DELL デル 液晶ディスプレイ(23.8型/IPS/FullHD 1920×1080/144Hz/1ms) S2425HSM-R：Joshin web | S2425HS旧型・保護フィルムなし | tshop.r10s.jp、HTTP 200 |
| サンワダイレクト 600-USSH1TB | SSD / 1TB / USB Type-C / 600-USSH | ポータブルSSD 外付け 512GB 1TB 2TB 4TB 読出最大2000MB/s 超小型 USB Type-C接続…：サンワダイレクト楽天市場店 | HDDなし。購入時1TB選択注記 | tshop.r10s.jp、HTTP 200 |

## 体験情報の扱い

- ブログ、クラウド画像生成、動画素材づくりをクラウド型AI中心で運用している点は「本サイトの運用実例」と明記。
- 壁を感じたのはローカル動画生成とWhisper高精度モデルの手元実行の2か所。
- どちらもクラウド代替があることを一般的な選択肢として述べ、特定サービス名の宣伝へ寄せない。
- リベ大への言及は、記事の結論に不可欠でなく一次確認の追加価値も小さいため不採用。
