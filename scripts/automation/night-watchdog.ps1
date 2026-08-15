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
$ContractScript = Join-Path $RepoRoot 'scripts\automation\night-run-contract.mjs'

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
# independently checks the production URL, merged PR, strict QA, and X ledger.
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

if ($auditExit -eq 0 -and $auditJson.outcome -eq 'success') {
  @{
    checkedAt = $Now.ToString('o')
    result = 'success'
    notified = $false
    runId = $auditJson.runId
    slug = $auditJson.slug
    independentlyVerified = $true
    mismatch = $false
  } | ConvertTo-Json -Depth 8 | Set-Content $WatchFile -Encoding utf8
  exit 0
}

if ($auditExit -eq 20 -and $auditJson.outcome -eq 'stopped_x_pending') {
  @{
    checkedAt = $Now.ToString('o')
    result = 'stopped_x_pending'
    reason = $auditJson.reason
    notified = $false
    runId = $auditJson.runId
    slug = $auditJson.slug
    independentlyVerified = $true
    mismatch = [bool]$auditJson.mismatch
    articleThreePointVerified = $true
    xPendingBundleVerified = [bool]$auditJson.evidence.xPendingBundle.ok
  } | ConvertTo-Json -Depth 12 | Set-Content $WatchFile -Encoding utf8
  exit 20
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
  $title = '[night-watchdog] Four-point success contract was not satisfied (failed)'
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
} | ConvertTo-Json -Depth 12 | Set-Content $WatchFile -Encoding utf8

exit 30
