# CLAUDE.md — すまラボ自動化の役割分担と運用ポリシー

## 2026-08-01 公開前人手ゲート全廃（最優先・旧記載を上書き）

**画像内文字の一体生成（2026-08-07 Hiro決定）**: 文字を含むサムネイル・本文図解は、文字まで含めた一枚絵として生成する。「文字なしベース画像＋固定座標の文字帯・ラベル・パネル後乗せ」は禁止する。例外は、実機スクリーンショット上の実際のUI位置へ番号・説明を付ける専用注釈（`tmp/google-vids/annotate-screenshot.mjs`型）だけ。`tmp/qwen38-compose.mjs` は使い捨てであり、他記事・再生成・自動工程へ流用しない。

立ち会い・夜間を問わず、記事・画像の公開前チェックは機械検品だけで行う。Hiroによる9枚確認、30秒確認、Human Review Checkpoint、承認証跡待ちは廃止した。公開前に人の確認・応答を待つゲートを新設してはならない。品質・安全の機械ゲートが自動修正後も不合格の場合だけ停止・報告する。公開後にHiroが問題を見つけた場合は、該当画像を再生成→独立検品→差し替え→キャッシュパージする事後修正方式で統一する。

2026-08-01〜2026-08-08は計測モードとし、障害対応以外の装備変更を禁止する。run報告には「無人完走できたか / 人の介入の有無 / 理由」を1行で記録し、期間終了時に無人完走率と公開後発見の破綻件数を集計する。

Claude API等の一過性エラーは30分後に1回だけ自動再試行する。push直前は npm run security:scan を必須とし、検出時だけ停止する。完了報告は全経路で npm run report:filter を通す。

このドキュメントは、すまラボ記事作成・公開ワークフローにおける **Codex / Claude Code / ブラウザ操作経路がやること** と **人間（運営者）がやること** の境界を固定するためのものです。今後のセッションでもこのポリシーを **既定** として動きます。

## 運用モード（2026-05-23 以降）

**現在のモード： 完走型 + 機械検品 + 公開後事後修正**

**Autonomy Level: 1 (L1)** — 状態は `data/automation/autonomy.json`、定義は [`docs/autonomy.md`](docs/autonomy.md)。この表記は autonomy.json の `level` と連動させる（変更時は両方更新）。**Claude が level を勝手に変更するのは禁止**（昇格・veto窓短縮はクリーン実績を根拠にユーザーが宣言する。自動降格だけは error budget 規定＝直近10記事で incident 2件以上→level -1 が適用される）。`paused: true`（kill switch）のときは finalize / Phase B / Phase C とも即停止する。

**恒久無人運転（nightRun・2026-07-11 ユーザー承認）**: testMode（3本限定）完走を受け、夜間の無人 run は `autonomy.json` の `nightRun` による恒久運転（毎日 4:30 / scout 自動選定 / 1 晩 1 本 / weeklyCap 7）。恒久ガード＝incident 2 件で自動停止・kill switch・gate/factcheck/verify/rollback 従来どおり。scout 候補が閾値 50 未満の日は安全スキップ。scout の選定は criticality（自分ごと度）＋**日本自分ごと度 4 軸（a:日本影響 / b:価格・制度 / c:公式か噂か / d:日本の類似で書ける）**で採点し、海外限定・「日本は対象外」で日本を書けない候補は自動的に不適格にする（「日本は未定」で終わる記事を選ばない）。定義: [`docs/autonomy.md`](docs/autonomy.md) §6。**この無人 run は「ユーザー指定なしの自動収集をしない」原則の承認済み例外**。`nightRun.enabled` の再有効化はユーザー宣言のみ。

**夜間run起動層の凍結（2026-07-30 Hiro決定）**: `scripts/automation/night-run.ps1`、`night-process-runner.mjs`、`register-night-task.mjs`、`night-watchdog.ps1` およびタスクスケジューラ登録内容は、当面**障害対応以外の改修禁止**。4日で3回、起動層の変更直後に障害が発生したため、機能追加・リファクタ・自己診断拡張を理由に触らない。障害対応時も、実登録XMLの本番引数確認、禁止テストフラグ検査、`schtasks /Run`による本番同等パス受入を必須とする。
**昼の立ち会い制作も完走型（2026-07-12 ユーザー承認）**: ユーザーが対話セッションで**記事制作を明示指示**したら、**Human Review Checkpoint を廃止し、Phase A → B → C（公開・X 投稿）まで確認なしで完走**する。停止してよい例外は「除外カテゴリ該当（訴訟/事故/人事/買収/政治）」と「品質・安全のブロック（事実未確認・gate 不合格・build/deploy/verify 失敗・画像生成経路不可）」の 2 つだけ。**事後の取り消しは `npm run retract`**。詳細: [`docs/autonomy.md`](docs/autonomy.md) §7。ユーザーが「下書きだけ」「確認したい」等と明示したときのみ従来どおり途中停止する。

**公開前画像確認（2026-08-01 Hiro決定）**: 人手確認は全廃。一次独立検品と手の二段検品を通過したら、立ち会い・夜間とも人の応答を待たず公開する。

**着手前の現状態照合（2026-07-20）**: タスクを始める前に、必ず `git log`・対象ファイル・公開ログ・本番状態を指示内容と突き合わせる。指示内容がすでに実装済みなら、同じ変更を重ねず**検証モード**へ切り替え、差分・不足・本番反映だけを確認する。

**Codex画像原本の後片付け（2026-07-20）**: `D:\downloads\sumalabo-codex\<slug>\` は作業領域とする。独立検品合格→WebPをリポジトリへ正本採用→本番deploy/verify成功の3条件がそろった後だけ、公開フロー末尾で `archive\YYYYMM\<slug>\` へ移動する。検品不合格・未採用・deploy未成功は移動しない。archive移動から30日経過した記事フォルダは夜間run冒頭で自動削除し、移動・期限削除・安全側スキップを `cleanup-ledger.jsonl` に記録する。即時削除や手動の見切り削除は禁止。

**画像の「同一性」と「演出」を分離する（2026-07-20）**: キャラ同一性のblocking判定は、ひまりの顔・体型・髪型／らぼまるの耳ビレ・首輪・アンテナ・ハート・卵型体型など、`assets/characters/character-sheet.md` の認識アンカーに限る。衣装・小道具・ポーズ・背景は記事テーマを伝えるために積極的に変え、これらの差をキャラ不一致や工房fallbackの理由にしない。新規記事の `slide_plan.md` は `## 演出ブロック` を必須とし、衣装・小道具・ポーズ・背景・演出根拠・スライド演出方針をPhase Aで自動生成する。独立検品はアンカー不一致をblocking、演出の弱さをwarningとして分ける。サムネは標準衣装の棒立ち・汎用背景・指さし説明だけを避け、道具を実際に使う体験図にする。本文スライドも小道具・動き・背景をテーマに合わせ、衣装を変える場合は記事内で一貫させる。演出の質は機械検品で評価し、Hiroの実物レビューは公開後の事後確認とする。

**身体構造と画像経路の公開ブロック（2026-07-31更新）**: 認識アンカーとは別に、四肢・手指・顔・物体との融合を全画像で検査する。明確な手/腕/脚の本数異常に加え、各手が左手/右手として自然な向きか（親指位置）、手首と腕の接続、指の長さ・太さ（特に親指）を手ごとに必須回答する。明確な左右不整合・接続異常、腕・脚の不自然な長さ/細さ、触手状・ホース状・急なS字、付け根・関節の破綻、不快なシルエットは `needs_revision`。比率だけの違和感は warning とし画像を報告へ添付する。らぼまるは腕・手・脚・足が左右各1つで、それ以外の突起はアンテナ1本と左右の耳ビレだけ。生成では自然な構図を優先し、手を隠すことを既定にしない。壊れにくい手として、開いた手・軽く添える手を優先する。手は小さめ・遠めに描き、クローズアップを避ける。動作する手は片手だけにし、もう片方は体側で自然に休ませる。物を強く握る、両手で別々の動作をする、指を複雑に組む・数えるポーズは避ける。小道具の把持が不可欠な場合だけ、片手で軽く持つ。手を消すためにフレームアウト・後ろ手・机の陰へ不自然に退避させない。テーマ衣装・小道具配置・姿勢と視線・背景の演出密度は維持する。画像生成の標準経路は `codex exec` とし、工房チャットは既定のfallback条件が記録された場合だけ使う。**工房fallbackが1回でも発動した完了報告には「工房退避あり（条件名）」を必須記載**し、発動しなかった場合も「工房退避なし（Codex exec）」と明記する。無記載のまま経路を変更してはならない。

