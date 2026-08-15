# scripts/automation/night-run.ps1 — 夜間自動運転の起動エントリ（タスクスケジューラから呼ばれる）
#
# 役割:
#   1. 多重起動ガード（前夜/当夜の run が生きていたら新規起動しない）
#   2. testMode の軽量プリフライト（非アクティブなら Codex を起動すらしない）
#   3. 非対話 Codex（codex exec）で
#      docs/night_driver_prompt.md を実行
#   4. ログ全量を logs/night/{date}.log に保存
#
# 登録: npm run schedule:auto-run（既定 4:30 JST）
# 手動テスト: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1

param(
  # ブラウザ経路だけドライラン実測（Chrome起動→DevTools→chrome-preflight）。
  # testMode を消費せず、Codex 本体も起動しない。修正の実測確認用。
  [switch]$BrowserCheckOnly,
  # 記事を作らず独立起動・直接ログ・PID/heartbeat・終了回収を実測する。
  [switch]$RunnerSelfTest
)
$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
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
$RunStartedAt = if ($env:SUMALABO_NIGHT_RUN_STARTED_AT) { $env:SUMALABO_NIGHT_RUN_STARTED_AT } else { (Get-Date).ToString("o") }
$RunId = if ($env:SUMALABO_NIGHT_RUN_ID) { $env:SUMALABO_NIGHT_RUN_ID } else { (Get-Date).ToString("yyyyMMddTHHmmss.fff") }
$ContractScript = Join-Path $RepoRoot "scripts\automation\night-run-contract.mjs"
$ContractFile = Join-Path $NightDir "run-contract\$RunId.json"
$env:SUMALABO_NIGHT_RUN_ID = $RunId
$env:SUMALABO_NIGHT_RUN_STARTED_AT = $RunStartedAt
$script:SkipContractFinalizer = [bool]($BrowserCheckOnly -or $RunnerSelfTest)
$script:ChromeRunPid = $null
$script:ChromeRunExe = $null
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

function Record-ContractOutcome([string]$Mode, [string]$Reason, [string]$Detail = "") {
  $args = @($ContractScript, $Mode, "--run-id", $RunId, "--started-at", $RunStartedAt, "--reason", $Reason)
  if ($Detail) { $args += @("--detail", $Detail) }
  $result = & node @args 2>&1
  $code = $LASTEXITCODE
  Log (($result | Out-String).Trim())
  return $code
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
        $exitCode = Record-ContractOutcome "stop" "duplicate_run_guard" "既存runのPIDまたはheartbeatが有効"
        exit $exitCode
      }
      Log "古い lock（全PID終了・heartbeat期限切れ）を回収します。"
    } catch {
      Log "lock ファイルが壊れています。回収します。"
    }
    Remove-Item $LockFile -Force -Confirm:$false
  }
  @{ runId=$RunId; pid=$PID; parentPid=$PID; startedAt=$RunStartedAt; heartbeatAt=(Get-Date).ToString("o"); status="starting"; selfTest=[bool]$RunnerSelfTest } |
    ConvertTo-Json | Set-Content $LockFile -Encoding utf8
}

