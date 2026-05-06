# ルート直下ファイル整理記録

Cloudflare Pages / GitHub 公開前の最終整理として、ルート直下に置かれていた制作素材を移動しました。

この整理では、ファイル削除は行っていません。原稿・画像・参考資料は、用途に応じて `articles/sources/` または `archive/original_uploads/` に保管しています。

## 整理方針

- 実装に必要な設定ファイルはルート直下に残す
- 記事元原稿は `articles/sources/` に移動する
- 画像生成元、旧manifest、デザイン参考ファイルなど判断に迷うものは `archive/original_uploads/` に移動する
- Word一時ファイルなど明らかな一時ファイルは削除せず、削除候補があれば一覧化する

## ルート直下に残したファイル

| ファイル | 理由 |
|---|---|
| `.gitignore` | Git管理除外ルール |
| `astro.config.mjs` | Astro設定 |
| `package.json` | npmスクリプト・依存関係 |
| `package-lock.json` | 依存関係の固定 |
| `tsconfig.json` | TypeScript設定 |

## articles/sources/ に移動した記事元原稿

| もともとルート直下にあったファイル | 移動先 | 移動理由 |
|---|---|---|
| `3万円台スマホの選び方.txt` | `articles/sources/3万円台スマホの選び方.txt` | 記事元原稿 |
| `ahamo対楽天モバイル.txt` | `articles/sources/ahamo対楽天モバイル.txt` | 記事元原稿 |
| `AIスマホ.txt` | `articles/sources/AIスマホ.txt` | 記事元原稿 |
| `esimについて.txt` | `articles/sources/esimについて.txt` | 記事元原稿 |
| `iphone対android.txt` | `articles/sources/iphone対android.txt` | 記事元原稿 |
| `sumalabo_usb_c_charger_comparison_no_sakura_results.txt` | `articles/sources/sumalabo_usb_c_charger_comparison_no_sakura_results.txt` | USB-C充電器比較の元原稿 |
| `USB-C充電器の選び方.txt` | `articles/sources/USB-C充電器の選び方.txt` | 記事元原稿 |
| `WindowsとMac比較.txt` | `articles/sources/WindowsとMac比較.txt` | 将来判断用の元原稿 |
| `モバイルバッテリーの選び方 .txt` | `articles/sources/モバイルバッテリーの選び方 .txt` | 記事元原稿 |
| `モバイルバッテリー比較.md` | `articles/sources/モバイルバッテリー比較.md` | モバイルバッテリー比較の完成原稿 |
| `中古スマホは危ないのか.txt` | `articles/sources/中古スマホは危ないのか.txt` | 記事元原稿 |
| `入れるべき記事.docx` | `articles/sources/入れるべき記事.docx` | 記事計画・素材 |
| `格安SIMとは何か。大手と何が違うのか.txt` | `articles/sources/格安SIMとは何か。大手と何が違うのか.txt` | 記事元原稿 |
| `生成AI比較.txt` | `articles/sources/生成AI比較.txt` | 将来判断用の元原稿 |
| `貼り付けたマークダウン（1）.md` | `articles/sources/貼り付けたマークダウン（1）.md` | USB-C充電器比較の調査資料 |

## archive/original_uploads/ に移動した素材

| もともとルート直下にあったファイル | 移動先 | 移動理由 |
|---|---|---|
| `ChatGPT Image 2026年4月30日 06_06_52.png` | `archive/original_uploads/ChatGPT Image 2026年4月30日 06_06_52.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年4月30日 06_40_22.png` | `archive/original_uploads/ChatGPT Image 2026年4月30日 06_40_22.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年4月30日 21_21_35.png` | `archive/original_uploads/ChatGPT Image 2026年4月30日 21_21_35.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年4月30日 22_38_51.png` | `archive/original_uploads/ChatGPT Image 2026年4月30日 22_38_51.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年4月30日 22_55_02.png` | `archive/original_uploads/ChatGPT Image 2026年4月30日 22_55_02.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 12_19_18.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 12_19_18.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 14_28_36.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 14_28_36.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 15_30_44.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 15_30_44.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 16_27_15.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 16_27_15.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 16_52_02.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 16_52_02.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月1日 18_07_54.png` | `archive/original_uploads/ChatGPT Image 2026年5月1日 18_07_54.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月2日 20_44_12.png` | `archive/original_uploads/ChatGPT Image 2026年5月2日 20_44_12.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月3日 21_11_55.png` | `archive/original_uploads/ChatGPT Image 2026年5月3日 21_11_55.png` | サムネイル生成元画像の保管 |
| `ChatGPT Image 2026年5月6日 20_44_05.png` | `archive/original_uploads/ChatGPT Image 2026年5月6日 20_44_05.png` | favicon生成元画像の保管。Git管理用原本は `assets/icons/original/favicon-source.png` にコピー |
| `ChatGPT Image 2026年5月6日 20_49_55.png` | `archive/original_uploads/ChatGPT Image 2026年5月6日 20_49_55.png` | Apple touch icon / PWAアイコン生成元画像の保管。Git管理用原本は `assets/icons/original/apple-touch-icon-source.png` にコピー |
| `character_assets_manifest.txt` | `archive/original_uploads/character_assets_manifest.txt` | 旧manifest原本の保管 |
| `すまラボ — デザインイメージ (印刷用).pdf` | `archive/original_uploads/すまラボ — デザインイメージ (印刷用).pdf` | デザイン参考資料の保管 |
| `すまラボデザイン.html` | `archive/original_uploads/すまラボデザイン.html` | デザイン参考資料の保管 |

## 削除候補

今回、削除は行っていません。

Word一時ファイル `~$...` はルート直下に見つかりませんでした。今後見つかった場合も、いきなり削除せず削除候補として確認します。

## 補足

`archive/original_uploads/` は、生成元画像や移動判断に迷う素材のローカル保管場所です。
GitHub公開リポジトリには含めない方針です。

## GitHub公開前の扱い

2026-05-03時点では、`archive/original_uploads/` はローカル保管専用として扱います。
GitHub公開リポジトリには含めない方針とし、`.gitignore` で除外しています。

`ブログの種（使用済）/` も、ローカル作業メモ・使用済み素材置き場として扱います。
公開サイトの生成には不要なため、GitHubには含めない方針です。

`articles/sources/` は記事作成の元原稿置き場です。
今回は削除せず残しますが、初回GitHub公開ではローカル制作素材として `.gitignore` で除外します。
公開リポジトリに含めたい原稿がある場合は、内容を精査してから個別に移してください。

`project/` は初期素材・指示書の原本置き場です。
初回GitHub公開では公開可否が判断しきれないため、ローカル保管として `.gitignore` で除外します。

`design/reference/` はClaude Designなどの参照HTML/PDF置き場です。
サイト生成には不要で容量も大きいため、初回GitHub公開では `.gitignore` で除外します。

`assets/thumbnails/original/` はサムネイル原本として再生成に必要なため、現時点ではGit管理に含める方針です。
ただし、公開リポジトリにする場合は、画像の公開可否とリポジトリ容量を確認してください。