**X投稿の標準経路（Hiro決定・2026-07-27）**: 昼のPhase Cは **Codex対話モードの内蔵BrowserまたはChrome拡張**を基本とし、`claude-in-chrome` は非常用フォールバックへ降格する。投稿前の `@suma_labo` DOM確認、本投稿・リプライ各 `count===1`、親の返信数 `N→N+1`、`x-posted.json` への本投稿直後／リプライ直後の2段階記録を省略しない。新規台帳レコードには `route: "codex"` を加える。**これは7/23の「Codexへ移行する価値なし」判定を、対話モードでは安定したというHiro実測により上書きする決定**。定型指示: [`docs/x-post-codex-procedure.md`](docs/x-post-codex-procedure.md)。夜間runは実装変更の承認まで現行の `claude-in-chrome` を維持する。

> 詳細： [`docs/user_directed_mode.md`](docs/user_directed_mode.md) ／ Phase A 入力フロー: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md) ／ **Article Refinement Loop: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)** ／ X 投稿フロー： [`docs/x_post_workflow.md`](docs/x_post_workflow.md) ／ queue 状態： [`docs/queue_states.md`](docs/queue_states.md)

### 3 行で言うと

1. **ネタ収集は自動化しない。** ユーザーが URL / フォルダ / テーマ / 記事を指定したときだけ起動。
2. **ユーザーが記事制作を指示したら、記事化 → PR → merge → 本番 deploy → strict verify → queue 更新 → X 投稿まで確認なしで完走してよい**（2026-07-12〜。Human Review Checkpoint は廃止）。
3. **止まってよい例外は「除外カテゴリ該当」と「品質・安全のブロック」の 2 つだけ。事後の取り消しは `npm run retract`。**（ユーザーが「下書きだけ」「確認したい」等と明示したときのみ従来どおり途中停止）

### 全体フロー（3 フェーズ + チェックポイント）

```
[Phase A: 記事化]
  ユーザー指定 → 対象確認 → MDX 化 → WebP 化 → 禁則チェック →
  build → preview ブランチ commit → push → PR 作成
                            ↓
       [機械検品ゲート — 自動判定]
   Claude は PR URL / ローカル確認URL / 記事タイトル / slug /
   サムネ・画像圧縮結果 / build 結果 / 禁則チェック結果を提示。
   機械検品合格後は、人の了承を待たずPhase Bへ進む。
                            ↓
[Phase B: 公開]
  PR merge → main 同期 → wrangler 本番 deploy（正規手順）→
  strict verify（全記事 8/8 pass）→ queue を published に更新
                            ↓
[Phase C: X 投稿]
  本番URL確認 → Codex対話モードで X 投稿画面 → 画像4枚添付(1枚目=サムネ)を DOM 検証 →
  投稿アカウント @suma_labo 確認 → 本投稿(リンク無し) → リプライに記事リンク →
  投稿URL取得 → queue を x_posted に更新
                            ↓
                          完了報告
```

> **Phase A 完了時点で必ず停止します。** ユーザー明示了承前の merge / deploy / X 投稿 / queue published 化はすべて禁止です。

### Phase A 入口: 入力フロー（**本処理開始前**）

オーケストレーター指示文を受け取ったら、**Phase A 本処理に入る前に入力チェック**を行う。詳細: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md)

1. **必須入力確認**：対象種別（url / folder / theme / site+article）と対象内容が揃っているか確認
   - 揃っていない / プレースホルダ（`{...}` のまま） → `AskUserQuestion` で不足を聞く
2. **対象の実在・重複チェック**：URL の到達可否 / フォルダの実在 / 既存記事・PR・queue との重複
   - 停止条件に該当 → `AskUserQuestion` で判断を聞く（上書き / 別 slug / 中止）
3. **対象確定レポートを表示**：想定 slug / 想定スコープ / ChatGPT 呼び出し見積 / preview ブランチ予定名を進行ログとして出す
4. **そのまま Phase A 本処理を自動開始**：停止条件に該当しなければ「進めて」を待たずに本処理に進む

> **停止ポイントは原則 1 つ：PR 作成後の Human Review Checkpoint。** Phase A 前の停止は、入力曖昧 / 不明 / 重複あり等の停止条件に該当したときの例外動作だけ。
>
> user-directed mode では、ユーザーがすでに対象を指定済み。**入力が明確なら毎回「進めて」を待つ二重確認はしない。**

### Phase A: 記事化フェーズ（本処理）= 正規フロー（手動フロー基準・省略不可）

**基準は「これまでユーザーが手動で行っていた記事作成フロー」。** Claude Code 独自の処理順に置き換えない。入力チェック通過後、対象確定レポートを表示してから、以下 **12 ステップを順番どおり省略せず** 実行する（記事の主軸は「自分に関係ある？／課金すべき？」ではなく **デジタルニュースをやさしく噛み砕いて説明すること**。読者判断は補助）。

1. **公式情報・主要報道を調べる**（一次情報・公式発表・主要メディアを読む。Research Pass）
2. **ユーザーメモと照合する**（提示メモを鵜呑みにせず、一致 / 食い違い / 確認不能を明示。facts / claims / uncertain に分類）
3. **すまラボ向けに取捨選択する**（全部入れない。読者に必要なものを採用 / 限定採用 / 不採用。Editorial Selection）
4. **デジタルニュースをやさしく噛み砕く**（何が起きた / なぜ話題 / 誤解されやすい点 / 確定・未確定の整理 / 意味づけ。Sumarabo Translation）
5. **本文ドラフトを作る**（lead-first / 先に結論 / 表・チェックリスト・判断ガイド / 長文連打を避ける）
6. **メタ表現・煽り・誤解・断定・禁則語を複数回チェックする**（禁則 `普通の人` / `普通の人向け` / `すまほん` / `smhn` / `元記事` / `ここから本文` / `初稿` / `最終稿` が 0 件。「全部有料化」「日本ですぐ開始」等の誤読・断定を除去。最低 2 回）
7. **すまラボらしさを確認する**（ニュースの噛み砕きが主軸か / ただの要約で終わっていないか / 事実・未確定・日本での扱いが分かれているか）
8. **最終稿を出す**（レビュー反映後の確定稿。これを記事本文の基準にする）
9. **最終稿をもとにスライド構成を作る**（1 枚 1 テーマ / 6〜8 枚目安 / ひまり=読者目線、らぼまる=整理・比較・チェック役）
10. **ひまり・らぼまる素材でスライド・サムネを作る**（同一 ChatGPT「すまラボ台本」プロジェクト内。4:5 縦長 1280×1600、サムネは 16:9。置物にしない）
11. **画像もファクトチェックし、必要なら再生成する**（文字・数値・固有名詞・未確定表現を確認。架空価格・誤情報があれば再生成）
12. **MDX化・WebP化・build・PR・Preview通知まで進む**（WebP 1枚200KB前後・上限500KB / `npm run build` / `gh pr create` / **Phase A 出口 `npm run sumalabo:finalize`** で CF preview deploy→preview URL検証→review item登録+プレビュー確認待ち通知→queue `review_waiting`）

> ステップ 1〜8 は ChatGPT「すまラボ台本」プロジェクト内で本文を練り上げる工程（Research Pass → Editorial Selection → Sumarabo Translation → Draft → Review×2〜3 → Final Draft）。詳細: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)。**この手動フローを省略して、いきなり画像生成や本文の機械生成に進まない。**

> **鮮度チェック（2026-07-04 追加）**: 中断していた記事を再開するとき、final_article 作成から **7 日を超えていたら、スライド生成前に公式情報の再取得（鮮度チェック）を必須** とする。提供条件・価格・日付が動いていたら本文をリフレームしてから画像工程へ進む。

> **画像生成前の必須工程：Article Refinement Loop**
> 画像生成（スライド・サムネ）に進む前に、本文ドラフト → 自己レビュー × 2〜3 → `article-ready-for-images` 6 条件クリアの順で必ず Refinement Loop を通過する。**本文・スライド構成案がない状態で画像だけ先に作るのは禁止。** 詳細: [`docs/article_refinement_loop.md`](docs/article_refinement_loop.md)
>
> queue 状態は `article_generated` → `article_ready_for_images` の間で必ずこのループを回す。Loop を飛ばして直接画像生成に進んだら方針違反として停止。

