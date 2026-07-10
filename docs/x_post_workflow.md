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

> ⚠️ 「X カードが出ない / サムネが出ない」は**即停止条件ではなく、下記の自動フォールバック対象**に変更（2026-07-10）。カード待ちで 2 時間ループする事故を防ぐため。

## カードが出ない場合の自動フォールバック（2026-07-10 追加）

- OGP カードが出ない原因はほぼ「新規 URL の negative-cache（unfurl 遅延）」。待てば解消するが 2 時間超のループになり得るため、**長時間の待ちループを続けない**。
- 手順：URL を composer に貼る → カード未表示なら再 unfurl（URL 打ち直し / 全消し→再入力）を試みつつ、**15 分間隔で最大 2 回（＝約 30 分）**確認する。
- **2 回確認してもカードが出なければ、サムネ画像添付方式に自動フォールバックしてよい**：本番記事のサムネ WebP（`public/images/thumbnails/{slug}.webp` 相当）を composer に画像添付 → 添付を DOM/目視で検証してから投稿。カード鉄則の例外として、この経路を自動で選んでよい。
- フォールバック時は台帳に **`xPostVariant: "image_attach"`** を記録（通常カード投稿は `card`）。
- 画像添付でも **投稿は 1 回のみ・二重投稿禁止**。composer に画像が乗っていることを確認してから送信する。

停止時は次を報告:

- どのチェックで止まったか
- 想定原因（OGP cache 待ち / サムネ差し替え反映前 / アカウント切替忘れ等）
- 次に試すこと（フォールバック実行 / 手動でサムネ URL 直叩き等）

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
| OGP カードが出ない | 再 unfurl しつつ 15 分間隔で最大 2 回（約 30 分）確認 → それでも出なければ**サムネ画像添付方式に自動フォールバック**（`xPostVariant: image_attach` を記録）。投稿は 1 回のみ |
| Chrome に X 画面が出せない | Chrome MCP の再接続 → computer-use にフォールバック → それでもダメなら投稿停止 |
| 投稿後に投稿URL を取得できない | X 上で `@suma_labo` のプロフィールから最新ポストの URL を取得。queue 更新は手動でも構わない |
| アカウントが @suma_labo ではない | 投稿を取り消し、ログインし直し → 再投稿。queue には失敗ログを残す |

## 関連

- `CLAUDE.md` — 全体ポリシー
- `docs/user_directed_mode.md` — Phase A / B / C と Checkpoint
- `docs/queue_states.md` — queue 状態遷移
- `scripts/run/generate-x-post.mjs` — 投稿案の自動生成（草案生成のみ。投稿はしない）
- `scripts/run/post-to-x.mjs` — 投稿実行（**Phase C の前提条件を満たした時にだけ呼ぶ**）
