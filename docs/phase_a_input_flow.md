# Phase A 入力フロー設計（user-directed mode の起点）

最終更新: 2026-05-30

## 位置づけ

`CLAUDE.md` で定義した **user-directed mode + 3 フェーズフロー** の **最初の入口**を、入力 UI・質問項目・安全停止条件として標準化したもの。

ユーザーが Claude にオーケストレーター指示文を渡したとき、Claude は **「対象がはっきり特定できるか」「処理を始めてよい状態か」を確認してから Phase A に入る**。中途半端な指示で ChatGPT 呼び出しや画像生成（高コスト処理）を走らせない。

関連:
- [`docs/user_directed_mode.md`](user_directed_mode.md) — 3 フェーズ全体
- [`docs/x_post_workflow.md`](x_post_workflow.md) — Phase C
- [`docs/queue_states.md`](queue_states.md) — queue 状態

---

## 1. 入力フローの 5 ステップ

```
[Step 0] オーケストレーター指示文の受信
   ↓
[Step 1] 必須項目チェック（対象種別 + 対象内容）
   ↓
[Step 2] 対象の実在確認・重複チェック
   ↓
[Step 3] 対象確定レポートを表示
   ↓
[Step 4] 停止条件に該当しなければ、自動で Phase A 本処理へ進む
   ↓
[Phase A 本処理]（記事化 → 画像生成 → WebP → build → PR 作成）
   ↓
[Step 5] PR 作成後、Human Review Checkpoint で必ず停止
```

**基本方針：**
- 入力が明確で停止条件に当たらないなら、Phase A 前では止まらず自動で本処理に進む
- 入力が曖昧 / 不明 / 重複ありの場合だけ、Phase A 前に `AskUserQuestion` で止まる
- 記事内容確認のための停止は、**PR 作成後の Human Review Checkpoint** で行う

> user-directed mode では、ユーザーがすでに URL / フォルダ / テーマを指定済み。**毎回「進めて」を待つ二重確認はしない**。

---

## 2. 必須入力項目（5 項目）

| 項目 | 必須 | 値の例 |
|---|---|---|
| 対象種別 | ✓ | `url` / `folder` / `theme` / `site+article` |
| 対象内容 | ✓ | URL 文字列 / フォルダ絶対パス / テーマ名 / サイト名+記事タイトル |
| 参考素材フォルダ | 任意 | `D:\documents\動画作成関連\すまラボ\inbox\<テーマ>` |
| 公開予定日時 | 任意 | `2026-05-30T11:00:00+09:00`（未指定なら **当日 11:00 JST 以降の直近の枠** を自動付与） |
| 備考 | 任意 | 「比較記事として書く」「噂段階として hedge を強めに」など |

> オーケストレーター指示文の末尾「今回の入力」セクションがプレースホルダ（`{...}` のまま）だった場合は **対象未指定** と判定し、Phase A に入らない。

---

## 3. 対象種別ごとの入力 UI（AskUserQuestion テンプレ）

### 3-A. 種別未確定 → 種別を聞く

```
質問: 今回の対象種別はどれですか？
ヘッダー: 対象種別
オプション:
  - URL 指定 — ニュース記事や公式ページの URL を 1 件
  - フォルダ指定 — inbox/<テーマ> の素材一式（ブログ記事.txt + 画像）
  - テーマ指定 — 「○○について書いて」のテーマ名だけ
  - サイト + 記事指定 — 特定サイトの特定記事 URL
```

### 3-B. URL 指定 → URL を聞く

```
質問: 記事化したい URL を貼ってください。複数ある場合は、まず 1 件だけ指定してください。
ヘッダー: 対象 URL
入力形式: 自由テキスト（http または https で始まること）
```

Claude 側の処理:
1. URL が http(s) で始まるか正規化
2. `WebFetch` でアクセス可能か確認（404 / 5xx / robots.txt 等のチェック）
3. 既存記事との重複確認（`content/articles/` のスラッグ・タイトル比較）
4. 既存 PR / queue との重複確認

### 3-C. フォルダ指定 → フォルダ絶対パスを聞く

```
質問: 素材を置いたフォルダの絶対パスを教えてください。
ヘッダー: フォルダパス
入力形式: 自由テキスト
例: D:\documents\動画作成関連\すまラボ\inbox\<テーマ>
```