> **画像生成必須時の事前チェック**（Refinement Loop 通過後）：ユーザー指示で **スライド・サムネの新規生成が必須** の場合（指示文に「ChatGPT を使い画像生成」「スライド」「サムネ」等の記述あり、または素材フォルダに既存画像がない場合）、画像生成に入る前に **画像生成経路の事前チェック** を行う：
>
> - `mcp__claude-in-chrome__*` がロードされているか
> - Chrome 拡張がペアリングされているか（**Edge ペアリングは経路なし扱い**）
> - ChatGPT セッションが開ける状態か
>
> **拡張未接続を検知したら、まず自己復旧を試みる（2026-07-14・人間に頼む前に）**:
> 1. `npm run chrome:ensure`（= `scripts/automation/ensure-chrome.ps1`。night-run と同等の Chrome 起動＝プロセス確認→無ければ `--restore-last-session` で起動→安定待ち）を実行。
> 2. **30 秒待って `list_connected_browsers` を再確認**。未接続ならもう一度だけ（`chrome:ensure` → 30 秒 → 再確認）。**最大 2 回**まで。
> 3. 2 回試しても未接続なら**初めて人間に再接続を依頼**する（`blocked_image_generation_unavailable` で停止）。
> ※ ensure-chrome は「Chrome が起動していること」を保証するだけ。**拡張のペアリング自体が切れている場合は Chrome 起動だけでは直らない**ので、2 回で見切って人間に渡す（粘らないルール準拠）。
>
> 上記の自己復旧でも経路が通らないと判定したら、**本文 MDX だけで PR を作成しない**。queue を `blocked_image_generation_unavailable` にして、原因 / 復旧手順 / 再開方法を報告して停止する。**ユーザーが明示的に「画像なしで進めて」と返答したときだけ画像なし PR を許可**。詳細: [`docs/phase_a_input_flow.md`](docs/phase_a_input_flow.md) section 5-bis / 5-ter

（上記 12 ステップが Phase A の正規フロー。下記は各工程の補足ルール。）

> **Phase A 出口の鉄則（共通化・ステップ 12）**
> - 記事URL / サムネ / スライド画像が **https の Cloudflare Pages Preview で 200** であることを確認してから通知する。
> - **`127.0.0.1` / `localhost` / `0.0.0.0` / `file://` / `chrome://` / 非https を review item のメイン `previewUrl` にしない。** 渡された場合は通知せず `local_preview_url_rejected`（または `failed_preview_url_invalid`）で停止。`scripts/sumahon/preview-url-policy.mjs` のガードが verify と notify の二層で弾く。
> - **チャットで PR URL を報告するだけ」を Human Review Checkpoint としない。** プレビュー確認待ち通知 + Preview/PWA 確認導線 + 承認導線まで到達して初めて Checkpoint。

### 公開前Human Review Checkpoint（廃止）

2026-08-01以降は使用しない。Phase A完了後は機械検品の結果だけでPhase Bへ進む。ユーザーが下書きだけを明示した場合は公開作業そのものを行わないが、公開工程内に承認待ちを置かない。

### Phase B: 公開フェーズ

**実行条件は Autonomy Level で変わる（[`docs/autonomy.md`](docs/autonomy.md)）：**

- **L0**: 従来どおり **ユーザー明示了承後だけ** 実行する。veto 期限が通知に出ていても、期限経過で自動公開はされない。
- **L1（現在）以降**: Phase A 完了通知の veto 窓（現在 30 分）内に停止（PWA の veto ボタン or `autonomy.json` の `paused: true`）が無ければ、GitHub Actions（`auto-phase-b.yml`）が Phase B を自動実行する。公開直後に post-publish verify が走り、hard fail なら自動 rollback（`npm run rollback:production`）+ incident 記録で是正する。ユーザー承認（PWA 承認ボタン / 「記事OK、公開へ」）が veto 窓内に来た場合は従来どおり即時に手動実行してよい。

以下の手順は L0 の手動実行・L1 の自動実行で共通：

1. **PR merge**：`mergeable: MERGEABLE` / `mergeStateStatus: CLEAN` / `isDraft: false` を確認 → `gh pr merge <N> --merge --delete-branch=false`。main への直接 push 禁止。merge commit を記録。
2. **main 最新化**：`git fetch origin main && git pull origin main`。merge commit が含まれていることを確認。
2-bis. **publishAt 補正（2026-07-14・一覧順ずれ防止）**：deploy 前に `npm run normalize:publish-at -- --slug=<slug>` を実行。publishAt が**未来**（build 除外回避で過去化）または**他の最新公開記事より古い**（一覧最上位化のため前進）場合に実公開時刻へ自動補正する。変更が出たら追加コミットして main に反映してから deploy する（変更なしなら何もせず次へ）。原則は Phase A の write_mdx で実公開見込み時刻を入れておき、ここは最終セーフティネット。
3. **wrangler 本番 deploy（正規手順）**：`npm run deploy:production -- --slug=<代表slug>`。複数記事の場合も 1 回でよい（main 全体が反映されるため代表 slug を渡す）。
4. **strict verify**：対象記事すべてで `/api/verify-publication` 実行。`status: published` / `failedChecks: []` / 8 項目（`httpStatus` / `titleNotGeneric` / `slugInHtml` / `notHomepageFallback` / `hasArticleBody` / `hasThumbnailRef` / `noProhibitedCopy` / `indexListsArticle`）全 pass を確認。
5. **queue 更新**：strict verify 成功後だけ `published` に更新。`productionUrl` / `publishedAt` / `prUrl` / `mergeCommit` / `deployResult` / `verifyResult` / `source: user_directed` / `triggeredBy: user` / 指定対象（URL or フォルダ）を記録。

**失敗時：** published 扱いにしない。X 投稿しない。失敗 check と原因を報告して停止。

**承認ボタン経由のとき（P1 で正規化・2026-07）：** PWA の承認ボタンは `/api/approve-preview` で PR を自動 merge する（担当はそこまで）。**本番反映は Deploy Hook や Git 連携 auto-deploy に依存せず、承認確認後に wrangler 本番 deploy（`npm run deploy:production -- --slug=<slug>`。main 未同期環境では `--skip-git-sync` を付けて main HEAD checkout から実行）へそのまま進む**のが正規手順。完了後に `/api/verify-publication` で `status: published` を確認する。
背景（P1 調査 2026-07）: Cloudflare Pages の Git 連携 auto-deploy は GitHub App の clone 失敗（Repository not found）が常態化し、Deploy Hook も同じ Git ビルドを起動するため機能しなかった（Meta One・Opus 4.8 の 2 件連続不発の根本原因）。実績 100% の wrangler(Direct Upload) に一本化し、Git 連携の自動ビルドは無効化した。

### Phase C: X 投稿フェーズ

Phase B 完了後だけ実行：

**前提条件（**すべて満たすこと**）：**
- ユーザーが記事内容を了承済み
- PR merge 済み
- production deploy（wrangler 正規手順）成功
- strict verify 8/8 pass
- 本番URLが開ける
- 投稿アカウントが **@suma_labo** であることを確認
- **Chrome を使う**（Edge 禁止）

**独立検品（2026-07-14・X直接投稿の拡散リスク対策）＝ Phase C の必須前提：**
- X 直接投稿の前に、**生成した本人のセッションとは別の Task エージェント**を起動し、全画像を白紙の目で再検査する（本人チェック=factcheck_images との**ダブルチェック**）。手順: `npm run sumalabo:inspect -- --slug <slug>` → 独立エージェント起動 → 出力を `logs/article/<slug>.independent-inspection.json` に保存。
- 検品は factcheck 14項目（認識アンカーに加えて身体構造を含む）＋スライド本文と最終稿の突合＋X選抜スコア（文字量少・数字正確・単体で意味が通る）を判定する。**本人チェックと差が出たら独立検品を優先。**
- **X 投稿するスライドは選抜制**: 4枚を機械的に選ばず、検品の `xSelection`（上位4枚・先頭=サムネ）を使う。文字密度の高い（誤字リスク大）スライドは X から外し記事内専用にする。
- **崩れ検出時**: `needs_revision` は該当スライドのみ**最大2回**再生成 → 直らなければそのスライドを **X から除外**して残りで投稿する（**記事の公開自体は止めない**）。
- 定義: [`docs/kanji_pitfalls.md`](docs/kanji_pitfalls.md)（化けやすい漢字の回避）/ `scripts/sumahon/generate-independent-inspection-prompt.mjs`（検品プロンプト・スキーマ）。

**投稿形式（2026-07-14 バズ強化・ユーザー指示）＝ 画像4枚の本投稿＋リプライに記事リンク：**
- 既定を「リンク付き投稿1本」→「**スライド画像4枚を直接添付した本投稿（1枚目=サムネ／2〜4枚目=slide01・02・03）＋その投稿へのリプライに記事リンク1件**」に変更。X はリンク付き投稿の露出を絞るため画像単体投稿の方が伸びる。
- 設定は `data/automation/autonomy.json` の `xPostOptions`（`attachSlides/attachSlidesCount:4/leadWithThumbnail/linkInReply`）。投稿文・添付画像・リプライ文は `npm run social:generate-x-post -- --slug <slug>` が `logs/social/{slug}.x-post.json`（`attachmentPlan` / `primary` / `reply`）に出力する。
- **本投稿に記事リンクを入れない。** リンクは必ずリプライ側。本投稿は画像＋短文＋ハッシュタグ。ブランドタグ #すまラボ は常時1個、流入タグは投稿直前のX話題検索結果で実際に使われているタグの最多0〜2個だけ（合計最大3、通常1〜2）。カテゴリタグは廃止。
- 詳細手順: [`docs/x_post_workflow.md`](docs/x_post_workflow.md) / 人間側の初速の付け方: [`docs/growth_playbook.md`](docs/growth_playbook.md)

