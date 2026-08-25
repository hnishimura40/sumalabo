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
$FailureRecoveryScript = Join-Path $RepoRoot "scripts\automation\night-failure-recovery.mjs"
$ContractFile = Join-Path $NightDir "run-contract\$RunId.json"
$env:SUMALABO_NIGHT_RUN_ID = $RunId
$env:SUMALABO_NIGHT_RUN_STARTED_AT = $RunStartedAt
$script:SkipContractFinalizer = [bool]$RunnerSelfTest
$script:NextPreflight = $null
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

function Invoke-NextRunPreflight {
  $output = & node scripts/automation/night-environment-check.mjs --article-only 2>&1
  $code = $LASTEXITCODE
  $text = ($output | Out-String).Trim()
  $json = $null
  try { $json = $text | ConvertFrom-Json } catch {}
  $record = @{
    checkedAt = (Get-Date).ToString('o')
    exitCode = $code
    ok = ($code -eq 0)
    evidence = $json
  }
  $record | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $NightDir "$DateStr.$RunId.next-preflight.json") -Encoding utf8
  if ($code -eq 0) {
    Log "next-run preflight PASS: exit=0"
  } else {
    Log "next-run preflight WARNING: exit=$code。明朝のrunが失敗する見込みとして通知するが、今回runの成否は変更しない。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-next-preflight',status:'warning',title:'[夜間run] 次回preflight失敗（明朝run失敗見込み、今回結果には非影響）'}))" 2>&1 | Out-Null
  }
  return $record
}

