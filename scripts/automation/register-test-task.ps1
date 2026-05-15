param(
  [string]$StartAt
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$taskName = 'Sumalabo Claude Pipeline Runner Test'
$workDir = 'D:\documents\動画作成関連\すまラボ'
$scriptPath = 'D:\documents\動画作成関連\すまラボ\scripts\automation\run-claude-preview-pipeline-once.ps1'

if (-not $StartAt) { $StartAt = (Get-Date).AddMinutes(6).ToString('yyyy-MM-ddTHH:mm:00') }

# Delete existing test task (if any) so we start clean.
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host ("Removing existing task: {0}" -f $taskName)
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $scriptPath) `
  -WorkingDirectory $workDir

$trigger = New-ScheduledTaskTrigger -Once -At $StartAt

$principal = New-ScheduledTaskPrincipal `
  -UserId 'hnish' `
  -LogonType Interactive `
  -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -WakeToRun `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit ([TimeSpan]::FromHours(3))

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings | Out-Null

$t = Get-ScheduledTask -TaskName $taskName
$info = $t | Get-ScheduledTaskInfo
$set = $t.Settings

Write-Host '=== Task verification ==='
Write-Host ('TaskName           : {0}' -f $t.TaskName)
Write-Host ('State              : {0}' -f $t.State)
Write-Host ('UserId             : {0}' -f $t.Principal.UserId)
Write-Host ('LogonType          : {0}' -f $t.Principal.LogonType)
Write-Host ('RunLevel           : {0}' -f $t.Principal.RunLevel)
foreach ($a in $t.Actions) {
  Write-Host ('Execute            : {0}' -f $a.Execute)
  Write-Host ('Arguments          : {0}' -f $a.Arguments)
  Write-Host ('WorkingDir         : {0}' -f $a.WorkingDirectory)
}
foreach ($tr in $t.Triggers) {
  Write-Host ('StartBound         : {0}' -f $tr.StartBoundary)
  Write-Host ('Enabled            : {0}' -f $tr.Enabled)
}
Write-Host ('StartWhenAvailable : {0}' -f $set.StartWhenAvailable)
Write-Host ('WakeToRun          : {0}' -f $set.WakeToRun)
Write-Host ('MultipleInstances  : {0}' -f $set.MultipleInstances)
Write-Host ('ExecutionTimeLimit : {0}' -f $set.ExecutionTimeLimit)
Write-Host ('NextRunTime        : {0}' -f $info.NextRunTime)