**投稿前に必ず確認：**
- 本投稿に画像4枚（1枚目=サムネ）が乗っている（DOM で枚数確認）/ サムネ・スライドが古くない / 本投稿に URL を入れていない / リプライに記事リンク1件 / 投稿文に禁則表現や誤字がない / アカウントが @suma_labo

**投稿してはいけない条件：**
- サムネ/スライドが古い / 添付枚数不一致 / strict verify 失敗 / 本番URLが開けない / 投稿アカウントが @suma_labo ではない / ユーザー了承前 / 記事確認前

**タイムボックス・フォールバック（粘らない・2026-07-12 の原則は維持）：**
- 画像添付は**前面タブ**で行う（背面タブでは OS クリップボード貼り付け不成立）。`x-post-chrome.ps1 -ImagePaths <4枚>` でまとめて CF_HDROP → Ctrl+V、または1枚ずつ。**添付枚数を DOM 検証してから送信**。
- **OGP カード待ちはしない**（本投稿は画像なのでカード不要。リプライのリンクのカード化も待たない）。
- 画像添付が合計 **5 分 / 3 回**試しても乗らなければ、**サムネ1枚だけの画像投稿**にフォールバック（リプライのリンクは維持）。それも不可なら text_only（本投稿にリンク）で即投稿して終える。
- 台帳の `variant`: `images4+reply` / `images1+reply` / `text_only`。**投稿は本投稿＋リプライの最小回数のみ・二重投稿禁止。**

**投稿確定の検証ループ（必須・2026-07-19 恒久対策「最後の1クリック問題」）：**
- **「ボタンをクリックした＝投稿できた」を廃止。** 本投稿・リプライとも、クリック後に **DOM で実在を確認するまで完了としない**（Kimi K3 でリプライが未投稿のまま「投稿したはず」で終えていた事故の恒久対策）。
- **本投稿**: クリック → 5 秒待機 → プロフィールで一意本文の件数を確認（`postExistsJs`）。`count===1` で確定 / `0`＝未投稿→アップロード完了(`SEND_READY_JS`)を待って再クリック（**最大2回**）/ `>=2`＝二重投稿で停止・手当て。
- **リプライ**: クリック前に親の返信数 N を控える → クリック → 5 秒 → 返信数が **N→N+1 かつ composer クリア** で確定（`REPLY_COUNT_JS`）。増えなければ再クリック（最大2回）。増えなければ**「未投稿」と明確に報告**（本投稿は維持）。
- 2 回試して未確定なら曖昧にせず「未投稿」と報告し `--error` を残す。**検証スニペット**: `scripts/sumahon/x-post-verify.mjs`、**手順**: [`docs/x_post_workflow.md`](docs/x_post_workflow.md)「投稿確定の検証ループ」。

**投稿後（★台帳は投稿確定の直後に書く）：**
- **確定を DOM で確認した“その場で”台帳へ書く**（作業の最後にまとめない。セッションが途中で切れても投稿済み/未投稿が台帳で必ず分かる状態にする）。本投稿確定直後に `xPostUrl` / status=`x_posted`、リプライ確定直後に `xReplyUrl` を**別々に**記録。
- 本投稿URL（＋リプライURL）を取得、`xPostUrl` / `xReplyUrl` / `xPostedAt` / `xPostText` を記録
- 完了報告に投稿URL を含める（本投稿・リプライそれぞれの実在確認結果も添える）

**投稿文ルール：** 短め / 本投稿に URL は入れない（リンクはリプライ） / 1行目に読者が検索する自然な話題語を含める / 投稿直前にその話題語でXを1回検索し、結果内で実際に使われているタグを収集・集計して最多を流入タグとして最大2個採用（0個可） / #すまラボ はブランドタグとして常時1個 / カテゴリタグは廃止 / コードで候補語や連結タグを生成しない / 「普通の人」表現禁止 / 煽らない / 記事内容に沿う

### 入口（user-directed mode）

| トリガー | 標準コマンド | 備考 |
|---|---|---|
| URL 指定 | `npm run sumalabo:from-url -- <url>` | `article:from-sumahon` のエイリアス |
| フォルダ指定（素材一式） | `npm run sumalabo:from-folder -- "<absolute folder path>"` | Claude が会話起点で処理。スクリプトはガイド表示 |
| queue 内の指定 slug を処理 | `npm run sumalabo:process -- --slug=<slug>` | `sumahon:regenerate-next` のエイリアス（slug 必須） |
| テーマ指定 | Claude との会話で指示 | 例：「Google AI Ultra のテーマで記事を書いて」 |

### user-directed mode で **やめたこと**

- すまほん新着の自動巡回（`sumahon-watch.mjs` の cron / スケジュールタスク起動）
- Google ニュースなどの自動収集
- 未指定記事の自動キュー投入
- タスクスケジューラーで無人起動 → 勝手に処理開始
- ユーザー未確認のまま新しいテーマを処理すること
- **ユーザー記事確認前の merge / deploy / X 投稿**

### user-directed mode で **残したこと**

- 素材ありフォルダの量産モード（複数本まとめてOK）
- WebP 画像最適化（1 枚 200KB 前後 / 上限 500KB）
- lead-first / slide-main 記事構造
- 禁則チェック
- `npm run build`
- PR 作成（`gh pr create`）
- **ユーザー明示了承後の** PR merge / wrangler 本番 deploy / strict verify / queue 更新 / X 投稿
- X 投稿案の下書き作成（`drafts/social/{slug}.x.md`）

## 結論

**人間に求めるのは「対象の指定」と「記事確認後の明示了承」の 2 点だけ。**

- 対象指定までは人間が行う（自動収集なし）
- 記事化〜 PR 作成までは Claude が自動で進める
- **記事化と機械検品が終わったら停止せず公開工程へ進む**
- 了承後だけ、merge → deploy → verify → queue 更新 → X 投稿までを一気に自動化する

## 人間（運営者）の役割

| やること | やらないこと |
|---|---|
| PWA または Cloudflare Preview で記事を確認する | PR の作成 / マージ操作 |
| 問題がなければ承認ボタンを押す（`/api/approve-preview`） | Preview URL の探索・コピー |
| ファクトチェックの最終目視（記事の核となる主張・サムネのロゴ混入有無・参考URLの到達確認など） | secret の同期 / Cloudflare 設定確認 |
| 中止・修正方針の判断（必要時のみ） | スクリーンショット取得 |
| | ChatGPT への画像添付・コピペ |
| | `npm run build` などの手動実行 |
| | `git push` / branch 切替 |

人間が手を動かすのは **PWA の承認ボタンを押す瞬間** だけが理想形。それ以外は Claude が自分で進めてダメなら自動診断・自動リトライ・最終報告までやる。

## Claude Code / Claude in Chrome の役割

以下を **すべて自律的に** 実行する。途中で人間に対話を求めない（修正方針の選択肢を提示するなど、判断が必要なときだけ最小限聞く）。

> **重要（user-directed mode）：以下のステップ 1（自動巡回からの記事発見）は停止しています。** 起点はユーザーの明示指定（URL / フォルダ / テーマ）です。`sumahon-watch.mjs` を含む自動収集系スクリプトは削除せず残してありますが、ユーザーが明示的にコマンドを叩いた場合だけ起動します。

1. **元記事の発見・要点メモ生成**（**user-directed mode で停止**。従来は `scripts/run/sumahon-watch.mjs` などの自動ループから取得していたが、現在はユーザーが URL / フォルダ / テーマを指定したときだけ発火）
2. **記事本文生成プロンプト作成 → ChatGPT で本文生成 → 精錬 → 最終稿を `drafts/generated/{slug}.md` に保存**
3. **ブログ化用資料一式生成 → `drafts/materials/{slug}.materials.md` に保存**
4. **最終版サムネイル画像生成プロンプト作成 → `drafts/materials/{slug}.thumbnail-prompt.md` に保存**
5. **サムネ生成専用 ChatGPT チャットを開く → ベース画像 2 枚を `scripts/automation/chatgpt-attach-files-clipboard.ps1` で 1 枚ずつ CF_HDROP 貼り付け（UWSC はフォールバック）→ 画像生成 → ダウンロード → `public/images/thumbnails/{slug}.png` へ配置**
6. **MDX 化 (`article:import-generated`)**
   - `sourceCheck` (`validateSourceReferences`)
   - `articleQualityCheck` (`validateArticleQuality`、`validateCharacterVisualPresence` 含む)
   - blocking があれば自動修正 → 再検証 → なお blocking なら人間に最小限の相談