Claude 側の処理:
1. パスの存在確認（ディレクトリか？）
2. 中身の一覧化（画像 N 枚 / 下書き txt の有無 / 下書きが空でないか）
3. 既存 `_published_articles/<同名>` との重複確認
4. 既存 PR / queue との重複確認

### 3-D. テーマ指定 → テーマと方向性を聞く

```
質問 1: 記事のテーマを 1 文で教えてください。
ヘッダー: テーマ
入力形式: 自由テキスト
例: Google AI Pro の特典まとめ / iPhone 18 Pro の Dynamic Island 噂

質問 2: どんな読者向けに書きますか？
ヘッダー: 読者層
オプション:
  - テック好き — 仕様や数字を多めに
  - 一般読者 — わかりやすさ重視
  - 両方 — 結論先出し + 詳細補足
  - 任せる
```

Claude 側の処理:
1. テーマ名のスラッグ候補生成
2. 既存記事との重複確認
3. 必要な一次情報・参考リンクの候補列挙（実際の取得は Phase A 内）

### 3-E. サイト + 記事指定 → URL を聞く

Claude 側の処理は 3-B と同じ。ただし「指定サイト由来の記事」として `triggerKind: "site+article"` を queue に記録。

---

## 4. 対象確定レポート（Phase A 本処理 開始**前**に表示）

ステップ 1 / 2 を通過したら、本処理に入る前に **対象確定レポートを表示** する。これは進行状況の可視化であり、**ユーザーの「進めて」返答を待つ二重確認はしない**。停止条件（後述）に該当しなければ、レポート表示後そのまま Phase A 本処理に進む。

### 提示フォーマット

```
## 対象確定レポート（Phase A 本処理開始）

### 入力
- 対象種別: {url / folder / theme / site+article}
- 対象内容: {URL / 絶対パス / テーマ名}
- 参考素材フォルダ: {あれば} / なし
- 公開予定日時: {YYYY-MM-DDTHH:MM:SS+09:00}（指定なし → 当日 11:00 JST に仮置き）
- 備考: {あれば}

### 想定 slug
- {slug 候補}

### 重複確認
- content/articles/ の同名・同テーマ記事: なし / あり ({list})
- 既存 PR: なし / あり (#NN)
- queue 内の同一 URL / slug: なし / あり ({status})

### 想定スコープ
- 対象記事数: 1 / N
- ChatGPT 呼び出し予定: 本文整理・スライド生成・サムネ生成・ファクトチェックの 4 系統
- 画像生成予定: スライド N 枚（暫定）+ サムネ 1 枚
- WebP 化対象: スライド N + サムネ 1
- preview ブランチ予定名: preview/{slug}

### 想定外への配慮
- {例: 対象が噂段階の場合は hedge を強める / 公式画像の丸写し回避 など}

### 進行
停止条件に該当しないため、このまま Phase A 本処理を開始します。
記事内容の確認は PR 作成後の Human Review Checkpoint で行います。
```

> **このレポート表示は進行ログ。`AskUserQuestion` はステップ 1 / 2 の停止条件に該当したときだけ使う。** 入力が明確で停止条件に当たらないなら、レポート表示 → そのまま Phase A 本処理へ。

---

## 5. Phase A 前の停止条件

**入力が明確で停止条件に該当しないなら、Phase A 前では止まらない。** 以下に該当したときだけ Phase A 本処理に入らず停止して `AskUserQuestion` で確認する。

