# X 投稿自動化（@suma_labo）

すまラボ記事が **本番公開 (main マージ + 本番URL確認後)** に、Claude Code が **@suma_labo** から自動で新記事告知ポストを投稿するための仕組みとフロー。

## 役割分担

`CLAUDE.md` の運用ポリシーに従う。**人間は投稿しない / パスワードを入れない / 認証コードを入れない**。Claude が以下を自律で実行する:

1. 記事公開後、`scripts/run/generate-x-post.mjs` で投稿文 (primary + 代替 2 案) を生成
2. `scripts/run/post-to-x.mjs --check --slug X` で台帳（`data/social/x-posted.json`）と照合 → 既投稿なら停止
3. Chrome で `https://x.com/` を開き、`@suma_labo` がログイン済みであることを確認（ログインしていない場合は失敗として停止、ユーザーへ「Chrome で @suma_labo ログインが必要」とだけ報告）
4. `scripts/automation/x-post-chrome.ps1` で **Chrome を前面化 + 投稿文をクリップボードへセット**
5. Claude in Chrome MCP で compose textarea へフォーカス → Ctrl+V で貼り付け
6. サムネ画像が `frontmatter.thumbnail` にあれば、PowerShell で `-ImagePath` 付きで再呼び出し → CF_HDROP クリップボード → Ctrl+V で添付
7. DOM 上で投稿文と添付件数を確認
8. 「ポストする」ボタンを Chrome MCP click で押す
9. 投稿完了後、`scripts/run/post-to-x.mjs --record --slug X --postUrl <URL>` で台帳追記
10. 失敗時は `--error --slug X --reason '...'` で `logs/social/{slug}.x-post-error.json` に保存し、最終報告で「X投稿のみ失敗」と明示。記事公開自体は取り消さない

## 投稿文生成ルール

`scripts/sumahon/generate-x-post.mjs` で純関数化されている。

### 必ず守ること

- **URL は本番 URL** (`https://sumalabo.com/articles/{slug}/`)。Preview URL は使わない（CLI は `--productionUrl` で上書きできるが、デフォルトは本番）。
- **文字数は X の 280 上限に収まる** ように、本文 + URL (t.co 23 文字換算) + ハッシュタグの合計が 270 以下になるよう自動で truncate。
- **ハッシュタグは 2〜4 個**。記事内容から自動判定（iPhone系・Android系・AI系・通信費系・ガジェット系・ニュース系を組み合わせ）。`#すまラボ` は常時付与。
- **すまほん / smhn.info は絶対に出さない**。最終ガードで混入検出 → warning。
- **報道・噂ベース記事** (`type: news` や本文に「噂」「報道」「リーク」を含む) は、hedge 表現（「報道ベース」「公式発表ではない」「可能性」など）を本文に含める。

### 煽り NG ワード

以下は本文から削除する（投稿文として強すぎる表現）:

- 悲報 / 終了 / 完全消滅 / ヤバい / 炎上 / 闇 / 絶望 / オワコン / 壊滅 / 崩壊 / ガチで / ガチ終わ

### 3 案生成

- **primary**: タイトル + description + URL + ハッシュタグ（標準）
- **alt 結論先出し**: `articleBrief.coreAngle` または「結論: …」始まり
- **alt 問いかけ**: 「…という噂、本当のところは？」「…どう変わる？」始まり

人間はこれを目視で承認するわけではなく、Claude が **primary を採用** して投稿する。Claude が hedge やトーンを見て怪しいと判断した場合のみ alt に切り替える。

## 重複投稿防止

`data/social/x-posted.json`:

```jsonc
{
  "version": 1,
  "posts": [
    {
      "slug": "202605-iphone-18-pro-dynamic-island-top-left-rumor",
      "articleUrl": "https://sumalabo.com/articles/202605-.../",
      "postedAt": "2026-05-11T11:00:00+09:00",
      "postText": "...",
      "postUrl": "https://x.com/suma_labo/status/...",
      "method": "chrome",
      "thumbnailAttached": true,
      "charCount": 178
    }
  ]
}
```

