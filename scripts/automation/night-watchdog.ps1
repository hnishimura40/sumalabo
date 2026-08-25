param([switch]$DryRun, [string]$NightDirOverride, [datetime]$Now = (Get-Date))

$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

$NightDir = if ($NightDirOverride) { $NightDirOverride } else { Join-Path $RepoRoot 'logs\night' }
New-Item -ItemType Directory -Force $NightDir | Out-Null

$DateStr = $Now.ToString('yyyy-MM-dd')
$HeartbeatFile = Join-Path $NightDir "$DateStr.heartbeat.json"
$LockFile = Join-Path $NightDir 'run.lock'
$LatestEntryFile = Join-Path $NightDir 'latest-entry.json'
$WatchFile = Join-Path $NightDir "$DateStr.watchdog.json"
$CompletionFile = Join-Path $NightDir "$DateStr.completion.json"
$ContractScript = Join-Path $RepoRoot 'scripts\automation\night-run-contract.mjs'

# Daily external X ledger backup. A backup failure is warning-only and never
# changes the independently audited main outcome.
$backup = & node scripts/automation/backup-x-posted-ledger.mjs --date $DateStr 2>&1
$backupExit = $LASTEXITCODE
$backupText = ($backup | Out-String).Trim()
$backupJson = $null
try { $backupJson = $backupText | ConvertFrom-Json } catch {}
if ($backupExit -ne 0 -and -not $DryRun) {
  node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-watchdog-ledger-backup',status:'warning',title:'[night-watchdog] X台帳の日次バックアップ失敗（本体判定は継続）'}))" 2>&1 | Out-Null
}

# Predict the next scheduled run using the same standalone Phase 0 check. This
# is advisory only and never changes today's independently audited outcome.
$nextPreflight = & node scripts/automation/night-environment-check.mjs --article-only 2>&1
$nextPreflightExit = $LASTEXITCODE
$nextPreflightText = ($nextPreflight | Out-String).Trim()
$nextPreflightJson = $null
try { $nextPreflightJson = $nextPreflightText | ConvertFrom-Json } catch {}
if ($nextPreflightExit -ne 0 -and -not $DryRun) {
  node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-watchdog-next-preflight',status:'warning',title:'[night-watchdog] 次回preflight失敗（明朝run失敗見込み、今回結果には非影響）'}))" 2>&1 | Out-Null
}

# Read the current-run state before auditing old outcomes.  A prior scheduled
# acceptance stop is not a result for a later production attempt.
$stateCandidates = @()
foreach ($candidate in @($LockFile, $HeartbeatFile, $LatestEntryFile)) {
  if (Test-Path $candidate) {
    try {
      $candidateState = Get-Content $candidate -Raw -Encoding utf8 | ConvertFrom-Json
      if ($candidateState.runId -and $candidateState.startedAt) { $stateCandidates += $candidateState }
    } catch {}
  }
}
$state = @($stateCandidates | Sort-Object -Property @{ Expression = { try { [datetime]$_.startedAt } catch { [datetime]::MinValue } }; Descending = $true }, @{ Expression = { try { [datetime]$_.heartbeatAt } catch { [datetime]::MinValue } }; Descending = $true } | Select-Object -First 1)[0]
$activeAttemptAt = $null
$activeRunId = $null
if ($state) {
  if ($state.runId) { $activeRunId = [string]$state.runId }
  foreach ($field in @('childStartedAt', 'startedAt')) {
    if ($state.$field) {
      try {
        [void][datetime]$state.$field
        $activeAttemptAt = [string]$state.$field
        break
      } catch {}
    }
  }
}

