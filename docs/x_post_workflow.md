# X 投稿フロー（Phase C）— 安全条件と手順

最終更新: 2026-07-27

## 位置づけ

`CLAUDE.md` の **Phase C: X 投稿フェーズ** の詳細。すまラボの本番公開記事を `@suma_labo` から X に投稿する際の安全条件・前後チェック・queue 記録までを定義する。

> X 投稿は **Phase B（公開）が成功したあとだけ** 実行する。Phase A だけ完了している段階・ユーザー記事確認前・strict verify 失敗時は **絶対に投稿しない**。

> **標準経路（Hiro決定・2026-07-27）**: 昼の立ち会い運用は **Codex対話モード（Chrome拡張を基本、内蔵Browserを補助）**で実行する。`claude-in-chrome` は非常用フォールバック。これは7/23の「Codexへ移行する価値なし」判定を、対話モードでは安定したというHiro実測で上書きする決定。

## 前提条件（**すべて**満たすこと）

| 項目 | 確認方法 |
|---|---|
| ユーザーが記事内容を了承済み | チャットで「記事OK」「公開へ」「承認」等の明示返答を受け取った |
| PR merge 済み | `gh pr view <N> --json state` で `MERGED` |
| main 同期済み | `git log --oneline -1` で merge commit が含まれる |
| wrangler 本番 deploy（正規手順）成功 | `deploy-production-from-main.mjs` の `wrangler.status: ok` |
| strict verify 8/8 pass | `/api/verify-publication` で `failedChecks: []` |
| 本番URLが開ける | `https://sumalabo.com/articles/<slug>/` が 200 で記事内容が出る |
| 投稿アカウント = @suma_labo | アカウント切替ボタン等の DOM（表示名・aria-label・innerText）に `@suma_labo` があることを確認 |
| Chrome を使用 | Edge は使わない |

**1 つでも欠けていたら投稿しない。**

## 投稿形式（2026-07-14 改訂・バズ強化）= 画像4枚の本投稿＋リプライに記事リンク

**既定を「リンク付き投稿1本」→「スライド画像4枚を直接添付した本投稿＋リプライに記事リンク」に変更。**
X はリンク付き投稿の露出を絞るため、画像単体投稿の方がインプレッションが伸びる。スライドは単体で読める設計なので相性が良い。

- 設定は `data/automation/autonomy.json` の `xPostOptions`:
  `attachSlides:true` / `attachSlidesCount:4` / `leadWithThumbnail:true` / `linkInReply:true`。
- **本投稿**: 画像4枚＋短い本文＋ハッシュタグ（カテゴリ1＋`#すまラボ`＋X検索で生存確認済みの題材最大2、合計2〜4個）。題材なしの2個投稿を正常系とする。**本投稿に記事リンクを入れない。**
- **リプライ**: 本投稿の直後に、その投稿へのリプライで **記事リンクを1件だけ**付ける（`logs/social/{slug}.x-post.json` の `reply.text` をそのまま使う）。
- 添付する画像・本文・リプライ文はすべて `npm run social:generate-x-post -- --slug <slug>` が `logs/social/{slug}.x-post.json`（`attachmentPlan.attach` / `primary` / `reply`）に出力する。
- **投稿は本投稿＋リプライの2ツイートのみ・二重投稿禁止**（本投稿を2回送らない）。

### 投稿前チェック（画像投稿）

| チェック | OK 条件 |
|---|---|
| 添付画像 | 本投稿に4枚（1枚目=サムネ）が乗っている。DOM で枚数を確認してから送信 |
| サムネが古くない | 差し替え後の最新サムネか（`public/images/thumbnails/{slug}.webp`） |
| 本投稿にURLが無い | 記事リンクは本投稿に入れない（リプライ側） |
| リプライにリンク | 本投稿直後のリプライに記事リンク1件 |
| 投稿文に禁則表現がない | 「普通の人」「すまほん」「smhn」など |
| 誤字脱字 | 本文・リプライ文を最低 1 回読み直す |
| 投稿アカウント | @suma_labo（それ以外で投稿しない） |

### 投稿してはいけない条件（**1 つでも該当したら停止**）

- ❌ サムネ/スライドが古い（差し替え後の最新版でない）
- ❌ 添付画像が composer に乗っていない（枚数不一致）
- ❌ strict verify 失敗 / 本番URL が開けない
- ❌ 投稿アカウントが @suma_labo ではない
- ❌ ユーザー了承前 / 記事確認前

### タイムボックス（粘らない・2026-07-12 の原則は維持）

