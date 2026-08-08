# 夜間自動運転 環境手順書（night_run_setup）

testMode の夜間無人運転（既定 4:30 JST）を成立させるための PC 側セットアップ。
タスクスケジューラはASCII-onlyの`D:\work\sumalabo-night-entry.cmd`だけを直接起動する。入口は
昼作業と分離した専用clone `D:\work\sumalabo-night-runner` を`origin/main`へ同期してから、
`scripts/automation/night-run.ps1` → ヘッドレスClaude Code（claude-opus-4-8）→
`docs/night_driver_prompt.md`。

## 1. スケジューラ登録

```
npm run schedule:auto-run              # 毎日 04:30 JST で登録
npm run schedule:auto-run -- --time 03:00   # 時刻変更
npm run schedule:auto-run -- --remove       # 解除
```

- タスク名: `Sumalabo Night Driver`（04:30）/ `Sumalabo Night Watchdog`（05:30）/ `Sumalabo Claude Auth Probe`（03:30）
- 03:30の認証プローブは`auth status`を使わず、軽量な`claude -p`を実行する。401時は共通Web Pushで通知する
- 専用cloneがdirty、fetch失敗、origin/main checkout失敗の場合は記事工程へ入らずfailed契約を記録する
- `autonomy.json`等の運用台帳は公開Gitに含めず、タスク登録時に昼環境のprivate stateから専用cloneのignored領域へ初期同期する。以後の夜間更新は専用clone側に保持する
- 多重起動ガード: `logs/night/run.lock`（PID 生存確認つき）。前夜の run が生きていれば新規起動しない
- Claude は独立プロセスグループで起動し、出力を `logs/night/{date}.claude.log` へ直接保存する。`run.lock` は親PID・監督PID・子PID・15秒heartbeatを保持するため、親だけが落ちても重複起動しない
- 05:30 の `Sumalabo Night Watchdog` は完了痕跡を信用せず、本番URL HTTP 200・PR merged・strict verify全合格・X二段階台帳の4点を独立に再取得する。期限時点で4点が揃わない場合は、heartbeatが正常でも`failed`としてHiroへPush通知する
- 1 晩 1 本ガード: `logs/night/last-run.json`（JST 日付で判定）

## 2. スリープ解除（wake timers）

schtasks のユーザー権限登録では「スリープ解除して実行」を設定できないため、次のどちらかを選ぶ:

- **推奨（テスト期間中）**: 夜間はスリープさせない
  - 設定 → システム → 電源 → 「画面とスリープ」→ 電源接続時のスリープを「なし」
  - もしくは `powercfg /change standby-timeout-ac 0`
- 恒久運用にする場合: タスクスケジューラ GUI で該当タスクのプロパティ → 条件 →
  「タスクの実行時にスリープを解除する」を ON（GUI からの 1 回だけの手動操作）

## 3. 画面ロックとブラウザ操作の相性（重要・実測メモ）

夜間運転は Chrome MCP（DOM 操作）と PowerShell のフォアグラウンド操作（CF_HDROP 貼り付け・
SendKeys）を併用する。ロック画面での挙動は次のとおり:

| 操作 | ロック中 | 根拠 |
|---|---|---|
| Chrome MCP の DOM 操作（javascript_tool / navigate） | ○ 動く | CDP 経由でウィンドウ前面化不要。2026-07-05 の実走で `visibilityState: hidden` のまま全ターン成功 |
| Chrome MCP の computer type / click | △ タブ単位で動く | 同上（スクリーンショット・type とも hidden タブで成功実績あり） |
| **chatgpt-attach-files-clipboard.ps1（画像正本の添付）** | **× 動かない想定** | SetForegroundWindow + SendKeys(Ctrl+V) は対話デスクトップが必要。ロック中はフォアグラウンド化が失敗する |

→ **現実解（テスト期間中）**: 夜間はロックしない（スリープなし + 自動ロックなし）。
   - 設定 → アカウント → サインインオプション → 「しばらく操作しなかった場合…」を「なし」
   - 離席時のセキュリティが気になる場合は、テスト 3 本の期間（〜7/12）だけの限定措置とし、
     終了後に元へ戻す
→ 恒久運用したい場合の選択肢（将来課題）: 添付経路を CDP の DataTransfer 直挿入に置き換えて
   フォアグラウンド依存をなくす（実装は別途）。

### ⚠️ 既知の重大制約（2026-07-05 立ち会い実走で確定）— 無人運転の最大ブロッカー

**ヘッドレス `claude -p` からは画像正本の添付が成立しない**（ロック有無に関わらず）。
Claude Science 記事の立ち会い実走（Opus 4.8 ヘッドレス）で、Chrome ペアリング・ChatGPT
チャット到達まで正常に進んだが、**画像生成の直前で正本 2 枚の添付が 3 回・2 方式とも失敗**した:

1. `chatgpt-attach-files-clipboard.ps1`（CF_HDROP + SendKeys Ctrl+V）:
   `foreground lost before Ctrl+V` — `claude -p` はバックグラウンドプロセスのため
   SetForegroundWindow が安定して勝てず、勝てた回でも Ctrl+V が web content に届かず composer は空。