# Completion and heartbeat files are not proof of success. The contract audit
# checks the primary three points and the secondary X ledger independently.
$auditArgs = @($ContractScript, 'audit')
if ($activeRunId) {
  $auditArgs += @('--run-id', $activeRunId)
} else {
  # A missing run ID must never fall back to a same-day acceptance/self-test record.
  $auditArgs += @('--run-id', "missing-$DateStr")
}
if ($activeAttemptAt) { $auditArgs += @('--active-at', $activeAttemptAt) }
$audit = & node @auditArgs 2>&1
$auditExit = $LASTEXITCODE
$auditText = ($audit | Out-String).Trim()
$auditJson = $null
try { $auditJson = $auditText | ConvertFrom-Json } catch {}
$completionJson = $null
if (Test-Path $CompletionFile) {
  try { $completionJson = Get-Content $CompletionFile -Raw -Encoding utf8 | ConvertFrom-Json } catch {}
}
$notifyEvidence = if ($completionJson -and $completionJson.runId -eq $activeRunId) { $completionJson.notify } else { $null }
$notifyStatus = if ($notifyEvidence -and $notifyEvidence.status) { [string]$notifyEvidence.status } else { 'not_run' }
$notifyLine = "notify: $notifyStatus"

if ($auditExit -eq 0 -and $auditJson.outcome -eq 'success') {
  $xStatus = if ($auditJson.secondaryContract) { [string]$auditJson.secondaryContract.status } else { 'not_run' }
  $warningNotified = $false
  $warningReasons = [System.Collections.Generic.List[string]]::new()
  if ($xStatus -ne 'success') {
    $reason = if ($auditJson.secondaryContract) { [string]$auditJson.secondaryContract.reason } else { 'secondary_contract_missing' }
    $warningReasons.Add("X=$xStatus($reason)")
  }
  if ($notifyStatus -ne 'success') {
    $notifyReason = if ($notifyEvidence -and $notifyEvidence.reason) { [string]$notifyEvidence.reason } else { 'notify_result_missing' }
    $warningReasons.Add("notify=$notifyStatus($notifyReason)")
  }
  if ($warningReasons.Count -gt 0 -and -not $DryRun) {
    $titlePrefix = if ($xStatus -ne 'success') { '[night-watchdog] 本体成功／X失敗' } else { '[night-watchdog] 本体成功／notify失敗' }
    $watchNotify = node -e "import('./scripts/automation/autonomy-notify.mjs').then(async m=>{const r=await m.notifyAutonomyEvent({slug:process.argv[1],status:'warning',title:process.argv[2]});console.log(JSON.stringify(r))})" "night-watchdog-$DateStr" "$titlePrefix / notify=$notifyStatus / X=$xStatus : $($warningReasons -join '; ')" 2>&1
    $warningNotified = (($watchNotify | Out-String) -match '"ok"\s*:\s*true')
  }
  @{
    checkedAt = $Now.ToString('o')
    result = 'success'
    mainStatus = 'success'
    xStatus = $xStatus
    notifyStatus = $notifyStatus
    notifyLine = $notifyLine
    notify = $notifyEvidence
    notified = $warningNotified
    runId = $auditJson.runId
    slug = $auditJson.slug
    independentlyVerified = $true
    mismatch = $false
    primaryContract = $auditJson.primaryContract
    secondaryContract = $auditJson.secondaryContract
    ledgerBackup = $backupJson
    ledgerBackupOk = ($backupExit -eq 0)
    nextPreflight = @{ ok=($nextPreflightExit -eq 0); exitCode=$nextPreflightExit; evidence=$nextPreflightJson }
  } | ConvertTo-Json -Depth 8 | Set-Content $WatchFile -Encoding utf8
  exit 0
}

