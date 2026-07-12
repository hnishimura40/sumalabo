# X 投稿フロー（Phase C）— 安全条件と手順

最終更新: 2026-05-27

## 位置づけ

`CLAUDE.md` の **Phase C: X 投稿フェーズ** の詳細。すまラボの本番公開記事を `@suma_labo` から X に投稿する際の安全条件・前後チェック・queue 記録までを定義する。

> X 投稿は **Phase B（公開）が成功したあとだけ** 実行する。Phase A だけ完了している段階・ユーザー記事確認前・strict verify 失敗時は **絶対に投稿しない**。

## 前提条件（**すべて**満たすこと）

| 項目 | 確認方法 |
|---|---|
| ユーザーが記事内容を了承済み | チャットで「記事OK」「公開へ」「承認」等の明示返答を受け取った |
| PR merge 済み | `gh pr view <N> --json state` で `MERGED` |
| main 同期済み | `git log --oneline -1` で merge commit が含まれる |
| wrangler 本番 deploy（正規手順）成功 | `deploy-production-from-main.mjs` の `wrangler.status: ok` |
| strict verify 8/8 pass | `/api/verify-publication` で `failedChecks: []` |
| 本番URLが開ける | `https://sumalabo.com/articles/<slug>/` が 200 で記事内容が出る |
| 投稿アカウント = @suma_labo | Chrome の X 画面で右上アカウントを目視確認 |
| Chrome を使用 | Edge は使わない |

**1 つでも欠けていたら投稿しない。**

## 投稿前チェック

X 投稿画面に本番URL を貼り付けた直後に必ず確認:

| チェック | OK 条件 |
|---|---|
| OGP カード | URL の下にカードが表示される（プレビューが出る） |
| サムネ | カード内にすまラボのサムネが表示される |
| タイトル | カード内タイトルが記事内容と合っている |
| サムネが古くない | 直近で差し替えた場合、`X-Cache-Control` 等で古いサムネが残っていないか |
| 投稿文に URL を含む | URL を消していない |
| 投稿文に禁則表現がない | 「普通の人」「すまほん」「smhn」など |
| 誤字脱字 | 投稿文を最低 1 回読み直す |
| 投稿アカウント | @suma_labo（@suma_labo 以外で投稿しない） |

## 投稿してはいけない条件（**1 つでも該当したら停止**）

- ❌ サムネが古い（差し替え後の最新版でない）
- ❌ タイトルが違う
- ❌ strict verify 失敗
- ❌ 本番URL が開けない
- ❌ 投稿アカウントが @suma_labo ではない
- ❌ ユーザー了承前
- ❌ 記事確認前

> ⚠️ 「X カードが出ない / サムネが出ない」は**即停止条件ではない**。下記のタイムボックス内で処理し、上限超過なら text_only で即投稿する（2026-07-12 改訂）。

## Phase C の事前チェックはタイムボックスで打ち切る（2026-07-12・鉄則）

**背景**: OGP カードは新規 URL の negative-cache（unfurl 遅延）でほぼ出ない。カード待ち・画像添付の試行錯誤に粘るとトークンを浪費する（2026-07-12 に「背面タブとの格闘」で実害）。**粘ることを禁止**し、以下の上限で必ず打ち切る。

- **上限: 合計 5 分 / 試行 3 回まで**（カード確認 + 再 unfurl + 画像添付の合計）。この上限を超えたら、**その時点の composer 内容（text のみでよい）で即投稿して Phase C を終える**。カードは X の事後クロールに任せる（live tweet には数分〜で自動反映されることが多い）。
- **タブ背面時（`document.visibilityState !== "visible"`）は画像添付を最初から試みない**。背面タブでは OS クリップボード貼り付けが成立しないと 2026-07-12 に実証済み。背面を検知したら**カード確認 1 回だけ→出なければ即 text_only 投稿**。合成 File 注入などの重い回避策は使わない。
- **前面タブ時の標準フロー**: ①URL を貼る→カード確認（〜1 分）②出なければ再 unfurl 1 回（〜1 分）③まだ出なければサムネ WebP を composer に画像添付（`public/images/thumbnails/{slug}.webp`）→添付を DOM 検証して投稿。①〜③で合計 5 分 / 3 回を超えない。
- **どの経路でも投稿は 1 回のみ・二重投稿禁止。**
- **台帳の `xPostVariant`**: カード表示で投稿 = `card` / 画像添付 = `image_attach` / 上限超過や背面で text のみ = `text_only`（`note` に理由を残す）。
- text_only は**失敗ではなく正常終了**として扱う（リンク・アカウント・本文が正しければ完了）。