7. **`npm run build`** で 30 ページ生成を確認
8. **Preview ブランチ `preview/{slug}` を作成 → commit → push**（`git add .` は使わない。関係ない drafts / logs は add しない）
9. **PR 作成 (`gh pr create`)** — main ブランチへの直接 push は禁止
10. **Cloudflare Pages の Preview URL を `gh pr view --json comments` から自動取得** — 推測しない、コメントを必ずパースする
11. **PWA へ通知**: `scripts/run/notify-review-ready.mjs` で `/api/push/notify-review-ready` を叩き、`X-Notify-Secret` 付きで Web Push を送る。secret 未設定なら warning でスキップ（人間に同期させない、`functions/api/push/check-secret.ts` で自動確認する）
12. **visualPreviewReview** — Preview デプロイ完了後、Claude in Chrome がスマホ幅 + PC 幅のスクショを取得し、ChatGPT に 1 枚ずつ添付して 2 パスレビュー（読みやすさ / ファクトチェック）。結果は `logs/visual-review/{slug}/` に保存（main にはマージしない、`.gitignore` 対象）
13. **必要なら追加修正 → 再 build → 再 push**
14. **失敗時の自動診断**:
    - build 失敗 → エラーログを構造化して原因分類、最小修正で再試行（最大 3 回）
    - Cloudflare デプロイ失敗 → `gh pr view --json statusCheckRollup` で SUCCESS/FAILURE を判定、失敗詳細を `logs/automation/` に保存
    - secret ミスマッチ → `/api/push/check-secret` で照合、ミスマッチなら通知をスキップして警告ログ
    - スクショ添付失敗 → クリップボード経路 → UWSC フォールバック → ヘッドレスレンダリング、の順で自動切替
    - ChatGPT 応答エラー → 同プロンプトで再送 2 回、3 回目は簡略化版で再送、それでもダメなら最終報告に「未生成」として記録
15. **Phase A 最終報告**: 完了サマリ（生成ファイル一覧、検証結果、PR URL、Preview URL、人間が承認時に見る観点）を 1 メッセージで提示 → **停止せずPhase Bへ進む**
16. **ユーザー明示了承を待つ**: 「記事OK / 公開へ / 承認」等のトリガーが来るまで Phase B / C に進まない
17. **Phase B（公開）**: PR merge → main 同期 → wrangler 本番 deploy（正規手順）→ strict verify 8/8 → queue を `published` に更新
18. **Phase C（X 投稿）**: 本番URL確認 → Codex対話モード（Chrome拡張を基本、内蔵Browserを補助）で X 投稿画面 → 画像4枚添付(1枚目=サムネ)を DOM 検証/アカウント (@suma_labo) 確認 → 本投稿(リンク無し) → リプライに記事リンク → 投稿URL取得 → queue を `x_posted` に更新。`claude-in-chrome` は非常用フォールバック
19. **Phase B / C 完了報告**: 本番URL / 投稿URL / queue 更新内容を 1 メッセージで提示

## 禁止事項（Claude Code 側）

### 常時禁止

- ❌ 人間に PR を作らせる（必ず `gh pr create` で自動作成）
- ❌ 人間に Preview URL を探させる（必ず `gh pr view --json comments` でパース）
- ❌ 人間にスクショ取得・画像添付を依頼する（PowerShell + Chrome MCP で自動化）
- ❌ 人間に build / push を依頼する
- ❌ 人間に secret 同期を依頼する（`/api/push/check-secret` で自動照合）
- ❌ 人間に Cloudflare 設定確認を依頼する
- ❌ `main` ブランチへの直接 push
- ❌ `git add .` の使用（関係ない drafts / logs / 素材ファイルを巻き込まないよう、必ず明示パスで add）
- ❌ `logs/visual-review/` を main に入れる（内部品質ログとして preview ブランチでも追跡せず、ローカル disk のみ）
- ❌ Edge を操作する（Chrome のみ）
- ❌ hidden file input の直接クリック / `file_upload` API の使用
- ❌ **ユーザー未指定の記事を自動巡回・自動収集・自動キュー投入する**（user-directed mode）
- ❌ **`sumahon-watch.mjs` / `run-sumahon-queue.ps1` をユーザー指示なしで起動する**
- ❌ **Windows タスクスケジューラーでの無人定期起動を有効化する**（再有効化したいときは必ず事前にユーザー確認）
- ❌ **Cloudflare Deploy Hook / Git 連携 auto-deploy に依存する**（P1 で廃止。本番反映は wrangler 正規手順のみ）
- ❌ **secret / token / Deploy Hook URL を表示する**（チャット・ログ・コミットメッセージ全部 NG）
- ❌ **画像元ファイルを削除する**（素材は `_published_articles/` 配下に保管）
- ❌ **`SUMALABO_ENABLE_SLIDE_PIPELINE` を勝手に ON にする**
- ❌ **PR-C / PR-D に勝手に進む**（明示指示があったときだけ）
- ❌ **画像生成が必須な指示で、画像生成経路（Chrome MCP）が使えないのに本文だけで PR を作成する**（`blocked_image_generation_unavailable` で停止する）
- ❌ **`frontmatter.thumbnail` 空・スライド 0 枚のまま通常 PR（Ready）を作成する**（ユーザーが「画像なしで進めて」と明示したときだけ許可）
- ❌ **Article Refinement Loop（自己レビュー × 2〜3 / `article-ready-for-images` 6 条件）を通過せずに画像生成へ進む**
- ❌ **本文ドラフトなしでスライド・サムネを先に作る**
- ❌ **記事の議論と画像生成を別の ChatGPT チャットに分ける**（同一チャットで論点 → スライド → サムネをつなげる）
- ❌ **「すまラボっぽい絵」を汎用的にだけ作る**（記事固有の論点と切り離した画像は禁止）

### ユーザー記事確認・了承前は特に禁止

- ❌ **PR merge**（`gh pr merge`）
- ❌ **production deploy**（`npm run deploy:production`）
- ❌ **strict verify による queue published 化**
- ❌ **X への投稿実行**（Chrome で X を開いて POST する操作）
- ❌ **承認ボタンを押す**（`/api/approve-preview` / `/api/push/notify-review-ready` 自動発火）
- ❌ **queue を `published` / `x_posted` に書き換える**

## 画像生成前ゲートの扱い（停止ポイントではない）

画像生成前ゲートは **停止ポイントではなく「自動通過チェック」** である。`final_article.md` / `review_report.md` / `slide_plan.md` が存在し、禁則チェック・すまラボ方針チェック・slide_plan 整合チェックを通過した場合、**ユーザー確認を挟まず画像生成へ自動進行する**。公開前の人待ちゲートは設けない。

停止してよいのは、ゲートNG / 画像生成不可 / 画像取得失敗 / ファクトチェックNG / build失敗 / Preview URL生成・検証失敗 / 通知失敗 などの重大ブロック時だけ。ゲートOKなのに「続行してよろしければ」等の確認で止まらない。

**機械判定は `sumalabo:gate` が行う（目視・自己申告に頼らない）：**

- 画像生成前: `npm run sumalabo:gate -- --slug <slug> --stage draft`（final_article / review_report / slide_plan 等の存在＋禁則語のみ検査）
- Phase A 出口: `npm run sumalabo:finalize` の先頭で自動的に `--stage full` が走る（frontmatter 必須キー / 禁則語 / 画像参照整合（WebP限定・実在）/ dist の OGP 実測）。**exit 1（violation あり）なら build・Preview URL 作成・review item 登録・通知へ一切進まない**
- **全記事棚卸し（月1回・2026-07-25 追加）**: `npm run sumalabo:audit`（= `sumalabo-gate.mjs --audit`）。`content/articles/` の**公開 MDX を全部**走査し、**タイトルを含む frontmatter と本文**の禁則語を検査する。**さらにサイト側の読者向け文言**（`src/lib/categories.ts` のカテゴリ説明 / `src/config/site.ts` / `src/pages/*.astro` の固定ページ文言 / `data/related-guides.json`）も検査対象にする（記事を全部直してもカテゴリ説明に残っていて一覧面の HTML に出続けた実例があるため）。**stage draft/full は制作中の1記事しか見ないため、公開済み記事に禁則語が残り続ける死角があった**（実際に「普通の人」が 7 記事・57 箇所で本番に出ていた。title/description は検索結果・OGP にも表示される）。**毎月1回、月初に手動実行**し、violation が出たら記事を直してから再実行する（夜間 run には組み込まない＝記事制作を止めないため）。exit 1 = 未修正あり。
- 禁則語リストは `data/qa/forbidden-words.json`。誤検知はリスト側を直す（記事を歪めない）。パターン削除・warning 化など検査を弱める変更は理由を報告してから行う。**否定形での使用は誤検知として除外する**（`excludeLineRegex`）：「全員に必要なものではありません」「誰でも使える段階ではありません」「万人向けではない」等は、むしろ過度な一般化を避ける良い書き方なので violation にしない
- **目視で確認するのは機械判定できない項目に限る**: facts / claims / uncertain の線引きの妥当性、記事の主軸（やさしく噛み砕く）の確認、サムネの実在ロゴ・煽り絵柄の有無