if ($auditExit -eq 20 -and $auditJson.outcome -eq 'stopped_x_pending') {
  $legacyNotified = $false
  if (-not $DryRun) {
    $notify = node -e "import('./scripts/automation/autonomy-notify.mjs').then(async m=>{const r=await m.notifyAutonomyEvent({slug:process.argv[1],status:'warning',title:'[night-watchdog] 本体成功／X失敗（旧形式のX保留）'});console.log(JSON.stringify(r))})" "night-watchdog-$DateStr" 2>&1
    $legacyNotified = (($notify | Out-String) -match '"ok"\s*:\s*true')
  }
  @{
    checkedAt = $Now.ToString('o')
    result = 'success'
    mainStatus = 'success'
    xStatus = 'skipped'
    notifyStatus = $notifyStatus
    notifyLine = $notifyLine
    notify = $notifyEvidence
    reason = $auditJson.reason
    notified = $legacyNotified
    runId = $auditJson.runId
    slug = $auditJson.slug
    independentlyVerified = $true
    mismatch = [bool]$auditJson.mismatch
    articleThreePointVerified = $true
    xPendingBundleVerified = [bool]$auditJson.evidence.xPendingBundle.ok
    ledgerBackup = $backupJson
    ledgerBackupOk = ($backupExit -eq 0)
    nextPreflight = @{ ok=($nextPreflightExit -eq 0); exitCode=$nextPreflightExit; evidence=$nextPreflightJson }
  } | ConvertTo-Json -Depth 12 | Set-Content $WatchFile -Encoding utf8
  exit 0
}

if ($auditExit -eq 20 -and $auditJson.outcome -eq 'stopped') {
  @{
    checkedAt = $Now.ToString('o')
    result = 'stopped'
    reason = $auditJson.reason
    notified = $false
    runId = $auditJson.runId
    independentlyVerified = $true
    mismatch = [bool]$auditJson.mismatch
    mainStatus = 'stopped'
    xStatus = 'not_run'
    notifyStatus = $notifyStatus
    notifyLine = $notifyLine
    ledgerBackup = $backupJson
    ledgerBackupOk = ($backupExit -eq 0)
    nextPreflight = @{ ok=($nextPreflightExit -eq 0); exitCode=$nextPreflightExit; evidence=$nextPreflightJson }
  } | ConvertTo-Json -Depth 8 | Set-Content $WatchFile -Encoding utf8
  exit 20
}

$heartbeatAgeMinutes = $null
if ($state -and $state.heartbeatAt) {
  try { $heartbeatAgeMinutes = [Math]::Round(($Now - [datetime]$state.heartbeatAt).TotalMinutes, 1) } catch {}
}
$healthyAtDeadline = $state -and @('running', 'retry_wait') -contains $state.status -and $null -ne $heartbeatAgeMinutes -and $heartbeatAgeMinutes -le 3
$kind = 'failed'
$mismatch = [bool]($auditJson -and $auditJson.mismatch)
if ($healthyAtDeadline) {
  $title = "[night-watchdog] Success contract missed the deadline; child was still running (PID $($state.childPid))"
} elseif ($mismatch) {
  $title = '[night-watchdog] Recorded result conflicts with independently verified facts (failed)'
} else {
  $title = '[night-watchdog] Main three-point success contract was not satisfied (failed)'
}

$notified = $false
if (-not $DryRun) {
  $notify = node -e "import('./scripts/automation/autonomy-notify.mjs').then(async m=>{const r=await m.notifyAutonomyEvent({slug:'night-watchdog-$DateStr',status:'warning',title:process.argv[1]});console.log(JSON.stringify(r))})" $title 2>&1
  $notified = (($notify | Out-String) -match '"ok"\s*:\s*true')
}

@{
  checkedAt = $Now.ToString('o')
  result = $kind
  notified = $notified
  dryRun = [bool]$DryRun
  heartbeatAgeMinutes = $heartbeatAgeMinutes
  childPid = if ($state) { $state.childPid } else { $null }
  independentlyVerified = $true
  contractAudit = $auditJson
  mismatch = [bool]($auditJson -and $auditJson.mismatch)
  healthyAtDeadline = [bool]$healthyAtDeadline
  mainStatus = 'failed'
  xStatus = if($auditJson -and $auditJson.secondaryContract){$auditJson.secondaryContract.status}else{'not_run'}
  notifyStatus = $notifyStatus
  notifyLine = $notifyLine
  notify = $notifyEvidence
  ledgerBackup = $backupJson
  ledgerBackupOk = ($backupExit -eq 0)
  nextPreflight = @{ ok=($nextPreflightExit -eq 0); exitCode=$nextPreflightExit; evidence=$nextPreflightJson }
} | ConvertTo-Json -Depth 12 | Set-Content $WatchFile -Encoding utf8

exit 30