| 条件 | 対応 |
|---|---|
| オーケストレーター指示文の「今回の入力」がプレースホルダ（`{...}`）のまま | `AskUserQuestion` で対象種別から聞く |
| 対象種別不明（user 入力に種別キーワードがない） | `AskUserQuestion` で種別を聞く |
| URL 指定だが URL が空文字 / 不正な形式 | URL を再要求 |
| URL 指定だが WebFetch が 404 / 403 / 5xx | エラーを報告し、ユーザーに URL 再確認を依頼 |
| フォルダ指定だがパスが存在しない | パスの再要求 |
| フォルダ内の対象が不明（画像も下書き txt も両方ない、もしくは構成が判断不能） | 素材未投入と判定して停止 |
| 対象外ファイルが混ざり、処理範囲を判断できない | 範囲を `AskUserQuestion` で確認 |
| 同名 slug / 同 URL / 同テーマの既存記事がある | 「上書き / 別 slug で進める / 中止」を `AskUserQuestion` で聞く |
| 同一 URL / slug の queue エントリがある（status が `published` / `x_posted` / `failed` 以外） | 既存ジョブとの重複として停止 |
| 同一対象の既存 PR が OPEN 状態 | 既存 PR を再利用するか新規にするかを聞く |
| 対象種別が「テーマ」だが、テーマ文字列が極端に短い（10 字未満） | テーマの具体化を要求 |
| `triggerInput` が複数同時指定（例: URL とフォルダの両方） | 1 件ずつ処理する旨を伝えて、どちらから進めるかを聞く |
| 複数記事処理になりそうだが、ユーザーが「まとめて」と明示していない | 件数と各 slug 候補を列挙し「まとめて OK か / 1 本ずつか」を聞く |
| 高コストな ChatGPT 画像生成に進む前に、対象がそもそも不明確 | 確定するまで停止 |

> **停止条件に該当しないなら、対象確定レポートを表示してそのまま Phase A 本処理へ。**
> **記事内容確認のための停止は、Phase A 完了後の Human Review Checkpoint（PR 作成後）で行う。**

---

## 5-bis. 画像生成経路の必須条件（Phase A 本処理 *中*の停止条件）

ユーザー指示で **スライド・サムネの新規生成が必須** の場合、画像生成経路は **Phase A の必須条件** として扱う。本文 MDX だけで PR を作成しない。

### 画像生成必須かどうかの判定

| 状況 | 画像生成必須？ |
|---|---|
| オーケストレーター指示文に「スライド」「サムネ」「ChatGPT を使い画像生成」等の記述あり | 必須 |
| 素材フォルダ指定で **既存スライド/サムネが置かれている** | 不要（既存画像を WebP 化して使う） |
| 素材フォルダ指定で **画像が置かれていない** | 必須 |
| ユーザーが明示的に「画像なしで進めて」と返答済み | 不要 |
| 上記いずれにも該当しない（既存記事補修など） | 不要 |

### 画像生成経路が使えるかの事前チェック

Phase A 本処理に入った直後、以下を確認する：

1. **`mcp__claude-in-chrome__*` ツール群がロードされているか**
   - 未ロード → `ToolSearch` で `claude-in-chrome` 検索 → ロード可なら続行
   - 検索しても出ない → 経路なし
2. **Chrome 拡張がペアリングされているか**
   - `~/.claude.json` の `chromeExtension.pairedDeviceName` を確認（実体は読み取り不可でも、画像生成試行時にエラーになれば検知可能）
   - ペアリングが **Edge / その他のブラウザ** になっている場合は経路なし扱い（CLAUDE.md ポリシーで Edge 禁止）
3. **ChatGPT セッションが開ける状態にあるか**（Chrome MCP でナビゲーション可能か）

### 画像生成不可と判定した場合の挙動

**本文 MDX だけで PR を作成しない。** 次の挙動を取る：

1. queue のエントリ status を `blocked_image_generation_unavailable` にする
2. 報告に下記を含める：
   - 何が必須なのに未実行か（スライド N 枚 / サムネ 1 枚）
   - 経路不通の原因（Chrome MCP 未ロード / 拡張未接続 / Edge ペアリング 等）
   - 復旧手順（後述）
   - 再開時にすべきこと
3. **下書きの本文だけは作って `drafts/generated/{slug}.md` に保存してよい**（後で活かすため）
4. **PR は作らない**。すでに作ってしまっていた場合は Draft 化し、コメントで blocked と明示する
5. ユーザーが **明示的に「画像なしで進めて」と返答** したときだけ、画像なし PR を許可（その場合も Checkpoint 報告で画像未生成を明示）

### 復旧手順（Chrome MCP / ChatGPT 画像生成経路）

| 症状 | 復旧手順 |
|---|---|
| `mcp__claude-in-chrome__*` が ToolSearch でも出ない | Claude Code 側で MCP サーバー登録が必要。`claude mcp add` 等で `claude-in-chrome` を追加するか、Claude Code を再起動して再ロード |
| `~/.claude.json` の `chromeExtension.pairedDeviceName` が **Edge / 他ブラウザ** | Chrome を起動し、Claude in Chrome 拡張で再ペアリング（Edge ではない Chrome プロファイルから） |
| Chrome 拡張は入っているが Claude Code から見えない | Claude Code を再起動し、Chrome 拡張のデバイスコードで再認証 |
| ペアリング済みだが ChatGPT が開けない | Chrome プロファイルを ChatGPT ログイン済みのものに切り替え |