# ---- 1. 多重起動ガード ----
if (-not $RunnerSelfTest) {
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
  if ($RunnerSelfTest) { Log "=== RunnerSelfTest（testMode未消費・記事生成なし） ===" }

  # ---- Phase 0. 記事公開に必要な環境だけを検査 ----
  # Chrome・X・DOM・投稿台帳はここでは一切検査しない。これらは主契約完了後の
  # night-x-post-step.ps1 内だけで検査し、公開フローを停止させない。

  if (-not $RunnerSelfTest) {
    Log "Phase 0: article-only environment evidence (Chrome/X checks are isolated to Phase C)"
    $staticEnvironment = node scripts/automation/night-environment-check.mjs --article-only 2>&1
    $staticEnvironmentExit = $LASTEXITCODE
    Log (($staticEnvironment | Out-String).Trim())
    $staticJson = $null
    try { $staticJson = ($staticEnvironment | Out-String | ConvertFrom-Json) } catch {}
    if ($staticEnvironmentExit -eq 30 -or -not $staticJson -or -not $staticJson.canProceed) {
      $missing = if ($staticJson -and $staticJson.fatalFailedChecks.Count) { [string]$staticJson.fatalFailedChecks[0] } else { "environment_definition" }
      $exitCode = Record-ContractOutcome "fail" "environment_preflight_failed:$missing" "Phase 0 static evidence failed"
      exit $exitCode
    }
    Log "Phase 0 PASS: 記事公開の致命項目に合格。Chrome/X検査は未実行。"
  }

  # 無承認のarchive削除は禁止。期限整理は環境変更と同様に影響範囲提示と事前承認を要する。
  if (-not $RunnerSelfTest) { Log "image cleanup: automatic prune disabled by permanent safety rule" }

  # ---- 2. 軽量プリフライト（Codex を起動する前に node だけで判定） ----
  if (-not $RunnerSelfTest) {
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

  if (-not $RunnerSelfTest) {
    # 記事候補選定は記事公開の致命項目が合格した後に開始する。
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
      @{ ok=$true; mode="scheduled_production_path_without_article"; taskName="Sumalabo Night Driver"; completedAt=(Get-Date).ToString("o"); pid=$PID; preflight="passed"; chromeTouched=$false; xChecksExecuted=$false; commandLineFlags="none"; articlePipelineStarted=$false } |
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
    } else {
      $failureText = (& node $FailureRecoveryScript inspect --started-at $RunStartedAt 2>&1 | Out-String).Trim()
      $failureInspectionExit = $LASTEXITCODE
      $failureInspection = $null
      try { $failureInspection = $failureText | ConvertFrom-Json } catch {}
      if ($failureInspectionExit -ne 0 -or -not $failureInspection) {
        throw "phase_a_failure_inspection_failed: $failureText"
      }
      if ($failureInspection.found) {
        $exitCode = Record-ContractOutcome "fail" ([string]$failureInspection.reason) ([string]$failureInspection.detail)
        exit $exitCode
      }
      $exitCode = Record-ContractOutcome "fail" "phase_a_output_missing" "Codex exited 0 but produced neither a ready nor failed handoff for this run"
      exit $exitCode
    }
  } catch {
    $exitCode = Record-ContractOutcome "fail" "outer_publish_failed" $_.Exception.Message
    exit $exitCode
  }

  # ---- 4-bis. Phase B target propagation retry and primary contract guard ----
  # The review API can lag behind handoff completion. Wait up to five minutes for
  # this exact slug. Phase C stays forbidden until PR merge and production HTTP 200.
  $phaseBVerified = $false
  $XStepPending = $false
  $XStepWarnings = [System.Collections.Generic.List[string]]::new()
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

    # The primary contract is complete before the independent X step starts.
    $primary = & node $ContractScript primary-check --run-id $RunId --started-at $RunStartedAt --slug $publishSlug 2>&1
    $primaryExit = $LASTEXITCODE
    Log (($primary | Out-String).Trim())
    if ($primaryExit -ne 0) {
      $exitCode = Record-ContractOutcome "fail" "primary_contract_not_satisfied_before_x" (($primary | Out-String).Trim())
      exit $exitCode
    }
  }

  # ---- 4-ter. Phase C is an independent fail-soft step after primary success ----
  if ($publishSlug -and $phaseBVerified) {
    $XStepScript = Join-Path $RepoRoot 'scripts\automation\night-x-post-step.ps1'
    $xStepArguments = @(
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', $XStepScript,
      '-Slug', $publishSlug,
      '-RunId', $RunId,
      '-StartedAt', $RunStartedAt,
      '-NightDir', $NightDir,
      '-StateFile', $LockFile
    )
    $xStep = & powershell.exe @xStepArguments 2>&1
    $xStepExit = $LASTEXITCODE
    Log (($xStep | Out-String).Trim())
    if ($xStepExit -ne 0) {
      $XStepPending = $true
      $XStepWarnings.Add("x_step_exit_$xStepExit")
      Log "Phase C WARNING: X独立工程がexit=$xStepExit。主契約は成功のまま継続する。"
    }
  }

  # Main outcome is determined only by HTTP 200, merged PR, and strict verify.
  # X two-stage evidence is recorded as an independent secondary contract.
  if (Test-Path $ContractFile) {
    $audit = & node $ContractScript audit --run-id $RunId 2>&1
    $contractExit = $LASTEXITCODE
    Log (($audit | Out-String).Trim())
    exit $contractExit
  }
  $contractArgs = @($ContractScript, 'evaluate', '--run-id', $RunId, '--started-at', $RunStartedAt)
  if ($publishSlug) { $contractArgs += @('--slug', [string]$publishSlug) }
  $allXWarnings = @($XStepWarnings) | Where-Object { $_ } | Select-Object -Unique
  if ($XStepPending) { $contractArgs += '--x-pending' }
  if ($allXWarnings.Count) { $contractArgs += @('--x-warnings', ($allXWarnings -join ',')) }
  $contract = & node @contractArgs 2>&1
  $contractExit = $LASTEXITCODE
  Log (($contract | Out-String).Trim())
  $contractJson = $null
  try { $contractJson = ($contract | Out-String | ConvertFrom-Json) } catch {}
  if ($contractExit -eq 0 -and $contractJson -and $contractJson.secondaryContract.status -ne 'success') {
    Log "CONTRACT: 本体成功／X失敗（$($contractJson.secondaryContract.reason)）"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:process.argv[1],status:'warning',title:'[夜間run] 本体成功／X失敗: '+process.argv[2]}))" $publishSlug $contractJson.secondaryContract.reason 2>&1 | Out-Null
  }
  exit $contractExit
} finally {
  if (Test-Path $LockFile) { Copy-Item -LiteralPath $LockFile -Destination $HeartbeatFile -Force -ErrorAction SilentlyContinue }
  if (-not $script:SkipContractFinalizer) {
    if (-not (Test-Path $ContractFile)) {
      Record-ContractOutcome "fail" "wrapper_terminated_without_contract" | Out-Null
    }
    $outcome = $null
    try { $outcome = Get-Content $ContractFile -Raw -Encoding utf8 | ConvertFrom-Json } catch {}
    if ($outcome -and $outcome.outcome -eq 'failed') {
      $recoveryArgs = @($FailureRecoveryScript, 'recover', '--run-id', $RunId, '--started-at', $RunStartedAt)
      if ($outcome.slug) { $recoveryArgs += @('--slug', [string]$outcome.slug) }
      $recoveryOutput = & node @recoveryArgs 2>&1
      $recoveryExit = $LASTEXITCODE
      Log (($recoveryOutput | Out-String).Trim())
      if ($recoveryExit -ne 0) {
        Log "failure recovery WARNING: exit=$recoveryExit。成果物は削除せず、次回preflight失敗見込みとして通知する。"
        node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-failure-recovery',status:'warning',title:'[夜間run] 失敗成果物の自動退避または次回preflight確認に失敗'}))" 2>&1 | Out-Null
      }
    }
  }
  if (-not $RunnerSelfTest) {
    $script:NextPreflight = Invoke-NextRunPreflight
  }
  if (-not $script:SkipContractFinalizer) {
    @{
      runId=$RunId
      finishedAt=(Get-Date).ToString("o")
      status=if($outcome){$outcome.outcome}else{"failed"}
      reason=if($outcome){$outcome.reason}else{"outcome_record_unreadable"}
      slug=if($outcome){$outcome.slug}else{$null}
      mainStatus=if($outcome -and $outcome.primaryContract){$outcome.primaryContract.status}else{if($outcome -and @('success','stopped_x_pending') -contains $outcome.outcome){'success'}elseif($outcome -and $outcome.outcome -eq 'stopped'){'stopped'}else{'failed'}}
      xStatus=if($outcome -and $outcome.secondaryContract){$outcome.secondaryContract.status}else{'not_run'}
      primaryContract=if($outcome){$outcome.primaryContract}else{$null}
      secondaryContract=if($outcome){$outcome.secondaryContract}else{$null}
      nextPreflight=$script:NextPreflight
    } | ConvertTo-Json -Depth 12 | Set-Content $CompletionFile -Encoding utf8
  }
  Remove-Item $LockFile -Force -Confirm:$false -ErrorAction SilentlyContinue
}

