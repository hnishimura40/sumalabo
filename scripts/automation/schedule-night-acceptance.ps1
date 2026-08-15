param(
  [Parameter(Mandatory = $true)][datetime]$DriverAt,
  [switch]$EditorApproved
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Environment = Get-Content -LiteralPath (Join-Path $RepoRoot 'config\night-environment.json') -Raw -Encoding utf8 | ConvertFrom-Json

if (-not $EditorApproved) { throw 'editor_instruction_required' }
if ($Environment.runApproval.simulationRequiresEditorInstruction -ne $true -or
    $Environment.runApproval.acceptanceRequiresEditorInstruction -ne $true -or
    $Environment.runApproval.autoRescheduleAfterFailure -ne $false) {
  throw 'run_approval_policy_invalid'
}
if ($DriverAt -le (Get-Date)) { throw 'driver_time_must_be_future' }

$WatchdogAt = $DriverAt.AddMinutes(60)
Set-ScheduledTask -TaskName 'Sumalabo Night Driver' -Trigger (New-ScheduledTaskTrigger -Once -At $DriverAt) | Out-Null
Set-ScheduledTask -TaskName 'Sumalabo Night Watchdog' -Trigger (New-ScheduledTaskTrigger -Once -At $WatchdogAt) | Out-Null
Enable-ScheduledTask -TaskName 'Sumalabo Codex Auth Probe' | Out-Null
Enable-ScheduledTask -TaskName 'Sumalabo Night Driver' | Out-Null
Enable-ScheduledTask -TaskName 'Sumalabo Night Watchdog' | Out-Null

[pscustomobject]@{
  editorApproved = $true
  driverAt = $DriverAt.ToString('o')
  watchdogAt = $WatchdogAt.ToString('o')
  autoRescheduleAfterFailure = $false
} | ConvertTo-Json