2. CDP 経由の Ctrl+V（MCP computer key）: ブラウザのセキュリティでファイルのクリップボード
   貼り付けが発火せず 0 枚。

**影響**: 現状の設計では、**画像を含む記事の無人完走は不可能**。7/9・7/10 の無人 run も
同じ箇所で必ず止まる（Opus は毎回、操作前に検知して安全停止・スロット未消費・再開可能状態で通知
＝安全装置は正しく機能する）。対話セッション（人間の前面フォーカスあり）では従来どおり添付は成功する。

**恒久解の候補（未実装・要判断）**:
- (A) 添付を CDP の `DataTransfer`/`DataTransferItemList` 直挿入 + `drop` イベント合成に置き換え、
  OS フォアグラウンドと OS クリップボードへの依存を完全に外す（本命。実装すれば無人でも通る見込み）
- (B) 無人 testMode は「画像なしで成立する記事のみ」に限定し、画像必須記事は人間添付のハイブリッドにする
- (C) 添付だけを人間が行う半自動（夜間の頭で 2 枚 D&D → 以降は無人）

→ **【解決済み・2026-07-05】常設キャラ工房チャット方式を採用。**
   ヘッドレスからの画像添付は不可能（上記）だが、**添付は「一度だけ」で済む**ように設計を変更した:
   - `data/automation/image-workshop.json` の `conversationUrl` = 常設チャット「すまラボ画像工房」。
     この会話の冒頭に公式キャラ正本2枚（ひまり・らぼまる）を**対話セッションで一度だけ添付済み**。
   - 夜間ドライバーはこの URL に navigate し、**会話の続き**として画像を生成する（毎回の添付は不要）。
     ChatGPT はこの会話の冒頭画像を参照して生成するため、フォーカス/クリップボード非依存で無人可。
   - **再シード運用**: 数記事ごとに `factcheck` でキャラの顔立ち・配色の一貫性を監視する。劣化したら
     人間が対話セッションで正本2枚を貼り直し（＝再シード）して通知する。ドライバーは会話冒頭に
     画像2枚が無いと判定したら `blocked_image_generation_unavailable` で中止・通知する。
   - 一度きりの初期添付が必要になるのは「常設チャットの新規作成時／再シード時」だけ。通常運転では不要。

## 4. ChatGPT ログインセッション維持

- Chrome の自動化プロファイルで chatgpt.com にログインした状態を保つ（「ログイン状態を維持」）
- セッション切れは夜間運転の中止条件（ドライバーが検知して通知）
- 確認方法: 夜間運転前に `https://chatgpt.com` を開き、ログイン済みであること
- 注意: ChatGPT 側のログアウト・CAPTCHA・再認証はドライバーでは突破しない（設計方針）

## 5. Chrome 自動化プロファイル

- Chrome は**起動したままにする**（Claude in Chrome 拡張がペアリングされたウィンドウ）
- 拡張のペアリング先は Chrome のみ（Edge 禁止）
- X（x.com）も @suma_labo でログイン済みであること
- タブ滞留を避けるため、夜間運転は毎回**新規タブ**を作って使い、終了時に閉じる

## 6. 電源・その他

- ノート PC の場合: AC 接続 + カバーを閉じてもスリープしない設定
  （電源オプション → カバーを閉じたときの動作 → 何もしない）
- Windows Update の夜間再起動に注意（アクティブ時間を 4:00-6:00 を含まない設定に）
- claude CLI が PATH にあること（`claude --version` で確認）

## 7. 動作確認（登録後に 1 回やる）

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1
```

- testMode 非アクティブなら preflight でスキップされる（それが正常）
- ログ: `logs/night/{YYYY-MM-DD}.log`

## ラッパー自己診断

記事・scout・testModeを消費せず、独立起動・直接ログ・子PID・heartbeat・終了回収を1ターンで実測する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1 -RunnerSelfTest
```

## タスクスケジューラ監査ログ（Hiroが管理者PowerShellで1回実行）

```powershell
wevtutil sl Microsoft-Windows-TaskScheduler/Operational /e:true
wevtutil gl Microsoft-Windows-TaskScheduler/Operational | Select-String 'enabled:'
```

`enabled: true` が出れば完了。以後、イベントビューアーの
`Applications and Services Logs > Microsoft > Windows > TaskScheduler > Operational` で開始・終了・外部停止を追跡できる。

## 本番タスク受入と起動層の凍結

自己診断exit 0だけでは合格にしない。`npm run schedule:auto-run -- --validate-registration`で実登録XMLにテスト系フラグがないことを確認する。続いて`logs/night/scheduled-acceptance.request.json`へ15分以内の`requestedAt`を置き、実タスクを`schtasks /Run /TN "Sumalabo Night Driver"`で起動する。`scheduled-acceptance.result.json`の`ok: true`は、通常の本番コマンドでlock・cleanup・恒久運転preflight・Chrome確認まで通り、記事生成直前で安全終了した証拠とする。

起動層は2026-07-30から凍結中。障害対応以外の変更は禁止し、障害修正時だけ上記の実登録XML確認と実タスク受入を再実施する。
