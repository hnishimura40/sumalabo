# 検品用 強制更新（Pull-to-Refresh）

デプロイ後の確認を **アプリ再起動なし** で行うための検品用機能。読者向け機能ではない。
実装: `src/components/ForceRefresh.astro`（`BaseLayout` に常設）。

## 使い方

1. スマホの PWA（ホーム画面から起動したすまラボ）で対象ページを開く。
2. **画面最上部から下に引く**（70px 以上）。「引いて更新 → 離すと更新」と出る。
3. 指を離すと「更新中…」→ 強制更新が走ってリロードされる。

通常のブラウザで試したいときは URL に `?ptr=1` を付けるか、
DevTools で `localStorage.setItem('sumalabo-ptr','1')` を実行する。

## 何が「強制」なのか

通常のリロードとの違いは **画像も取り直す** こと。

1. Cache Storage（SW キャッシュ）を全削除
2. Service Worker の `update()`
3. **HTML と全画像を `fetch(url, {cache:'reload'})` で HTTP キャッシュをバイパスして再取得**
4. `location.reload()`

## なぜこの設計か（2026-07-20 調査）

「更新が見えない」の原因を層ごとに切り分けた結果:

| 層 | 実測値 | 判定 |
|---|---|---|
| Service Worker | `public/sw.js` に **fetch ハンドラ無し**（Web Push 専用）。全 git 履歴でも一度もキャッシュしていない | シロ |
| Cloudflare エッジ | HTML は `cf-cache-status: DYNAMIC`（エッジキャッシュしない） | シロ |
| ブラウザ HTTP | HTML は `Cache-Control: public, max-age=0, must-revalidate`（毎回再検証） | シロ |
| **PWA(standalone)** | **再ナビゲートしない**＝最後に読み込んだページが残り続ける。standalone にはリロードボタンも無い | **真因** |
| **画像** | `/images/...` は `Cache-Control: public, max-age=14400`（**4時間**）。同じパスに再生成した画像を差し替えるため、通常リロードでも旧画像が出る | **検品上の第2要因** |

→ したがって必要なのは「キャッシュ破棄」よりも **再ナビゲート**、加えて **画像のHTTPキャッシュ回避**。

### キャッシュバスター（クエリ付与）を使わない理由
HTML はエッジ非キャッシュ、かつ `npm run deploy:production` が deploy 直後に
cache purge を実行済み（`cachePurge: ok`）。よって URL にクエリを足す必要がなく、
URL と GA4 計測を汚さない `fetch(..., {cache:'reload'})` を選択した。

## 安全性・非干渉

- **既定は standalone(PWA) のみ有効**。通常ブラウザの読者には**リスナーすら登録されない**
  （`overscroll-behavior` も変更しない）。
- 有効時のみ `overscroll-behavior-y: contain` でネイティブ pull-to-refresh を抑止し、**二重発動を防ぐ**。
- 発動しない条件（実測で確認済み）: 最上部でない / 2本指（ピンチズーム） /
  ライトボックス表示中 / 上方向スワイプ / 引きが閾値未満。
- 誤発動しても**最新を取り直すだけ**で実害なし。
- 外部ライブラリ不使用。

## 新デプロイ検知バナー（実装済み・2026-07-20）

プル操作すら不要にするため、新しい版が出たら自動でバナーを出す。

- **仕組み**: ビルド時に commit SHA から `BUILD_ID` を決め（`src/lib/build-id.ts` が単一ソース）、
  `/version.json` と `<meta name="sumalabo-build">` の両方に出力。
  `visibilitychange` / `focus` で `/version.json` を `cache:'no-store'` で取得し、
  ページに焼かれた `BUILD_ID` と食い違ったら **「新しい版があります（タップで更新）」** を表示。
  タップすると上の強制更新（画像まで取り直し）が走る。
- **なぜ SW の updatefound を使わないか**: `sw.js` はビルドごとに内容が変わらないため、
  `registration.update()` では新デプロイを検知できない。ビルドIDの比較が確実で安価。
- **誤検知（伝播レース）対策**:
  - 読み込み後 **60秒**は判定しない
  - 連続チェックは **30秒**間引き
  - 差分を検知したら **10秒**おいて再取得し、**同じ新IDが2回続いたときだけ**表示
    （deploy 直後はエッジごとに版が揺れることがあるため）
- 有効範囲はプル更新と同じ（既定 standalone、`?ptr=1` / localStorage で検証可）。