停止時は次を報告:

- どのチェックで止まったか
- 想定原因（OGP cache 待ち / サムネ差し替え反映前 / アカウント切替忘れ / タブ背面 等）
- 次に試すこと（前面化して画像添付し直す 等。ただし当該 run 内では粘らない）

## 投稿後の記録

投稿が完了したら次を取得・記録:

1. **投稿URL** — Chrome の URL バーから `https://x.com/suma_labo/status/<id>`
2. **投稿時刻** — `YYYY-MM-DDTHH:MM:SS+09:00`
3. **投稿文** — 投稿欄に入れた全文（先頭抜粋でもよいが queue には全文保存）

queue 更新（`data/automation/sumahon-queue.json`）:

```json
{
  "status": "x_posted",
  "xPostUrl": "https://x.com/suma_labo/status/...",
  "xPostedAt": "2026-05-27T13:30:00+09:00",
  "xPostText": "...",
  "source": "user_directed",
  "triggeredBy": "user",
  "triggerKind": "folder",
  "triggerInput": "D:\\\\documents\\\\動画作成関連\\\\すまラボ\\\\inbox\\\\<テーマ>"
}
```

> queue 書き換え前に必ずバックアップ（`sumahon-queue.json.bak-<timestamp>.json`）を作る。

## 投稿文ルール

- **短め** — 140 文字を狙う（X のリーチを意識）
- **URL を含める** — OGP カードのために必須
- **ハッシュタグ 2〜3 個** — 入れすぎない
- **「普通の人」表現禁止** — 代わりに「今見るべき点」「判断ガイド」など
- **煽らない** — 「絶対」「100％」「必見」等は避ける
- **記事内容に沿う** — 記事の核となる結論を 1 文で要約

### 雛形

```
{記事のフック 1 文}

{記事の結論 / 見どころ 1 文}

→ {本番URL}

#すまラボ #{記事の主要トピック} #{記事の従属トピック}
```

## 投稿経路

| 経路 | 利用条件 |
|---|---|
| Chrome MCP（claude-in-chrome） | 通常はこちら。DOM が安定して操作できる |
| computer-use（Chrome を直接操作） | Chrome MCP が使えないときのフォールバック |

> Edge / Firefox / Safari は使わない。OS 標準のブラウザでなく **必ず Chrome を開く**。

## X 投稿案だけ作るケース（Phase A 終了直後）

Phase A 完了時に **投稿案だけ作成して保存しておく** のは OK。投稿はしない。

保存先: `drafts/social/{slug}.x.md`

例:

```markdown
# X 投稿案 — {slug}

## 投稿文（草案）
{投稿文 1 文目}
{投稿文 2 文目}
→ {本番予定URL}

#すまラボ #{topic1} #{topic2}

## メモ
- 候補ハッシュタグ: ...
- 候補フック: ...
- リーチ予想: 普通 / 高め / 低め
- 投稿時刻の最適候補: 朝 7-8 時 / 昼 12-13 時 / 夜 20-22 時
```

## 失敗時の挙動

| 失敗 | 対応 |
|---|---|
| OGP カードが出ない | **合計 5 分 / 3 回まで**で打ち切り（前面タブなら画像添付を試す・背面タブなら添付せず即 text_only）。上限超過で text_only 即投稿。粘らない。カードは事後クロール任せ |
| Chrome に X 画面が出せない | Chrome MCP の再接続 → computer-use にフォールバック → それでもダメなら投稿停止 |
| 投稿後に投稿URL を取得できない | X 上で `@suma_labo` のプロフィールから最新ポストの URL を取得。queue 更新は手動でも構わない |
| アカウントが @suma_labo ではない | 投稿を取り消し、ログインし直し → 再投稿。queue には失敗ログを残す |

## 関連

- `CLAUDE.md` — 全体ポリシー
- `docs/user_directed_mode.md` — Phase A / B / C と Checkpoint
- `docs/queue_states.md` — queue 状態遷移
- `scripts/run/generate-x-post.mjs` — 投稿案の自動生成（草案生成のみ。投稿はしない）
- `scripts/run/post-to-x.mjs` — 投稿実行（**Phase C の前提条件を満たした時にだけ呼ぶ**）