function Invoke-CodexIsolated([string]$PromptText, [string[]]$CodexArgs, [string]$OutputFile, [string]$Label) {
  $PromptPath = Join-Path $NightDir "$DateStr.$RunId.$Label.prompt.md"
  $ArgsPath = Join-Path $NightDir "$DateStr.$RunId.$Label.args.json"
  $RunnerOut = Join-Path $NightDir "$DateStr.$RunId.$Label.runner.log"
  $RunnerErr = Join-Path $NightDir "$DateStr.$RunId.$Label.runner.err.log"
  Set-Content -LiteralPath $PromptPath -Value $PromptText -Encoding utf8
  $CodexArgs | ConvertTo-Json | Set-Content -LiteralPath $ArgsPath -Encoding utf8
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
  $launcher = Join-Path $RepoRoot "scripts\automation\night-process-runner.mjs"
  $EnvironmentFile = Join-Path $RepoRoot "config\night-environment.json"
  $CodexExe = [string](Get-Content -LiteralPath $EnvironmentFile -Raw -Encoding utf8 | ConvertFrom-Json).codex.executable
  $launcherArgs = @($launcher, "--prompt-file", $PromptPath, "--args-file", $ArgsPath, "--output-file", $OutputFile, "--state-file", $LockFile, "--agent-exe", $CodexExe, "--heartbeat-ms", "15000")
  $proc = Start-Process -FilePath $nodeExe -ArgumentList $launcherArgs -RedirectStandardOutput $RunnerOut -RedirectStandardError $RunnerErr -WindowStyle Hidden -Wait -PassThru
  if (Test-Path $RunnerErr) { Get-Content $RunnerErr -ErrorAction SilentlyContinue | Add-Content $RunnerOut -Encoding utf8 }
  Copy-Item -LiteralPath $LockFile -Destination $HeartbeatFile -Force -ErrorAction SilentlyContinue
  return $proc.ExitCode
}

