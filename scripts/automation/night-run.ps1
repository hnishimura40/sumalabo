# scripts/automation/night-run.ps1 — 夜間自動運転の起動エントリ（タスクスケジューラから呼ばれる）
#
# 役割:
#   1. 多重起動ガード（前夜/当夜の run が生きていたら新規起動しない）
#   2. testMode の軽量プリフライト（非アクティブなら Claude を起動すらしない）
#   3. ヘッドレス Claude Code（claude -p / モデル claude-opus-4-8 / 最小 allowlist）で
#      docs/night_driver_prompt.md を実行
#   4. ログ全量を logs/night/{date}.log に保存
#
# 登録: npm run schedule:auto-run（既定 4:30 JST）
# 手動テスト: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1

param(
  # ブラウザ経路だけドライラン実測（Chrome起動→DevTools→chrome-preflight）。
  # testMode を消費せず、claude 本体も起動しない。修正の実測確認用。
  [switch]$BrowserCheckOnly,
  # 記事を作らず独立起動・直接ログ・PID/heartbeat・終了回収を実測する。
  [switch]$RunnerSelfTest
)
$ErrorActionPreference = 'Continue'
$RepoRoot = "D:\documents\動画作成関連\すまラボ"
Set-Location $RepoRoot

$NightDir = Join-Path $RepoRoot "logs\night"
New-Item -ItemType Directory -Force $NightDir | Out-Null
$DateStr = (Get-Date).ToString("yyyy-MM-dd")
$LogFile = Join-Path $NightDir "$DateStr.log"
$LockFile = Join-Path $NightDir "run.lock"
$HeartbeatFile = Join-Path $NightDir "$DateStr.heartbeat.json"
$CompletionFile = Join-Path $NightDir "$DateStr.completion.json"
$AcceptanceRequestFile = Join-Path $NightDir "scheduled-acceptance.request.json"
$AcceptanceResultFile = Join-Path $NightDir "scheduled-acceptance.result.json"
if ($BrowserCheckOnly -and $RunnerSelfTest) { throw 'BrowserCheckOnly と RunnerSelfTest は同時指定できません。' }
if ($RunnerSelfTest) {
  $LockFile = Join-Path $NightDir "runner-selftest.lock"
  $HeartbeatFile = Join-Path $NightDir "$DateStr.runner-selftest.heartbeat.json"
}

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $LogFile -Value $line -Encoding utf8
  Write-Host $line
}