- **画像添付は前面タブで行う**（背面タブでは OS クリップボード貼り付けが成立しない。前面化 1 回確認）。
- 画像4枚の添付は `x-post-chrome.ps1 -ImagePaths <4枚>` でまとめて CF_HDROP → 前面タブで Ctrl+V、または 1 枚ずつ添付。**添付枚数を DOM 検証してから送信**。
- **OGP カード待ちはしない**（本投稿は画像なのでカード不要）。リプライのリンクがカード化するかは待たない。
- 画像添付が合計 5 分 / 3 回試しても乗らない場合のみ、**サムネ1枚だけの画像投稿**にフォールバックしてよい（リプライのリンクは維持）。それも不可なら text_only（本投稿にリンク）で即投稿して終える。
- **台帳の `variant`**: 画像4枚＋リンクリプライ = `images4+reply` / サムネ1枚のみ = `images1+reply` / フォールバックで本投稿リンク = `text_only`（`note` に理由）。
- どのフォールバックでも **投稿は最小回数・二重投稿禁止**。

停止時は次を報告: どのチェックで止まったか / 想定原因 / 次に試すこと（当該 run 内では粘らない）。

## 投稿確定の検証ループ（必須・2026-07-19 恒久対策「最後の1クリック問題」）

**「ポストする/返信ボタンをクリックした＝投稿できた」という前提を廃止する。** アップロード未完了・送信ボタンの取りこぼし・beforeunload 等で、クリックしても投稿が確定していないことがある（Kimi K3 記事で、リプライが「返信数 0」のまま未投稿だったのを、作業後の再検証で発見）。**クリック後に DOM で実在を確認するまで、その投稿を「完了」としない。**

検証スニペットは `scripts/sumahon/x-post-verify.mjs`（`accountIdentityJs(expectedHandle)` / `postExistsJs(uniqueText)` / `replyExistsJs(uniqueText, parentStatusId)` / `REPLY_COUNT_JS` / `MEDIA_COUNT_JS` / `SEND_READY_JS`）。Codex対話モードのBrowser / ChromeでDOM検証に使う。

### 本投稿の検証（画像4枚の本投稿）

1. **「ポストする」を Codex のDOM操作でクリック**。
2. **5 秒待機**。
3. プロフィール **`https://x.com/suma_labo`** を開き、`postExistsJs(先頭12〜20文字の一意な部分文字列)` を実行。
   - **`verdict:'confirmed'`（count===1）** → 確定。**この直後に台帳を書く**（下記）。
   - **`verdict:'not_posted'`（count===0）** → 未確定。`SEND_READY_JS` が `ready:true`（アップロード完了・ボタン活性）になるまで待ってから **再クリック**。本投稿のクリックは**最大 2 回**まで。
   - **`verdict:'duplicate'`（count>=2）** → **二重投稿**。追加投稿せず停止し、重複を報告（手当てが必要）。
4. 2 回試しても `not_posted` のままなら、**本投稿は「未投稿」と明確に報告**して終える（粘らない）。

> 本投稿の実在確認は **プロフィールで一意本文の件数を数える**方式にする。これは「クリック取りこぼし（0件）」と「二重投稿（2件以上）」の両方を同時に検出できる。

### リプライの検証（記事リンク）

1. **クリック前に** `REPLY_COUNT_JS` で親（本投稿）の**返信数 N を控える**。
2. 返信 / `tweetButtonInline` を Codex のDOM操作でクリック（座標クリックがスケールでずれる場合は要素 `.click()` でも可）。
3. **5 秒待機**。
4. `REPLY_COUNT_JS` を再取得。
   - **返信数 N→N+1 かつ `composerCleared:true`** → `https://x.com/suma_labo/with_replies` で `replyExistsJs(リプライ本文の一意文字列, 親投稿ID)` を実行。
   - **`count===1`** → 確定。**この直後にリプライを台帳へ書く**。`count===0` は未投稿、`count>=2` は重複として停止。
   - 増えていない → `SEND_READY_JS` が `ready` になるまで待って **再クリック**（最大 2 回）。
   - 2 回試しても増えなければ、**リプライは「未投稿」と明確に報告**（本投稿は投稿済みのまま維持）。

> リプライは **親投稿の返信数が +1 されたか**が最も確実な確定信号（Kimi K3 では「0 件の返信」→「1 件の返信」で判定できた）。コンポーザーのプレビュー表示を「投稿済み」と誤認しない。

### タイムボックス（検証ループも粘らない）

- 各投稿につき **クリック＋検証は最大 2 回**。それ以上は繰り返さない。
- 未確定で終える場合は、**本投稿・リプライそれぞれの実在状態（投稿済み / 未投稿）を明記**して報告し、`--error` を残す。曖昧なまま「たぶん投稿できた」で終えない。