## 成果物保全（P7・2026-07 事故対応）

- **`drafts/refinement/{slug}/` は記事の PR に含めてコミットする（Phase A 完了の条件）。** 初稿→レビュー→修正版→最終稿の流れを後から追えるようにする。`sumalabo:gate --stage full` と `sumalabo:finalize` が未追跡/未コミットの drafts を検出して停止する
- **worktree の置き場所・node_modules の扱い・撤去手順・作業ツリーの後始末は、下の「worktree と作業ツリーのライフサイクル」に集約した。** ここには重複して書かない

### node_modules 消失の恒久対策（2026-07-19）

- **原因**: 画像工程 `scripts/automation/codex-image-stage.mjs` が Codex CLI を `--sandbox workspace-write --cd <ROOT>` で起動しており、**リポジトリ全体（＝`node_modules` を含む）が Codex の書き込み可能領域になっていた**。画像生成の副作用で `node_modules`（astro 等）が消え、後続の `npm run build` が「astro not recognized」で失敗した。
- **恒久対策1（根本原因）**: Codex の書き込み先を **外部の出力ディレクトリ（`--cd <outputDir>`・既定 `D:\downloads\sumalabo-codex`）だけに限定**した。正本画像は `--image` 添付（FS不要）、slide_plan 対象はプロンプトへインライン展開済みなので、リポジトリへの FS アクセスは不要。**これで Codex はリポジトリ（node_modules 含む）を触れない**。
- **恒久対策2（防御・自己復旧）**: 本番 deploy の build 直前（`scripts/automation/deploy-production-from-main.mjs` の `ensureNodeModulesForBuild()`）で **astro が解決できるか確認し、できなければ自動で `npm ci`（失敗時 `npm install`）で復旧してから build に進む**。復旧できたら中断せず続行（完走型を維持）、復旧してもなお解決不能なときだけ build を失敗扱いにしてログに明記する。夜間 run（Phase B）もこの経路を通るため保護される。**画像工程は build より前に走るので、build 直前チェックが復旧の最適地点**（run 冒頭の一律チェックでは、まだ壊れていない段階を見て素通りしてしまう）。
- **注意**: node_modules が消える経路は Codex だけではない。**worktree に node_modules のリンクを張って撤去した場合も本体の実体が消える**（2026-07-25 実害）。そちらの防止策は次節にある。

## worktree と作業ツリーのライフサイクル（2026-07-25 統合）

worktree 関連の事故は、個別の禁止事項を足しても再発した。**「作る → 使う → 店じまいする」を一連のライフサイクルとして定義し、終了時の店じまいを必須手順にする**。散らばっていた注意書きはこの節に集約する（他の節には重複して書かない）。

### なぜこの節があるか（実際に起きた 3 事象）

| 時期 | 事象 | 直接の原因 |
|---|---|---|
| 2026-07 | `drafts/refinement` 3 記事分（Meta One / Opus 4.8 / Fable 5）が**消失** | worktree を OS Temp 配下に作り、OS の自動クリーンアップで working tree ごと破壊された |
| 2026-07-19 | `node_modules` が消え `npm run build` が「astro not recognized」で**失敗** | Codex CLI の書き込み可能領域にリポジトリ全体が入っていた（前節で対策済み） |
| 2026-07-25 | `node_modules` が**空**になり build 不能 | worktree に node_modules の**ジャンクション／symlink を張り**、`git worktree remove --force` が**リンクを辿って本体側の実体を削除**した |
| 2026-07-26 | `node_modules` が**空**になり build 不能（**3 回目・同じ原因**） | 「リンクあり」を**検出して表示までしたのに、同じコマンドチェーンの中で `git worktree remove` を無条件に実行**した。**検出は、撤去を止めなければ意味がない**。この教訓から、店じまいの項目 1・4 をゲート（失敗したら中止）に書き換え、撤去を `npm run worktree:remove` に一本化した |
| （随時） | 夜間 run が記事を作れずに終了 | 本体の作業ツリーに **tracked な未コミット変更**が残ったままだった |

共通する原因は「**worktree と本体作業ツリーの境界が曖昧なまま作業を終えている**」こと。個別の禁止ではなく、終了時の店じまいで塞ぐ。

### 1. 作成時

- **置き場所は `D:\work\sumalabo-<用途>` 固定。** OS Temp 配下（`C:\Users\...\AppData\Local\Temp` 等）には**絶対に作らない**（OS クリーンアップで破壊される。2026-07 に Temp 配下の worktree 18 個を棚卸しし全撤去済み）
- **`origin/main` から切る。** 本体で作業中のブランチから切ると、無関係な差分が PR に混入する（実際に 29 ファイルの他記事が混入しかけた）

```bash
git fetch origin main && git worktree add -b <branch> D:\work\sumalabo-<用途> origin/main
```

- **node_modules を持ち込まない（symlink・ジャンクション・コピーとも禁止）。** `git worktree remove --force` がリンクを辿って**本体の実体を消す**
- したがって **worktree でやるのは「編集・commit・push・PR」まで**。`npm run build` などの依存が要る検証は**本体リポジトリで行う**
- 依存不要のスクリプト（`node scripts/sumalabo-gate.mjs --audit` など）は worktree でも実行してよい
- **Codex worktree（`.codex/visualizations/` 配下）では `main` をチェックアウトしない。** worktree が `main` を掴むと本体リポジトリで `git checkout main` が通らなくなり、**本体の作業を止める**（2026-07-25 に実際に発生し、夜間 run 用のブランチ切り替えができず `--skip-git-sync` で回避する羽目になった）。Codex 側には worktree の置き場所を指定する設定が見当たらないため、**「main を掴まない」を運用ルールとして守る**（作業用ブランチを切ってからチェックアウトする）

### 2. 作業中

- **本体作業ツリーを汚す作業と、worktree での作業を同時に走らせない。** どちらの変更か追えなくなり、店じまいで取りこぼす
- 原則として **編集は worktree 側に寄せ、本体は「検証（build / deploy）と読み取り」に使う**
- 本体側での編集が必要になったら、**先に worktree を店じまいしてから**着手する

### 3. 終了時（店じまいチェックリスト）

**worktree を使ったセッションは、必ず全項目を実行してから終える。** 1 つでも残すと次のセッションか次の夜間 run で事故になる。

**撤去は `npm run worktree:remove` 経由のみ。生の `git worktree remove` を直接実行しない。**
（`scripts/maintenance/safe-worktree-remove.mjs`。下の 1〜4 をゲートとして自動で行い、
どれかに失敗したら撤去へ進まずに exit 1 で止まる）

```bash
npm run worktree:remove -- <worktree-path> --force
npm run worktree:remove -- <worktree-path> --dry-run   # 判定だけ見る
```

```
□ 1. 【ゲート】worktree 内の node_modules を検出したら撤去を中止する
      symlink / junction を検出 → **撤去してはいけない**（本体の実体を巻き込む）
      → リンクだけを外し、除去できたことを確認してから撤去を再開する
      → 除去に失敗したら、そこで打ち切る（先へ進まない）
      ※ 実体ディレクトリなら本体とは無関係なのでそのまま撤去してよい
□ 2. worktree を撤去（上記スクリプト経由）
□ 3. 残骸ゼロ確認
      git worktree list        → 想定外のパスが残っていないこと
      git worktree prune
□ 4. 【ゲート】本体 node_modules の健全性を撤去の前後で確認する
      astro が解決できること   → できなければ中止し、npm ci で復旧してから再開
□ 5. 本体作業ツリーのクリーン化（★夜間 run の可否を左右する）
      git status --porcelain --untracked-files=no   → 空にする
        ・意図した変更  → コミットして PR へ
        ・一時的な変更  → git stash などへ退避
        ・残す必要がある → 理由をユーザーに報告して残置（黙って残さない）
□ 6. ブランチ位置
      想定外の作業ブランチに居座らない
```

### 4. 夜間 run との関係

- 夜間 run は 4:30 に `scripts/automation/night-run.ps1` → ヘッドレス `claude -p`（`docs/night_driver_prompt.md`）で走る
- 記事化の入口（`scripts/run/prepare-from-sumahon.mjs` / `import-generated.mjs` / `create-from-sumahon.mjs`）で **`assertNoTrackedChanges()`**（`scripts/sumahon/push-preview.mjs`）が実行され、**tracked な未コミット変更が 1 つでもあれば例外で停止**する（`regenerate-from-queue.mjs` の exit 2）。**untracked は対象外**（`--untracked-files=no`）
- `scripts/automation/run-sumahon-queue.ps1` も、main 以外のブランチにいて tracked dirty があると reset を拒否して安全終了する
- つまり **本体作業ツリーが tracked dirty のまま朝を迎えると、その晩の記事は作られない**
- **夜間 run の前に走る長時間セッションは §3 を厳守する。** とくに **5（本体のクリーン化）と 6（ブランチ位置）** を落とすと、静かに 1 本分の記事を失う