# ---- 1. 多重起動ガード ----（ドライランでは lock を取らない）
if (-not $BrowserCheckOnly) {
  if (Test-Path $LockFile) {
    try {
      $lock = Get-Content $LockFile -Raw | ConvertFrom-Json
      $livePids = @(@($lock.pid, $lock.parentPid, $lock.supervisorPid, $lock.childPid) |
        Where-Object { $_ } | Select-Object -Unique | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
      $heartbeatFresh = $false
      if ($lock.heartbeatAt) {
        try { $heartbeatFresh = (((Get-Date) - [datetime]$lock.heartbeatAt).TotalMinutes -le 3) } catch {}
      }
      if ($livePids.Count -gt 0 -or $heartbeatFresh) {
        Log "SKIP: 前回の run が生存中（pids=$($livePids -join ','), heartbeat=$($lock.heartbeatAt)）。多重起動しません。"
        exit 0
      }
      Log "古い lock（全PID終了・heartbeat期限切れ）を回収します。"
    } catch {
      Log "lock ファイルが壊れています。回収します。"
    }
    Remove-Item $LockFile -Force -Confirm:$false
  }
  @{ pid=$PID; parentPid=$PID; startedAt=(Get-Date).ToString("o"); heartbeatAt=(Get-Date).ToString("o"); status="starting"; selfTest=[bool]$RunnerSelfTest } |
    ConvertTo-Json | Set-Content $LockFile -Encoding utf8
}

function Invoke-ClaudeIsolated([string]$PromptText, [string[]]$ClaudeArgs, [string]$OutputFile, [string]$Label) {
  $PromptPath = Join-Path $NightDir "$DateStr.$Label.prompt.md"
  $ArgsPath = Join-Path $NightDir "$DateStr.$Label.args.json"
  $RunnerOut = Join-Path $NightDir "$DateStr.$Label.runner.log"
  $RunnerErr = Join-Path $NightDir "$DateStr.$Label.runner.err.log"
  Remove-Item -LiteralPath $RunnerOut,$RunnerErr -Force -ErrorAction SilentlyContinue
  Set-Content -LiteralPath $PromptPath -Value $PromptText -Encoding utf8
  $ClaudeArgs | ConvertTo-Json | Set-Content -LiteralPath $ArgsPath -Encoding utf8
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
  $launcher = Join-Path $RepoRoot "scripts\automation\night-process-runner.mjs"
  $launcherArgs = @($launcher, "--prompt-file", $PromptPath, "--args-file", $ArgsPath, "--output-file", $OutputFile, "--state-file", $LockFile, "--claude-exe", "C:\Users\hnish\.local\bin\claude.exe", "--heartbeat-ms", "15000")
  $proc = Start-Process -FilePath $nodeExe -ArgumentList $launcherArgs -RedirectStandardOutput $RunnerOut -RedirectStandardError $RunnerErr -WindowStyle Hidden -Wait -PassThru
  if (Test-Path $RunnerErr) { Get-Content $RunnerErr -ErrorAction SilentlyContinue | Add-Content $RunnerOut -Encoding utf8 }
  Copy-Item -LiteralPath $LockFile -Destination $HeartbeatFile -Force -ErrorAction SilentlyContinue
  return $proc.ExitCode
}

try {
  if ($BrowserCheckOnly) { Log "=== BrowserCheckOnly ドライラン（testMode未消費・claude未起動） ===" }
  if ($RunnerSelfTest) { Log "=== RunnerSelfTest（testMode未消費・記事生成なし） ===" }

  # ---- 1-bis. Codex画像archiveの期限整理 ----
  # 本番採用済み原本だけが対象。archive移動から30日を超えた記事フォルダを削除し、
  # D:\downloads\sumalabo-codex\cleanup-ledger.jsonl に監査記録を残す。
  if (-not $BrowserCheckOnly -and -not $RunnerSelfTest) {
    Log "image cleanup: archive 30日経過分を確認"
    $cleanup = node scripts/automation/image-output-lifecycle.mjs --prune 2>&1
    $cleanupExit = $LASTEXITCODE
    Log ($cleanup | Out-String).Trim()
    if ($cleanupExit -ne 0) {
      Log "WARN: image archive cleanup failed (exit $cleanupExit)。記事生成は継続し、原本は削除しません。"
    }
  }

  # ---- 2. 軽量プリフライト（Claude を起動する前に node だけで判定） ----
  # ドライランでは testMode ゲートをスキップ（ブラウザ経路だけ確かめたいため）。
  if (-not $BrowserCheckOnly -and -not $RunnerSelfTest) {
    Log "preflight: test-mode --status"
    $preflight = node scripts/automation/test-mode.mjs --status 2>&1
    $preflightExit = $LASTEXITCODE
    Log ($preflight | Out-String).Trim()
    if ($preflightExit -ne 0) {
      Log "SKIP: 恒久夜間運転が非アクティブ（exit $preflightExit）。Claude を起動しません。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'skipped',title:'[夜間run] 夜間運転スキップ（恒久運転非アクティブ/実行済み）'}))" 2>&1 | Out-Null
      exit 0
    }
  }

  # ---- 2-bis. Chrome 起動確認（デフォルトプロファイル・拡張経路） ----
  # 夜間ドライバー（claude）は claude-in-chrome 拡張で **デフォルトプロファイルの Chrome** を
  # 操作する（ここが ChatGPT/X ログイン済み・拡張ペアリング済みの本番環境）。
  # 【Chrome 136+ 対応】Chrome 136 以降、デフォルトプロファイルでの --remote-debugging-port は
  # 無効化される（実測 2026-07-09 / Chrome 150：デフォルトではポート bind せず、専用 user-data-dir
  # なら bind）。そのため **debug-port ベースのプリフライトは使わない**。実操作は拡張が担うので、
  # ここでは「Chrome が起動していて拡張が接続できる状態」だけ保証する。**ChatGPT/X ログイン生存の
  # 検査は claude 側（拡張）で行う**（docs/night_driver_prompt.md 0-bis）。
  $ChromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
  if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }

  if (-not (Test-Path $ChromeExe)) {
    Log "SKIP: Chrome 実行ファイルが見つからない。ブラウザ経路なしのため停止。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[夜間run] 夜間運転停止: Chrome実行ファイル不明'}))" 2>&1 | Out-Null
    exit 0
  }

  $chromeCount = @(Get-Process chrome -ErrorAction SilentlyContinue).Count
  if ($chromeCount -gt 0) {
    Log "Chrome は既に起動中（$chromeCount プロセス）。拡張経路を利用（デフォルトプロファイル）。"
  } else {
    Log "Chrome 未起動。デフォルトプロファイルで起動する（--restore-last-session で ChatGPT/X タブ・ログイン復元）。"
    Start-Process -FilePath $ChromeExe -ArgumentList @(
      "--restore-last-session",
      "--no-first-run",
      "--no-default-browser-check",
      "--start-maximized"
    ) | Out-Null
    Start-Sleep -Seconds 12   # 拡張が MCP リレーへ接続する猶予
    if (@(Get-Process chrome -ErrorAction SilentlyContinue).Count -eq 0) {
      Log "SKIP: Chrome 起動に失敗（プロセスが立ち上がらない）。停止。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[夜間run] 夜間運転停止: Chrome起動失敗'}))" 2>&1 | Out-Null
      exit 0
    }
  }

  if ($BrowserCheckOnly) {
    Log "=== BrowserCheckOnly OK: Chrome起動を確認。ChatGPT/Xログイン生存と拡張接続はdriver側（拡張）で検査する設計。claudeは起動せず終了（testMode未消費） ==="
    exit 0
  }

  if ($RunnerSelfTest) {
    $SelfTestLog = Join-Path $NightDir "$DateStr.runner-selftest.claude.log"
    Remove-Item -LiteralPath $SelfTestLog -Force -ErrorAction SilentlyContinue
    $selfArgs = @("-p", "--model", "claude-opus-4-8", "--chrome", "--max-turns", "1")
    $selfExit = Invoke-ClaudeIsolated "Reply with exactly RUNNER_SELFTEST_OK and nothing else." $selfArgs $SelfTestLog "runner-selftest"
    $selfState = Get-Content $HeartbeatFile -Raw -Encoding utf8 | ConvertFrom-Json
    $selfOutput = Get-Content $SelfTestLog -Raw -Encoding utf8
    if ($selfExit -ne 0 -or $selfState.status -ne "completed" -or -not $selfState.childPid -or -not $selfState.heartbeatAt -or $selfOutput -notmatch "RUNNER_SELFTEST_OK") {
      Log "RunnerSelfTest FAILED: exit=$selfExit status=$($selfState.status) child=$($selfState.childPid)"
      exit 3
    }
    Log "RunnerSelfTest OK: isolated exit=0 child=$($selfState.childPid) heartbeat=$($selfState.heartbeatAt) directOutput=OK"
    exit 0
  }

  # 実タスクの通常コマンドラインを schtasks /Run で通す一回限りの受入。
  # フラグを登録へ混ぜず、本番と同じ経路を記事生成直前まで通して安全終了する。
  if (Test-Path $AcceptanceRequestFile) {
    $acceptance = $null
    try { $acceptance = Get-Content $AcceptanceRequestFile -Raw -Encoding utf8 | ConvertFrom-Json } catch {}
    $fresh = $false
    if ($acceptance -and $acceptance.requestedAt) {
      try {
        $age = ((Get-Date) - [datetime]$acceptance.requestedAt).TotalMinutes
        $fresh = ($age -ge 0 -and $age -le 15)
      } catch {}
    }
    Remove-Item -LiteralPath $AcceptanceRequestFile -Force -ErrorAction SilentlyContinue
    if ($fresh) {
      @{ ok=$true; mode="scheduled_production_path_without_article"; taskName="Sumalabo Night Driver"; completedAt=(Get-Date).ToString("o"); pid=$PID; preflight="passed"; chromeProcessCount=@(Get-Process chrome -ErrorAction SilentlyContinue).Count; commandLineFlags="none" } |
        ConvertTo-Json | Set-Content -LiteralPath $AcceptanceResultFile -Encoding utf8
      Log "SCHEDULED ACCEPTANCE OK: 実タスクの通常コマンドで起動し、記事生成直前まで本番同等パスを通過。"
      exit 0
    }
    Log "WARN: 期限切れまたは不正な scheduled acceptance request を破棄し、本番運転を継続。"
  }
  # ---- 3. ヘッドレス Claude Code 起動 ----
  $PromptFile = Join-Path $RepoRoot "docs\night_driver_prompt.md"
  $Prompt = Get-Content $PromptFile -Raw -Encoding utf8
  # 最小 allowlist: 開発ツール一式 + Chrome MCP（ChatGPT 画像生成 / X 投稿に必須）。
  # 破壊的操作（git push -f 等）は allowlist に含めない。
  $AllowedTools = "Bash Read Write Edit Glob Grep ToolSearch TaskCreate TaskUpdate mcp__claude-in-chrome__*"

  # claude の出力は専用ファイルへ（runner 本体ログや tail との Add-Content ロック競合を避ける。
  # 2026-07-05 の初回実走で Add-Content が sharing violation で全損した対策）
  $ClaudeLog = Join-Path $NightDir "$DateStr.claude.log"
  Log "launch: claude -p (model=claude-opus-4-8, --chrome) -> $ClaudeLog"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $claudeArgs = @("-p", "--model", "claude-opus-4-8", "--chrome", "--allowedTools", $AllowedTools, "--max-turns", "1200")
  $claudeExit = Invoke-ClaudeIsolated $Prompt $claudeArgs $ClaudeLog "claude"
  $sw.Stop()
  Log "claude exited: code=$claudeExit elapsed=$([Math]::Round($sw.Elapsed.TotalMinutes,1))min"

  # ---- 3-bis. transient クラッシュからの1回だけ resume ----
  # claude -p は稀に "tool call could not be parsed" 等の transient エラーで exit != 0 になる
  # （2026-07-14 の atlas run: turn5 で発生し 21 分の作業を放棄）。orchestrator の状態は
  # ステップ単位で保存されているので、**未完了の記事が直近に存在すれば1回だけ再開**する。
  # 検出は find-resumable-run.mjs（halted=false / finalize未完 / research done / 60分以内）。
  # 新規 scout はせず、resume 専用プロンプトで当該 slug を仕上げるだけ。
  if ($claudeExit -ne 0) {
    $resumeSlug = (node scripts/automation/find-resumable-run.mjs --window-min 60 2>$null | Out-String).Trim()
    if ($resumeSlug) {
      Log "resume: 未完了の記事 '$resumeSlug' を検出。transient クラッシュとみなし1回だけ再開する。"
      $ResumeTemplate = Get-Content (Join-Path $RepoRoot "docs\night_driver_resume_prompt.md") -Raw -Encoding utf8
      $ResumePrompt = $ResumeTemplate.Replace("{{SLUG}}", $resumeSlug)
      $swR = [System.Diagnostics.Stopwatch]::StartNew()
      $resumeArgs = @("-p", "--model", "claude-opus-4-8", "--chrome", "--allowedTools", $AllowedTools, "--max-turns", "1200")
      $resumeExit = Invoke-ClaudeIsolated $ResumePrompt $resumeArgs $ClaudeLog "resume"
      $swR.Stop()
      Log "claude resume exited: code=$resumeExit elapsed=$([Math]::Round($swR.Elapsed.TotalMinutes,1))min (slug=$resumeSlug)"
      if ($resumeExit -ne 0) {
        node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[夜間run] 夜間運転: 再開も失敗（exit $resumeExit / slug=$resumeSlug）。logs/night/$DateStr.log を確認'}))" 2>&1 | Out-Null
      } else {
        Log "resume 成功: '$resumeSlug' を完走。"
      }
      exit $resumeExit
    }
    Log "resume: 再開対象の未完了記事なし（60分以内の in-progress state が無い）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[夜間run] 夜間運転が異常終了（exit $claudeExit）。logs/night/$DateStr.log を確認'}))" 2>&1 | Out-Null
  }

  # ---- 4. Phase B/C 未完の救済 + 無音防止（2026-07-18 追加） ----
  # claude が exit 0 でも Phase A(review_waiting)止まりで終えることがある（2026-07-18 の
  # claude-for-teachers 記事が該当）。本来は GitHub Actions の auto-phase-b が veto 窓経過後に
  # 公開するが、当リポジトリでは Actions の schedule が一切発火しない（全 workflow の runs=0）。
  # そこで **ローカルで auto-phase-b をポーリング実行**し、veto 窓経過後に Phase B を完了させる。
  # それでも未公開が残れば通知する（無音防止）。auto-phase-b.mjs は autonomy ゲート + veto 期限 +
  # 1件ずつ + post-publish verify / 自動 rollback を内包（安全）。
  try {
    $swB = [System.Diagnostics.Stopwatch]::StartNew()
    while ($swB.Elapsed.TotalMinutes -lt 45) {
      # 将来時刻でも「対象:」が出なければ review_waiting 自体が無い（＝完走済み or そもそも記事なし）→ 抜ける
      $anyPending = (node scripts/automation/auto-phase-b.mjs --decide --now 9999-01-01T00:00:00Z 2>$null | Out-String)
      if ($anyPending -notmatch '対象:') { break }
      # 実 now で veto 経過している対象があれば公開する
      $nowDecide = (node scripts/automation/auto-phase-b.mjs --decide 2>$null | Out-String)
      if ($nowDecide -match '対象:') {
        Log "Phase B fallback: veto 窓経過の review_waiting をローカル auto-phase-b で公開する。"
        node scripts/automation/auto-phase-b.mjs 2>&1 | Out-File -FilePath $ClaudeLog -Encoding utf8 -Append
        Start-Sleep -Seconds 20
        continue
      }
      # review_waiting はあるが veto 窓内 → 待って再試行
      Log "Phase B fallback: review_waiting あり・veto 窓内。5 分待機して再判定。"
      Start-Sleep -Seconds 300
    }
    # 無音防止: veto 経過後も未公開の review_waiting が残っていれば通知する
    $leftover = (node scripts/automation/auto-phase-b.mjs --decide 2>$null | Out-String)
    if ($leftover -match '対象:') {
      Log "無音防止通知: veto 経過後も未公開の review_waiting が残存。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[夜間] Phase B未完: veto経過後も未公開のreview_waitingが残っています。auto-phase-b要確認'}))" 2>&1 | Out-Null
    }
  } catch {
    Log "Phase B fallback error: $($_.Exception.Message)"
  }

  exit $claudeExit
} finally {
  if (Test-Path $LockFile) { Copy-Item -LiteralPath $LockFile -Destination $HeartbeatFile -Force -ErrorAction SilentlyContinue }
  if (-not $RunnerSelfTest -and -not $BrowserCheckOnly) {
    @{ finishedAt=(Get-Date).ToString("o"); status="wrapper_exited" } | ConvertTo-Json | Set-Content $CompletionFile -Encoding utf8
  }
  Remove-Item $LockFile -Force -Confirm:$false -ErrorAction SilentlyContinue
}