## 投稿後の記録（★確定を確認した直後に書く）

**台帳は作業の最後にまとめて書かない。投稿確定を DOM で確認した“その場で”書く。** セッションが途中で切れても、台帳を見れば投稿済み / 未投稿が必ず分かる状態にするため。

- **本投稿が確定した直後**: `data/automation/ledger.json` に `status: x_posted` / `xPostUrl` を書く。加えて dedup 台帳 `node scripts/run/post-to-x.mjs --record --slug <slug> --postUrl <本投稿URL> --route codex`。
- **リプライが確定した直後**: `data/automation/ledger.json` に `xReplyUrl` を追記し、dedup 台帳も `node scripts/run/post-to-x.mjs --record-reply --slug <slug> --replyUrl <リプライURL> --route codex` で同じレコードを更新する（本投稿とリプライを**別々に**記録する。片方だけ確定した状態も台帳に正しく残す）。
- 未確定で終えたら: `status` を確定させず（または `x_post_pending` 等）、`node scripts/run/post-to-x.mjs --error --slug <slug> --reason '<本投稿/リプライの実在状態>'` を残す。

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
- **URL は本投稿に入れない** — 画像投稿にするため。記事リンクは**リプライ**に置く（`linkInReply`）
- **題材タグはXで生きているものだけ最大2個** — `subjectHashtagCandidates`をOR指定して投稿直前に「最新」で1回検索し、過去7日以内に3投稿以上・3アカウント以上を確認。満たさない候補は付けず、カテゴリ＋`#すまラボ`だけで投稿する
- **造語・巨大タグ禁止** — 空白やハイフンを除去した連結タグを生成しない。モデル名は`#Claude`等の短い既存タグへ。企業名単体、`#Google`・`#Apple`級の巨大一般タグは候補外
- **「普通の人」表現禁止** — 代わりに「今見るべき点」「判断ガイド」など
- **煽らない** — 「絶対」「100％」「必見」等は避ける（タイトルの感情強度は本文/gate側で担保）
- **記事内容に沿う** — 記事の核となる結論を 1 文で要約

### 雛形（本投稿＝画像4枚＋短文。リンクはリプライ）

本投稿:
```
{記事のフック 1 文}

{記事の結論 / 見どころ 1 文}

#すまラボ #{記事の主要トピック}
```
（画像4枚: 1枚目=サムネ / 2〜4枚目=slide01・02・03）

リプライ（本投稿にぶら下げる）:
```
記事で続きと出典まで読めます👇
{本番URL}
```

## 投稿経路

| 経路 | 利用条件 |
|---|---|
| Codex対話モード＋Chrome拡張 | **標準**。ログイン済みChromeを使い、画像添付・DOM検証・投稿を行う |
| Codex対話モード＋内蔵Browser | 補助。DOM確認やテキストのみの操作に使える。ファイル添付の自動化はChrome拡張を使う |
| claude-in-chrome | **非常用フォールバック**。利用時は理由と `route: "claude-in-chrome"` を完了報告・台帳へ残す |

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
| 画像4枚が添付できない | **合計 5 分 / 3 回まで**で打ち切り。サムネ1枚だけの画像投稿(`images1+reply`)にフォールバック→それも不可なら text_only(本投稿にリンク)で即投稿。粘らない |
| リプライのリンクにカードが出ない | 待たない（本投稿は画像なのでカード不要。リプライのカードは事後クロール任せ） |
| Codexから X 画面を操作できない | CodexのChrome拡張を再接続 → 内蔵Browserで再確認 → 非常用 `claude-in-chrome` へ退避。退避理由を必ず報告 |
| 投稿後に投稿URL を取得できない | X 上で `@suma_labo` のプロフィールから最新ポストの URL を取得。queue 更新は手動でも構わない |
| アカウントが @suma_labo ではない | 投稿を取り消し、ログインし直し → 再投稿。queue には失敗ログを残す |

## 関連

- `CLAUDE.md` — 全体ポリシー
- `docs/x-post-codex-procedure.md` — Codexセッションへ貼る定型指示文
- `docs/user_directed_mode.md` — Phase A / B / C と Checkpoint
- `docs/queue_states.md` — queue 状態遷移
- `scripts/run/generate-x-post.mjs` — 投稿案の自動生成（草案生成のみ。投稿はしない）
- `scripts/run/post-to-x.mjs` — 投稿実行（**Phase C の前提条件を満たした時にだけ呼ぶ**）