## 例外: 判断を仰ぐ最小ケース

以下のいずれかに該当する場合のみ、人間に **1 度だけ** 短く相談する（実行前に必ず提示）:

1. **公開判断が割れる**: 自動修正後も sourceCheck / articleQualityCheck の blocking が残る、かつ自動リトライ 3 回が失敗
2. **記事の核となる主張が事実と矛盾している疑い**: hedge を尽くしても噂を断定しているように読める、または公式情報と明確に食い違う場合
3. **サムネに実在ロゴ・元記事画像コピーの疑い**: 自動検査ではグレー判定で、人間目視で外したい場合
4. **コスト・破壊操作の懸念**: API トークン消費が著しく増える / 既存記事を上書きする / 既存 PR を force-push で巻き戻す等

その他は自律実行。途中報告は最低限にして、最終報告で必要情報を一括提示する。

## 最終報告の固定テンプレ

### Phase A 完了報告（記事化 → PR 作成。**ここで必ず停止**）

```
## Phase A 完了サマリ — 記事化と PR 作成まで

### 記事
- slug:
- タイトル:
- カテゴリ / 役割:
- queue status: review_waiting

### 検証
- sourceCheck: ok / urlCount / sumahon非露出 / reportingNotice
- articleQualityCheck: titleDuplicate / markdownResidue / character_visual_missing 等
- 禁則チェック: 0 hits（普通の人 / すまほん / smhn / ここから本文 / 最終稿 / 初稿 / 元記事）
- ビルド: N pages OK
- 画像: 元 XX.X MB → WebP X.X MB（22 枚など）

### 自動化結果
- preview ブランチ: preview/{slug} (commit: xxxx)
- PR: #NN (URL)
- Cloudflare Preview URL: https://xxxx.sumalabo.pages.dev/articles/{slug}/（取れない場合はローカル確認URL）
- visual-review: blocking N / warning N / deferred N

### ユーザーに確認してほしい点
- [ ] 記事の核となる主張に違和感がないか
- [ ] サムネに実在ロゴ・原画コピーが混入していないか
- [ ] 参考URLが正しく到達するか（任意 1 件クリック）
- [ ] スマホ表示で読みにくい箇所がないか

公開へ進める場合は「**記事OK、公開へ**」と指示してください。
（merge / deploy / X投稿は了承後にだけ実行します。）
```

### Phase B / C 完了報告（公開 + X 投稿。ユーザー了承後）

```
## Phase B / C 完了サマリ — 本番反映と X 投稿

### 記事
- slug:
- 本番URL: https://sumalabo.com/articles/{slug}/
- queue status: x_posted

### Phase B（公開）
- PR #NN merge 済み（merge commit: xxxx）
- main 同期 OK
- 本番デプロイ: ok
- strict verify: 8/8 pass（httpStatus / titleNotGeneric / slugInHtml / notHomepageFallback / hasArticleBody / hasThumbnailRef / noProhibitedCopy / indexListsArticle）

### Phase C（X 投稿）
- 投稿アカウント: @suma_labo
- OGPカード: 表示 OK / サムネ: 表示 OK / タイトル一致 OK
- 投稿URL: https://x.com/suma_labo/status/xxxxxxxx
- 投稿時刻: yyyy-mm-ddTHH:MM:SS+09:00
- 投稿文（先頭抜粋）: ...

### queue 更新内容
- status: x_posted
- productionUrl / publishedAt / prUrl / mergeCommit / xPostUrl / xPostedAt / xPostText を記録
- source: user_directed / triggeredBy: user / triggerInput: {URL or folder}
```

## 図解スライドを記事に入れる場合のルール（必須）

**「スライド画像を入れる場合は、必ずコピー可能な HTML 要約をセットにする」** が標準です。画像内文字はコピーできず、SEO・アクセシビリティでも弱いため、画像は視覚理解用、HTML は読み取り・コピー・補足用としてセットで扱います。

### 必須構成（各図解 1 ブロック）

```mdx
<section class="article-slide-section article-wide-block">
  <p class="slide-intro">短い導入文 1 文（何を見る図か）</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/{slug}/figNN-name.png"
         alt="図の内容を 1〜2 文で説明（スクリーンリーダー向け）"
         loading="lazy" decoding="async" />
    <figcaption>図解：図のタイトル</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>図のポイント（コピー可能）</strong></p>
    <ul>
      <li><strong>項目1</strong>：画像内の重要テキストを HTML でも読める形で（短く）</li>
      <li><strong>項目2</strong>：1 行は短く、bullet は 2〜5 個まで</li>
      <li><strong>項目3</strong>：完全な文字起こしではなく、読者がコピーしたい要点に絞る</li>
      <li><strong>結論</strong>：そのスライドから持ち帰る一言</li>
    </ul>
  </div>
</section>
```

### ルール

1. **画像と HTML 要約は同じ wide-block 幅で揃える**（PC では 1080px シェル全幅）。`article-wide-block` クラスは必須。
2. `alt` 属性は必ず入れる（スクリーンリーダー / 画像が表示されない環境のフォールバック）。
3. `figcaption` も必ず入れる（画像が表示される環境で何の図かを示す）。
4. `slide-reading-note` の bullet は **2〜5 個**、各 bullet は **1 行で読める長さ** に抑える。
5. 画像内の **全テキストを書き起こさない**。読者がコピーしたい要点だけを HTML 化する。
6. 画像と同じ内容を本文の長文段落で繰り返さない（重複削減）。
7. 完全な文字起こしが必要なときは `<details class="slide-transcript article-wide-block">` で折りたたみを追加してよい。ただしページが重く見えるなら `slide-reading-note` だけで十分。

### 使うクラス（既存）

- `article-slide-section` — 導入文・図・読み取りポイントを wide-block でまとめるラッパー
- `slide-intro` — 短い導入文
- `article-slide-figure` — 画像 + figcaption
- `slide-reading-note` — コピー可能な読み取りポイント（teal の上ボーダー + ミントの BG）
- `slide-transcript` — 完全テキスト用の折りたたみ（任意）
- `article-wide-block` — 行長制約から外し、shell 全幅を使うためのフラグクラス

### 実装場所

- CSS: `src/layouts/ArticleLayout.astro` の `<style>` ブロック末尾
- 参考実装: `content/articles/202605-apple-airtag-size-ai-pendant-iphone-siri.mdx` の fig01〜fig05

## 記事の主軸（すまラボ記事方針・2026-05-31 補正）

すまラボの記事の中心は、**デジタルニュース（スマホ・AI・ガジェット）をやさしく噛み砕いて説明すること**。
「あなたに関係ある？」「課金すべき？」のような **読者判断は補助**であって、記事の主軸に寄せすぎない。

記事の中心に置くのは次の 5 点：

1. **何が起きたのか**（事実の核）
2. **なぜ話題なのか**（意味・背景）
3. **どう誤解されやすいか**（読み違いの整理）
4. **確定情報と未確定情報の整理**（事実 / 報道ベース / 未確定を分ける）
5. **ニュースの意味づけ**（読者の生活・選択にとって何を意味するか）

読者判断（向いている人 / 様子見でよい人 / 判断ガイド）は **記事の最後寄りに補助として** 入れてよいが、
記事全体を「課金すべきか診断」に寄せない。判断ガイドは 1〜2 ブロックに留め、本文の主役は上記 5 点。

## 深掘り記事の構成標準（スライド主役 / lead-first / 図解中心）

すまラボの深掘り記事（ニュース解説・比較・基礎解説）では、**長文だけで押し切らない**。
重要論点は **図解スライド・比較表・判断ガイド・チェックポイント一覧** に分解し、本文は
**「ニュースの噛み砕き」と、補助としての判断の言語化** に集中させる。

### 基本ルール

1. **「先に結論」は長文 3 段落ではなく、ひとこと結論 + 要点整理 + 短い補足** で組む:
   - 見出し `先に結論` の直下に `<p class="lead">…</p>`（19px 太字 / 1 文）
   - 続けて 3 bullet で要点
   - 補足は短い 1〜2 段落だけ
   - 「今見るべき N 点」など別ボックスに切り出す
2. **H2 直下にも `.lead`** を置き、そのセクションの主張を 1 文で先出しする
3. **長文段落の連続を避ける**:
   - 1 段落は 3〜4 行（150 字目安）に抑える
   - 4 段落以上連続して同じ話題を続けない
   - `box / list / table / slide` を**視線の止まる場所**として一定間隔で挟む
