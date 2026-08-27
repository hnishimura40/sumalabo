# ⚠️ DEPRECATED (2026-05-23 〜): user-directed mode 移行により、このスクリプトの新規実行は禁止です。
#   - 既存タスクは disable-sumahon-tasks.ps1 で Disabled 化済み。
#   - 復活させたい場合は CLAUDE.md と docs/user_directed_mode.md を更新したうえで判断してください。
param(
  [switch]$Production
)

$ErrorActionPreference = "Stop"

$TaskName = "Sumalabo Sumahon Queue Runner"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RunnerPath = Join-Path $ProjectRoot "scripts\automation\run-sumahon-queue.ps1"
$PowerShellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$UserId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path $RunnerPath)) {
  throw "Runner script not found: $RunnerPath"
}

$action = New-ScheduledTaskAction `
  -Execute $PowerShellPath `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$RunnerPath`"" `
  -WorkingDirectory $ProjectRoot

if ($Production) {
  $times = @("02:00", "03:00", "04:00", "05:00", "14:00", "15:00")
  $triggers = foreach ($time in $times) {
    New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($time, "HH:mm", $null))
  }
} else {
  $today = (Get-Date).Date
  $times = @("21:30", "22:30", "23:30")
  $triggers = foreach ($time in $times) {
    New-ScheduledTaskTrigger -Once -At ($today + [TimeSpan]::Parse($time))
  }
}

$principal = New-ScheduledTaskPrincipal `
  -UserId $UserId `
  -LogonType Interactive `
  -RunLevel LeastPrivilege

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $triggers `
  -Principal $principal `
  -Settings $settings `
  -Description "Runs Sumalabo Sumahon queue automation. Chrome/UWSC flows require the user to be logged on." `
  -Force

Write-Output "Registered task: $TaskName"
Write-Output "Mode: $(if ($Production) { 'Production daily schedule' } else { 'Tonight test schedule' })"
Write-Output "Times: $($times -join ', ')"

<# 
Production schedule example:
  .\scripts\automation\register-sumahon-tasks.ps1 -Production

Manual dry-run:
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\documents\動画作成関連\すまラボ\scripts\automation\run-sumahon-queue.ps1" -DryRun
#>