try {
  if ($BrowserCheckOnly) { Log "=== EnvironmentCheckOnly（testMode未消費・記事工程未起動） ===" }
  if ($RunnerSelfTest) { Log "=== RunnerSelfTest（testMode未消費・記事生成なし） ===" }

  # ---- Phase 0. 実在する夜間環境を記事工程より先に検査 ----
  # 正は config/night-environment.json。プロファイル名・パス・拡張ID・許可・トークン名を
  # このスクリプトへ直書きしない。静的実物検査とChrome DOM検査が合格した場合だけ先へ進む。
  $EnvironmentFile = Join-Path $RepoRoot "config\night-environment.json"
  $NightEnvironment = Get-Content -LiteralPath $EnvironmentFile -Raw -Encoding utf8 | ConvertFrom-Json
  $ChromeProfileDirectory = [string]$NightEnvironment.chrome.profileDirectory
  $ChromeUserDataDirectory = [string]$NightEnvironment.chrome.userDataDirectory
  $ChromeProfileRoot = Join-Path $ChromeUserDataDirectory $ChromeProfileDirectory
  $env:CODEX_CHROMIUM_NATIVE_HOST_MANIFEST_PATH = [string]$NightEnvironment.chrome.nativeHostManifestPath
  $env:CODEX_CHROMIUM_PREFERENCES_PATH = Join-Path $ChromeProfileRoot "Preferences"
  $ChromeExeCandidates = @($NightEnvironment.chrome.executableCandidates | Where-Object { Test-Path -LiteralPath $_ })
  $ChromeExe = if ($ChromeExeCandidates.Count) { [string]$ChromeExeCandidates[0] } else { $null }
  $XPreflightWarnings = [System.Collections.Generic.List[string]]::new()
  $ChromeDomProbePossible = $true

  if (-not $RunnerSelfTest) {
    Log "Phase 0: static environment evidence"
    $staticEnvironment = node scripts/automation/night-environment-check.mjs --static-only 2>&1
    $staticEnvironmentExit = $LASTEXITCODE
    Log (($staticEnvironment | Out-String).Trim())
    $staticJson = $null
    try { $staticJson = ($staticEnvironment | Out-String | ConvertFrom-Json) } catch {}
    if ($staticEnvironmentExit -eq 30 -or -not $staticJson -or -not $staticJson.canProceed) {
      $missing = if ($staticJson -and $staticJson.fatalFailedChecks.Count) { [string]$staticJson.fatalFailedChecks[0] } else { "environment_definition" }
      if ($BrowserCheckOnly) { exit 30 }
      $exitCode = Record-ContractOutcome "fail" "environment_preflight_failed:$missing" "Phase 0 static evidence failed"
      exit $exitCode
    }
    foreach ($warning in @($staticJson.warningFailedChecks)) { if (-not $XPreflightWarnings.Contains([string]$warning)) { $XPreflightWarnings.Add([string]$warning) } }
    if ($XPreflightWarnings.Count) { Log "Phase 0 WARNING: X静的項目=$($XPreflightWarnings -join ',')。記事工程は続行し、Phase Cだけ保留する。" }
  }

  # 無承認のarchive削除は禁止。期限整理は環境変更と同様に影響範囲提示と事前承認を要する。
  if (-not $BrowserCheckOnly -and -not $RunnerSelfTest) { Log "image cleanup: automatic prune disabled by permanent safety rule" }

  # ---- 2. 軽量プリフライト（Codex を起動する前に node だけで判定） ----
  # ドライランでは testMode ゲートをスキップ（ブラウザ経路だけ確かめたいため）。
  if (-not $BrowserCheckOnly -and -not $RunnerSelfTest) {
    Log "preflight: test-mode --status"
    $preflight = node scripts/automation/test-mode.mjs --status 2>&1
    $preflightExit = $LASTEXITCODE
    Log ($preflight | Out-String).Trim()
    if ($preflightExit -ne 0) {
      Log "SKIP: 恒久夜間運転が非アクティブ（exit $preflightExit）。Codex を起動しません。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'skipped',title:'[夜間run] 夜間運転スキップ（恒久運転非アクティブ/実行済み）'}))" 2>&1 | Out-Null
      $exitCode = Record-ContractOutcome "fail" "preflight_inactive" "test-mode --status exit=$preflightExit"
      exit $exitCode
    }

  }

  # ---- Phase 0-bis. 定義されたChromeプロファイルを起動 ----

  if (-not (Test-Path $ChromeExe)) {
    Log "Phase 0 WARNING: Chrome実行ファイル不明。記事工程は続行し、Phase Cだけ保留する。"
    if (-not $XPreflightWarnings.Contains("chrome_profile")) { $XPreflightWarnings.Add("chrome_profile") }
    $ChromeDomProbePossible = $false
  } else {
    $chromeProcesses = @(Get-Process chrome -ErrorAction SilentlyContinue)
    $chromeCount = $chromeProcesses.Count
    $visibleChromeCount = @($chromeProcesses | Where-Object { $_.MainWindowHandle -ne 0 }).Count
    $escapedProfile = [regex]::Escape($ChromeProfileDirectory)
    $targetProfileRunning = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match "--profile-directory=(?:`"$escapedProfile`"|$escapedProfile)(?:\s|$)" }).Count -gt 0
    if ($targetProfileRunning -and $visibleChromeCount -gt 0) {
      Log "Chrome は既に起動中（$chromeCount プロセス / 可視ウィンドウ $visibleChromeCount）。拡張経路を利用（$ChromeProfileDirectory）。"
    } else {
      if ($chromeCount -gt 0) { Log "Chromeのバックグラウンドプロセスのみ残存。$ChromeProfileDirectory の可視Xウィンドウを起動する。" }
      else { Log "Chrome未起動。$ChromeProfileDirectory の可視Xウィンドウを起動する。" }
      try {
        $chromeProcess = Start-Process -FilePath $ChromeExe -ArgumentList @(
          "--user-data-dir=`"$ChromeUserDataDirectory`"", "--profile-directory=`"$ChromeProfileDirectory`"",
          "--new-window", "https://x.com/compose/post",
          "--no-first-run", "--no-default-browser-check", "--start-maximized"
        ) -PassThru
        $script:ChromeRunPid = $chromeProcess.Id
        $script:ChromeRunExe = $ChromeExe
        Start-Sleep -Seconds 12
        $visibleChromeCount = @(Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
        $targetProfileRunning = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
          Where-Object { $_.CommandLine -match "--profile-directory=(?:`"$escapedProfile`"|$escapedProfile)(?:\s|$)" }).Count -gt 0
      } catch { $visibleChromeCount = 0 }
      if ($visibleChromeCount -eq 0 -or -not $targetProfileRunning) {
        Log "Phase 0 WARNING: Chrome可視ウィンドウなし。記事工程は続行し、Phase Cだけ保留する。"
        if (-not $XPreflightWarnings.Contains("chrome_profile")) { $XPreflightWarnings.Add("chrome_profile") }
        $ChromeDomProbePossible = $false
      }
    }
  }

  if (-not $RunnerSelfTest) {
    if ($ChromeDomProbePossible) { Log "Phase 0: Chrome DOM/account evidence" }
    $EnvironmentDomLog = Join-Path $NightDir "$DateStr.$RunId.environment-dom.full.log"
    $EnvironmentDomEvidence = Join-Path $NightDir "$DateStr.$RunId.environment-dom.evidence.json"
    $EnvironmentPrompt = Get-Content (Join-Path $RepoRoot "docs\night_environment_dom_probe.md") -Raw -Encoding utf8
    # Chrome control performs an OS process-presence check before DOM access.
    # Use the same workspace-write sandbox as Phase C; GH_TOKEN remains removed
    # from this child, so this only fixes the cold-start process inspection.
    $environmentArgs = @("exec", "--ephemeral", "--sandbox", "workspace-write", "--skip-git-repo-check", "--color", "never", "--output-last-message", $EnvironmentDomEvidence, "-C", $RepoRoot, "-")
    if ($ChromeDomProbePossible) {
      $environmentPublisherToken = $env:GH_TOKEN
      $environmentPublisherExpiry = $env:GH_TOKEN_EXPIRES_AT
      Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
      Remove-Item Env:GH_TOKEN_EXPIRES_AT -ErrorAction SilentlyContinue
      try {
        $environmentDomExit = Invoke-CodexIsolated $EnvironmentPrompt $environmentArgs $EnvironmentDomLog "environment-dom"
      } finally {
        if ($environmentPublisherToken) { $env:GH_TOKEN = $environmentPublisherToken }
        if ($environmentPublisherExpiry) { $env:GH_TOKEN_EXPIRES_AT = $environmentPublisherExpiry }
      }
      if ($environmentDomExit -ne 0) {
        Log "Phase 0 WARNING: DOM probe exit=$environmentDomExit。記事工程は続行し、Phase Cだけ保留する。"
        if (-not $XPreflightWarnings.Contains("dom_read")) { $XPreflightWarnings.Add("dom_read") }
      } else {
        $fullEnvironment = node scripts/automation/night-environment-check.mjs --dom-evidence $EnvironmentDomEvidence 2>&1
        $fullEnvironmentExit = $LASTEXITCODE
        Log (($fullEnvironment | Out-String).Trim())
        $fullJson = $null
        try { $fullJson = ($fullEnvironment | Out-String | ConvertFrom-Json) } catch {}
        if ($fullEnvironmentExit -eq 30 -or -not $fullJson -or -not $fullJson.canProceed) {
          $missing = if ($fullJson -and $fullJson.fatalFailedChecks.Count) { [string]$fullJson.fatalFailedChecks[0] } else { "environment_definition" }
          if ($BrowserCheckOnly) { exit 30 }
          $exitCode = Record-ContractOutcome "fail" "environment_preflight_failed:$missing" "Phase 0 fatal evidence failed"
          exit $exitCode
        }
        foreach ($warning in @($fullJson.warningFailedChecks)) { if (-not $XPreflightWarnings.Contains([string]$warning)) { $XPreflightWarnings.Add([string]$warning) } }
      }
    } else {
      foreach ($warning in @("x_login_href", "dom_read")) { if (-not $XPreflightWarnings.Contains($warning)) { $XPreflightWarnings.Add($warning) } }
    }
    $XPreflightReady = $XPreflightWarnings.Count -eq 0
    if ($XPreflightReady) { Log "Phase 0 PASS: 致命項目・X項目とも合格。" }
    else { Log "Phase 0 WARNING: X保留項目=$($XPreflightWarnings -join ',')。記事3点を続行する。" }
    if ($BrowserCheckOnly) { if ($XPreflightReady) { exit 0 } else { exit 20 } }

    # 記事候補選定は致命項目が合格した後に開始する。X警告は記事を止めない。
    Log "preflight: outer scout --auto-pick"
    node scripts/automation/scout.mjs --auto-pick --json 2>&1 | Out-File -FilePath $LogFile -Encoding utf8 -Append
    $scoutExit = $LASTEXITCODE
    if ($scoutExit -eq 10) { $exitCode = Record-ContractOutcome "stop" "no_scout_target" "outer scout found no eligible target"; exit $exitCode }
    if ($scoutExit -ne 0) { $exitCode = Record-ContractOutcome "fail" "outer_scout_failed" "outer scout exit=$scoutExit"; exit $exitCode }
  }

  if ($RunnerSelfTest) {
    $SelfTestLog = Join-Path $NightDir "$DateStr.$RunId.runner-selftest.codex.log"
    $selfArgs = @("exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check", "--color", "never", "-C", $RepoRoot, "-")
    $selfExit = Invoke-CodexIsolated "Reply with exactly RUNNER_SELFTEST_OK and nothing else. Do not use tools." $selfArgs $SelfTestLog "runner-selftest"
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
    $script:SkipContractFinalizer = $true
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
      @{ ok=$true; mode="scheduled_production_path_without_article"; taskName="Sumalabo Night Driver"; completedAt=(Get-Date).ToString("o"); pid=$PID; preflight="passed"; chromeProcessCount=@(Get-Process chrome -ErrorAction SilentlyContinue).Count; commandLineFlags="none"; articlePipelineStarted=$false } |
        ConvertTo-Json | Set-Content -LiteralPath $AcceptanceResultFile -Encoding utf8
      Log "SCHEDULED ACCEPTANCE OK: 実タスクの通常コマンドで起動し、記事生成直前まで本番同等パスを通過。"
      $exitCode = Record-ContractOutcome "stop" "scheduled_acceptance" "articlePipelineStarted=false"
      # The contract remains STOPPED so this synthetic acceptance can never be
      # mistaken for a production success.  Task Scheduler, however, needs a
      # zero process exit to prove that the unattended wrapper itself completed
      # normally.  A contract write failure must still fail closed.
      if ($exitCode -ne 20) { exit $exitCode }
      exit 0
    }
    @{ ok=$false; mode="scheduled_production_path_without_article"; taskName="Sumalabo Night Driver"; completedAt=(Get-Date).ToString("o"); pid=$PID; reason="invalid_or_expired_acceptance_request"; articlePipelineStarted=$false } |
      ConvertTo-Json | Set-Content -LiteralPath $AcceptanceResultFile -Encoding utf8
    Log "SCHEDULED ACCEPTANCE REJECTED: 期限切れまたは不正な request。記事工程を開始せず停止。"
    $exitCode = Record-ContractOutcome "fail" "invalid_or_expired_acceptance_request" "articlePipelineStarted=false"
    exit $exitCode
  }
  # ---- 3. 非対話 Codex 起動 ----
  $PromptFile = Join-Path $RepoRoot "docs\night_driver_prompt.md"
  $Prompt = Get-Content $PromptFile -Raw -Encoding utf8
  # Codexはworkspace内の生成と検証だけを担当する。Git/PR/公開は終了後に
  # このラッパーが専用GH_TOKENで実行し、.gitやCLI資格情報をCodexへ渡さない。
  # Codex の出力は専用ファイルへ（runner 本体ログや tail との Add-Content ロック競合を避ける。
  # 2026-07-05 の初回実走で Add-Content が sharing violation で全損した対策）
  $CodexLog = Join-Path $NightDir "$DateStr.$RunId.codex.log"
  Log "launch: codex exec (ephemeral, workspace-write) -> $CodexLog"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $codexArgs = @("exec", "--ephemeral", "--sandbox", "workspace-write", "--add-dir", "D:\downloads\sumalabo-codex", "--skip-git-repo-check", "--color", "never", "-C", $RepoRoot, "-")
  # GH_TOKENは外側publisher専用。Codex子プロセスへ継承させない。
  $publisherToken = $env:GH_TOKEN
  $publisherExpiry = $env:GH_TOKEN_EXPIRES_AT
  Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:GH_TOKEN_EXPIRES_AT -ErrorAction SilentlyContinue
  try {
    $codexExit = Invoke-CodexIsolated $Prompt $codexArgs $CodexLog "codex"
  } finally {
    if ($publisherToken) { $env:GH_TOKEN = $publisherToken }
    if ($publisherExpiry) { $env:GH_TOKEN_EXPIRES_AT = $publisherExpiry }
  }
  $sw.Stop()
  Log "codex exited: code=$codexExit elapsed=$([Math]::Round($sw.Elapsed.TotalMinutes,1))min"

  # ---- 3-bis. 一過性エラーの再試行 ----
  # night-process-runner が overloaded / rate limit / timeout / temporary unavailable
  # だけを30分後に1回再試行する。ここでは二重再試行を行わない。
  if ($codexExit -ne 0) {
    # An intentional stop command returns a nonzero scheduler code by design.
    # Preserve an already-recorded stopped outcome instead of overwriting it.
    if (Test-Path $ContractFile) {
      $audit = & node $ContractScript audit --run-id $RunId 2>&1
      $contractExit = $LASTEXITCODE
      Log (($audit | Out-String).Trim())
      exit $contractExit
    }
    Log "runner最終失敗: 1回の一過性再試行後または恒久エラー（exit $codexExit）。追加再試行せず停止。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[夜間run] Codexが最終失敗（exit $codexExit）。一過性再試行は最大1回'}))" 2>&1 | Out-Null
    $exitCode = Record-ContractOutcome "fail" "codex_final_failure" "codex exit=$codexExit"
    exit $exitCode
  }
  # ---- 4. Codex外側で Git/PR/Preview を実行 ----
  try {
    $handoffText = (node scripts/automation/phase-a-outer-publish.mjs --decide-json 2>$null | Out-String)
    $handoff = $null
    try { $handoff = $handoffText | ConvertFrom-Json } catch { throw "outer_publish_decision_invalid_json: $handoffText" }
    if ($handoff.slug) {
      $publishSlug = [string]$handoff.slug
      Log "Outer publish: $publishSlug を専用GH_TOKEN経路でcommit/push/PR/finalizeする。"
      node scripts/automation/phase-a-outer-publish.mjs --slug $publishSlug 2>&1 | Out-File -FilePath $CodexLog -Encoding utf8 -Append
      if ($LASTEXITCODE -ne 0) {
        $exitCode = Record-ContractOutcome "fail" "outer_publish_failed" "outer publisher exit=$LASTEXITCODE"
        exit $exitCode
      }
    }
  } catch {
    $exitCode = Record-ContractOutcome "fail" "outer_publish_failed" $_.Exception.Message
    exit $exitCode
  }

  # ---- 4-bis. Phase B target propagation retry and real-world guard ----
  # The review API can lag behind handoff completion. Wait up to five minutes for
  # this exact slug. Phase C stays forbidden until PR merge and production HTTP 200.
  $phaseBVerified = $false
  $XPendingBundleReady = $false
  if ($publishSlug) {
    Log "Phase B: review-item反映を30秒間隔・最大10回待って $publishSlug を公開する。"
    node scripts/automation/auto-phase-b.mjs --wait-for-target --attempts=10 --interval-ms=30000 --slug=$publishSlug 2>&1 | Out-File -FilePath $CodexLog -Encoding utf8 -Append
    $phaseBExit = $LASTEXITCODE
    if ($phaseBExit -eq 12) {
      $exitCode = Record-ContractOutcome "fail" "phase_b_target_not_found_after_retry" "slug=$publishSlug attempts=10 interval=30s"
      exit $exitCode
    }
    if ($phaseBExit -ne 0) {
      $exitCode = Record-ContractOutcome "fail" "phase_b_publish_failed" "slug=$publishSlug exit=$phaseBExit"
      exit $exitCode
    }

    $phaseBCheck = & node $ContractScript phase-b-check --slug $publishSlug 2>&1
    $phaseBCheckExit = $LASTEXITCODE
    Log (($phaseBCheck | Out-String).Trim())
    if ($phaseBCheckExit -ne 0) {
      $exitCode = Record-ContractOutcome "fail" "phase_b_completion_not_verified" (($phaseBCheck | Out-String).Trim())
      exit $exitCode
    }
    $phaseBVerified = $true

    $xPostFile = Join-Path $RepoRoot "logs\social\$publishSlug.x-post.json"
    node scripts/run/generate-x-post.mjs --slug $publishSlug 2>&1 | Out-File -FilePath $CodexLog -Encoding utf8 -Append
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $xPostFile)) {
      $exitCode = Record-ContractOutcome "fail" "phase_c_input_generation_failed" "missing=$xPostFile"
      exit $exitCode
    }
    if (-not $XPreflightReady) {
      $warningCsv = $XPreflightWarnings -join ','
      node scripts/automation/x-pending-bundle.mjs create --slug $publishSlug --run-id $RunId --started-at $RunStartedAt --warnings $warningCsv 2>&1 | Out-File -FilePath $CodexLog -Encoding utf8 -Append
      if ($LASTEXITCODE -ne 0) {
        $exitCode = Record-ContractOutcome "fail" "x_pending_bundle_generation_failed" "slug=$publishSlug"
        exit $exitCode
      }
      $XPendingBundleReady = $true
      Log "Phase C SKIP: X警告=$warningCsv。投稿文・返信文・4画像をpending bundleとして保全した。"
    }
  }

  # ---- 4-ter. Phase C は権限分離した別の非対話 Codex で実行 ----
  # 2026-08-09 実機マトリクスで、x.com を事前許可し、非対話 Codex 自身が
  # tabs.new() で専用タブを作る条件なら、入力・送信・投稿実在DOM確認まで成功した。
  # 対話側の所有タブは競合するため handoff/claim は標準経路にしない。
  if ($publishSlug -and $phaseBVerified -and $XPreflightReady) {
    $XPromptFile = Join-Path $RepoRoot "docs\x-post-codex-night-prompt.md"
    $XPrompt = (Get-Content $XPromptFile -Raw -Encoding utf8).Replace("{{SLUG}}", $publishSlug)
    $XCodexLog = Join-Path $NightDir "$DateStr.$RunId.codex-phase-c.log"
    $xCodexArgs = @("exec", "--ephemeral", "--sandbox", "workspace-write", "--add-dir", "D:\downloads\sumalabo-codex", "--skip-git-repo-check", "--color", "never", "-C", $RepoRoot, "-")
    $XPostInputFile = Join-Path $RepoRoot "logs\social\$publishSlug.x-post.json"
    $XPostInput = Get-Content $XPostInputFile -Raw -Encoding utf8 | ConvertFrom-Json
    $XImages = @($XPostInput.attachmentPlan.attach)
    if ($XImages.Count -ne 4) {
      $exitCode = Record-ContractOutcome "fail" "x_attachment_plan_invalid" "expected=4 actual=$($XImages.Count)"
      exit $exitCode
    }
    $ClipboardHelper = Join-Path $RepoRoot "scripts\automation\x-post-chrome.ps1"
    $XImageArg = $XImages -join ','
    $XChromeWindow = Get-Process chrome -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowHandle -ne 0 } |
      Select-Object -First 1
    if (-not $XChromeWindow) {
      $exitCode = Record-ContractOutcome "fail" "x_visible_window_missing_before_prestage"
      exit $exitCode
    }
    try {
      & $ClipboardHelper -PostText "x" -ImagePaths $XImageArg -ClipboardOnly 2>&1 | ForEach-Object { Log $_ }
    } catch {
      $exitCode = Record-ContractOutcome "fail" "x_clipboard_prestage_failed" $_.Exception.Message
      exit $exitCode
    }
    Log "Phase C: 画像4枚を外側工程でCF_HDROPへ事前配置済み"
    Log "Phase C: non-interactive Codex opens its own fresh Chrome tab for $publishSlug"
    $publisherToken = $env:GH_TOKEN
    $publisherExpiry = $env:GH_TOKEN_EXPIRES_AT
    Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:GH_TOKEN_EXPIRES_AT -ErrorAction SilentlyContinue
    try {
      $xCodexExit = Invoke-CodexIsolated $XPrompt $xCodexArgs $XCodexLog "codex-phase-c"
    } finally {
      if ($publisherToken) { $env:GH_TOKEN = $publisherToken }
      if ($publisherExpiry) { $env:GH_TOKEN_EXPIRES_AT = $publisherExpiry }
    }
    if ($xCodexExit -ne 0) {
      $exitCode = Record-ContractOutcome "fail" "codex_phase_c_failed" "Codex Phase C exit=$xCodexExit"
      exit $exitCode
    }
  }

  # Codexや補助ファイルの終了状態はsuccessの根拠にしない。記事URL、PR、
  # strict verify、X二段階台帳をここで実物照合し、4点が揃った場合だけ0を返す。
  if (Test-Path $ContractFile) {
    $audit = & node $ContractScript audit --run-id $RunId 2>&1
    $contractExit = $LASTEXITCODE
    Log (($audit | Out-String).Trim())
    exit $contractExit
  }
  if ($XPendingBundleReady) {
    $contract = & node $ContractScript evaluate --run-id $RunId --started-at $RunStartedAt --slug $publishSlug --x-pending --x-warnings ($XPreflightWarnings -join ',') 2>&1
  } else {
    $contract = & node $ContractScript evaluate --run-id $RunId --started-at $RunStartedAt --slug $publishSlug 2>&1
  }
  $contractExit = $LASTEXITCODE
  Log (($contract | Out-String).Trim())
  exit $contractExit
} finally {
  if (Test-Path $LockFile) { Copy-Item -LiteralPath $LockFile -Destination $HeartbeatFile -Force -ErrorAction SilentlyContinue }
  if (-not $script:SkipContractFinalizer) {
    if (-not (Test-Path $ContractFile)) {
      Record-ContractOutcome "fail" "wrapper_terminated_without_contract" | Out-Null
    }
    $outcome = $null
    try { $outcome = Get-Content $ContractFile -Raw -Encoding utf8 | ConvertFrom-Json } catch {}
    @{
      runId=$RunId
      finishedAt=(Get-Date).ToString("o")
      status=if($outcome){$outcome.outcome}else{"failed"}
      reason=if($outcome){$outcome.reason}else{"outcome_record_unreadable"}
      slug=if($outcome){$outcome.slug}else{$null}
    } | ConvertTo-Json | Set-Content $CompletionFile -Encoding utf8
  }
  if ($script:ChromeRunPid) {
    $ownedChrome = Get-Process -Id $script:ChromeRunPid -ErrorAction SilentlyContinue
    if ($ownedChrome -and $ownedChrome.Path -eq $script:ChromeRunExe) {
      Log "cleanup: runが起動したChrome親プロセスを終了します。"
      Stop-Process -Id $script:ChromeRunPid -ErrorAction SilentlyContinue
    }
  }
  Remove-Item $LockFile -Force -Confirm:$false -ErrorAction SilentlyContinue
}