4. **スライド・図解で説明した内容を、本文の長文段落で再説明しない**:
   - スライド直下は `slide-reading-note` の短い箇条書きだけで止める
   - 「読み取りポイント」「補足」「判断ポイント」を短い box / list で
5. **キャラクター（ひまり・らぼまる）を使った図解** は、理解補助・比較補助・チェック補助の役割として有効。サムネだけでなく、本文内の図解スライドにも積極的に登場させてよい
6. **外向きコピー**: 「普通の人向け」は禁止。代わりに「買う前に見るポイント」「今見るべき点」「判断ガイド」「便利？それとも様子見？」など
7. **行長（PC）**: news 系の本文段落・リストは `max-width: 940px`、wide-block（slide / dashboard / pros-cons / verdict / wide-comparison / decision-guide / summary-box / info-box / check-box / table-card）は shell 全幅（PC 1080px）。本文行長と画像幅の差が大きくならないように

### 推奨テンプレ（1 H2）

```mdx
## セクション見出し

<p class="lead">そのセクションの主張を 1 文で先出し。<strong>キーワード</strong>は太字で。</p>

（必要なら）2〜4 行の導入段落 1〜2 個

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">何を見る図か 1 文</p>
  <figure class="article-slide-figure">…</figure>
  <div class="slide-reading-note">
    <p><strong>図のポイント（コピー可能）</strong></p>
    <ul>
      <li><strong>キーワード</strong>：短い解説</li>
      <li>2〜5 個まで、各行は短く</li>
    </ul>
  </div>
</section>

（必要なら）読み取り後の短い結論 1 段落
```

### 避けたい形

- H2 → 長文段落 5〜8 個 → table → 長文段落 3 個 → box → 長文段落 2 個
- スライドの直後に、同じ内容を長文で書き直す
- 「先に結論」に 3 段落の長文を並べる

### 横スクロール標準（PC 原則禁止）

PC 表示では **横スクロールを原則使わない**。スマホでも基本は折り返しで収める。横スクロール
は「列数が非常に多い詳細比較表 / 数値・スペック密度が高い表 / 折り返すと著しく読みにくく
なる表」のみで明示的に許可する。

- **PC**：すべての `<table>` は `display: table; white-space: normal; word-break: break-word;
  overflow-wrap: anywhere;` で折り返し前提
- **opt-in**：横スクロールを許可したい大型表は **`.is-scrollable`** をラッパー or 自体に付ける
  と PC でも横スクロール可能（`overflow-x: auto; display: block; white-space: nowrap;`）
- **`.wide-comparison`**：PC は折り返し、モバイルだけ自動 overflow-x: auto を許可（4 列前後
  までの比較表向けデフォルト）
- **revenue 系**：`.article-shell--revenue` の table は引き続き `display: block; overflow-x:
  auto;` を維持（料金比較などの密度の高い表のため）
- 表のセル内文章は **短く保つ**（1 セル 30 文字以内が目安。長い説明は本文側に逃がす）
- `min-width` を `<th>` / `<td>` に固定しない（列幅は表の中身に任せる）

`.is-scrollable` を使う条件:
- 6 列以上の詳細比較表
- 数値・スペックが多い表
- 折り返すと著しく読みにくくなる表

それ以外は PC で必ず折り返して収める。スライド画像 / `slide-reading-note` / 本文段落・
リスト / `.lead` が横にはみ出さないことを `npm run build` 後に必ず確認すること。

### CSS の場所

- `.lead` / `.article-slide-section` / `.slide-intro` / `.slide-reading-note` /
  `.article-slide-figure` / `.slide-transcript` / その他 wide-block の各クラスは
  `src/layouts/ArticleLayout.astro` の `<style>` ブロックに集約

### 参考実装

- `content/articles/202605-apple-airtag-size-ai-pendant-iphone-siri.mdx`
  （Apple AIペンダント記事。先に結論 + 5 図解スライド + 各 H2 lead 配置の例）

## 内部導線（ニュース→収益記事）ルール（2026-07-19 追加）

すまラボは「ニュース記事（流入）」と「収益記事（比較・リコール確認などアフィリエイト付き）」の二層構造。ニュースから収益記事へ**自然に**送客する導線を、以下 3 経路＋計測で持つ。**定義の単一ソースは `data/related-guides.json`**（Astro 側 `src/lib/related-guides.ts` と夜間run `scripts/sumahon/generate-article-prompt.mjs` の両方がこの JSON を読む。収益記事や誘導キーワードを足すときはこの JSON だけ直す）。

- **A: 記事末尾「関連ガイド」カード（自動）** — 記事の本文・タグ・カテゴリを JSON の収益記事定義と照合し、一致した収益記事カードを最大2枚、記事末尾に表示（`src/components/RelatedGuides.astro`）。ラベルは「編集部おすすめ」＝**広告と誤認されない表現**にし、アフィボックスとは視覚的に区別する。スコア=キーワード一致+2/件・カテゴリ一致+1、閾値3（＝カテゴリだけ/1キーワードだけでは出さない）。**無関係な記事には出さない**。導線先ページ自身には出さない。
- **B: 本文内の文脈リンク（夜間run組み込み）** — Phase A のプロンプト（`generate-article-prompt.mjs` の「収益記事への文脈リンク」節・`phase-a-orchestrator.mjs` の write_mdx）で、**本文が実際にそのトピックに触れたときだけ**自然な一文で内部リンクを**1本まで**挿入可（言及が無ければ入れない）。検品（`generate-independent-inspection-prompt.mjs` の (D) internalLinks）で「文脈的に自然か・無理な挿入がないか・1本以内か」を判定。**リンク問題の直し方は本文MDXの削除/修正**（画像再生成ではない・overallPass に影響させない）。
- **D: 一覧面「定番ガイド」差し込み** — ニュース/記事一覧・カテゴリ一覧・トップのニュースセクション直下に、収益記事カードを N 件ごと（既定6）に差し込む（`src/components/StapleGuideCard.astro` + `src/lib/staple-cards.ts`）。必ず**「定番ガイド」ラベル**＋**「更新日」表記**にして新着ニュースと誤認させない。同じ収益記事が何度も出ないよう 1 覧あたり各カード最大1回に上限化。既にそのカテゴリに並ぶ収益記事は重複回避で除外。
- **計測** — A/B/D の全リンクに `data-drainage`（lane）を付け、`src/components/DrainageTracking.astro` の1個の委譲リスナが GA4 custom event `internal_drainage`（params: lane / target / from_path）を発火。B の本文内リンクは data 属性が無くても href が収益記事なら lane='in_body' で拾う。可視化（司令室）はスコープ外＝イベント発火まで。

**アフィリエイトボタンのコントラスト標準**: 店舗ボタン（`AffiliateLinks.astro` / `ProductCard.astro`）は**テーマで反転する `var(--teal)` を背景に使わない**（ダークで明色化し白文字が読めなくなる）。白文字で light/dark 両方 WCAG AA(4.5:1)以上の固定色に統一する（amazon/base #0f766e・楽天 #0e7167・Yahoo #115e59・公式 #3f5168）。

**楽天アフィリエイト ID の管理**: ID は `src/config/affiliate.ts` の `rakutenAffiliateId` **1 か所のみ**で管理する（具体値はドキュメントに書かない）。全楽天リンクは `buildMallLink()` がビルド時に生成し直書きリンクは無いので、**切り替えはこの 1 行を書き換えて build するだけ**で全ページに反映される。切替後は旧 ID 残存 0・リンク総数一致・rel 維持・着地先（`pc=`）不変を dist/本番で確認する。詳細: [`docs/affiliate_setup.md`](docs/affiliate_setup.md) §5-1b

> 詳細: [`docs/internal_drainage.md`](docs/internal_drainage.md)

## 関連ドキュメント

- `docs/internal_drainage.md` — 内部導線 A/B/D＋計測の仕組みと収益記事の足し方
- `docs/force_refresh.md` — 検品用の強制更新（PWAで最上部プル→画像までキャッシュ回避で再取得）と、更新が見えない真因の切り分け
- `docs/visual_preview_review.md` — Preview スクショ 2 パスレビューの手順とチェック観点
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付（標準）
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック
- `docs/pwa_review_notification.md` — PWA 通知の仕組み
- `docs/preview_approval_button.md` — 承認ボタンの動作
- `scripts/sumahon/generate-handoff.mjs` — handoff / chrome-steps の生成元
- `scripts/sumahon/validate-generated-article.mjs` — sourceCheck / articleQualityCheck

## 改訂

このポリシーが変わるのは、人間が **明示的に** 「役割分担を変えたい」と言ったときだけ。それ以外はこのまま固定。


## Final report output filter (mandatory)
All user-facing completion reports, including Codex interactive, night run, attended runs, and unattended X posting, must pass through `npm run report:filter` immediately before delivery. Remove every line whose first non-whitespace characters are `::`. Never send an unfiltered completion report.