同じ `slug` が既に存在すれば `--mode chrome` は exit 3 で停止する。`recordPost` も exception で再投稿を防ぐ。

## API ルート（将来検討）

X API Create Post に切り替える場合の環境変数 (本実装では未使用、設計のみ):

- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`
- もしくは OAuth2 のみ: `X_OAUTH2_BEARER_TOKEN`

API ルートが使えるようになった場合、`scripts/run/post-to-x.mjs --mode api` で呼ぶ前提。API レート / 月額料金 / 権限スコープが変動するため、現時点では **Chrome UI ルートが第 1 候補**。

## CLI

| コマンド | 動作 |
|---|---|
| `npm run social:generate-x-post -- --slug X` | 投稿文生成（primary + 代替 2 案）→ `drafts/social/{slug}.x-post.md` + `logs/social/{slug}.x-post.json` |
| `npm run social:post-to-x -- --slug X` | Chrome ルート: 台帳照合 → PowerShell helper 呼び出し → Claude MCP で投稿 |
| `npm run social:post-to-x -- --slug X --dry-run` | PowerShell を呼ばず、何が投稿されるかだけ表示 |
| `npm run social:post-to-x -- --check --slug X` | 台帳照合のみ。posted=true なら exit 3 |
| `npm run social:post-to-x -- --record --slug X --postUrl <URL>` | 投稿成功後の台帳追記 |
| `npm run social:post-to-x -- --error --slug X --reason '...' [--stage <stage>]` | 失敗ログ保存 |

## 失敗時の取り扱い

| 症状 | 自動対処 | 最終報告での扱い |
|---|---|---|
| Chrome に X ウィンドウが見つからない | ヘルパー exit 2 で停止 | 「Chrome で x.com を開いてください」とだけ報告 |
| @suma_labo がログインしていない | Claude MCP で compose textarea を見つけられない / ログインボタンが見える → 停止 | 「Chrome で @suma_labo ログインが必要」とだけ報告 |
| クリップボード設定失敗 | ヘルパー exit 5 | 失敗ログ保存、最終報告に「X投稿のみ失敗」 |
| 投稿ボタン押下後にエラートースト | Claude MCP で検出 → `--error` で記録 | 失敗ログ保存、人間にパスワード入力等は求めない |
| 重複投稿台帳ヒット | exit 3 で停止 | 再投稿しない（仕様どおり） |

**いずれの場合も、記事公開（main マージ）自体は取り消さない**。X 投稿は best-effort。

## 禁止事項

- ❌ パスワード / 認証コード / OTP をコード・ログ・コミットに残す
- ❌ 自動いいね / 自動フォロー / 自動リプライ（本機能は新記事告知投稿のみ）
- ❌ 同じ内容を大量連投（台帳で防止）
- ❌ Edge を操作する（Chrome のみ）
- ❌ hidden file input を直接クリックする
- ❌ 人間にパスワード入力を求める

## 関連ファイル

- `scripts/sumahon/generate-x-post.mjs` — 投稿文生成ライブラリ（純関数）
- `scripts/sumahon/x-posted-ledger.mjs` — 重複投稿台帳のヘルパー
- `scripts/run/generate-x-post.mjs` — 生成 CLI
- `scripts/run/post-to-x.mjs` — 投稿オーケストレータ CLI
- `scripts/automation/x-post-chrome.ps1` — Chrome 前面化 + クリップボード準備
- `data/social/x-posted.json` — 重複投稿台帳
- `drafts/social/{slug}.x-post.md` — 投稿文ドラフト（人間レビュー用）
- `logs/social/{slug}.x-post.json` — 投稿文 JSON（post-to-x が読む）
- `logs/social/{slug}.x-post-error.json` — 失敗ログ
- `CLAUDE.md` — 全体運用ポリシー
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付の標準（X でも流用）