復旧後、新しい Claude Code セッションで `mcp__claude-in-chrome__*` がロードされていることを確認してから Phase A を再開する。

### 既存ブランチがある場合の再開

すでに `preview/<slug>` ブランチで blocked 状態の PR が立っている場合は、**同じブランチに追加コミット** でスライド/サムネ・WebP・MDX 修正を載せ、Draft → Ready に戻して Human Review Checkpoint で停止する。新しい PR は作らない（無駄な分岐を避ける）。

---

## 6. Phase A 本処理での記録

対象確定レポート表示後（停止条件に該当しない場合）、Phase A 本処理開始時に queue に下記エントリを追加（status: `user_directed_queued` → `article_generated` → `review_waiting`）。

```json
{
  "slug": "<生成slug>",
  "title": "<想定タイトル>",
  "addedAt": "<ISO 8601>",
  "status": "user_directed_queued",
  "statusUpdatedAt": "<ISO 8601>",
  "source": "user_directed",
  "triggeredBy": "user",
  "triggerKind": "url | folder | theme | site+article",
  "triggerInput": "<URL or 絶対パス or テーマ名>",
  "intakeReportShownAt": "<対象確定レポートを表示した時刻>"
}
```

---

## 7. Phase A 完了報告（既存テンプレ）

Phase A 本処理が完了したら、`CLAUDE.md` の **Phase A 完了報告テンプレ** に沿って次を提示して停止（Human Review Checkpoint）：

- slug / タイトル / カテゴリ / queue status (`review_waiting`)
- 検証（sourceCheck / articleQualityCheck / 禁則チェック / build / 画像圧縮結果）
- 自動化結果（preview ブランチ / PR / Preview URL / visual-review）
- ユーザーに確認してほしい点
- 「公開へ進める場合は『記事OK、公開へ』と指示してください」

---

## 8. 推奨実装パターン（Claude 側の挙動）

```
1. オーケストレーター指示文を読む
2. 「今回の入力」セクションを抽出
3. 必須項目（対象種別 / 対象内容）が揃っているか判定
   - 揃っていない → AskUserQuestion で不足を聞く（ステップ 3-A〜3-E）
   - 揃っている  → 次へ
4. 対象の実在確認・重複チェック
   - 停止条件（section 5）に該当 → AskUserQuestion で判断を聞く（既存記事との衝突など）
   - 問題なし → 次へ
5. 対象確定レポートをテキスト出力（進行ログ）
6. そのまま Phase A 本処理を自動開始
   - 「進めて」を待つ二重確認はしない
7. Phase A 本処理（対象確認 → MDX 化 → 画像生成 → WebP → build → PR 作成）
8. Phase A 完了報告（Human Review Checkpoint）→ 必ず停止
   - ユーザー明示了承（「記事OK」「公開へ」等）が来るまで Phase B / C へ進まない
```

> **停止ポイントは原則 1 つ：PR 作成後の Human Review Checkpoint。** Phase A 前の停止は、入力が曖昧 / 重複ありなど停止条件に該当したときの例外動作。

---

## 9. 改訂履歴

| 日付 | 変更内容 |
|---|---|
| 2026-05-30 | 初版。オーケストレーター指示文の入力フロー・5 入力項目・AskUserQuestion テンプレ・対象確定レポート・安全停止 12 条件を定義。 |
| 2026-05-30 (rev2) | Phase A 前の「進めて」二重確認を廃止。入力が明確なら対象確定レポート表示後そのまま自動で本処理へ進む方針に変更。停止ポイントは PR 作成後の Human Review Checkpoint に一本化。 |
| 2026-05-30 (rev3) | section 5-bis を追加。画像生成必須時は本処理冒頭で Chrome MCP / ChatGPT 経路の事前チェックを義務化し、経路不通なら `blocked_image_generation_unavailable` で停止。本文 MDX だけで PR を作成しない（ユーザーが「画像なしで進めて」と明示した場合のみ例外）。Meta One 記事 PR #81 で本ルール未整備が顕在化したのを受けた追加。 |
