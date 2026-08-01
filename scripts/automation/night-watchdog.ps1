param([switch]$DryRun, [string]$NightDirOverride, [datetime]$Now = (Get-Date))
$ErrorActionPreference = 'Continue'
$RepoRoot = "D:\documents\動画作成関連\すまラボ"
Set-Location $RepoRoot
$NightDir = if ($NightDirOverride) { $NightDirOverride } else { Join-Path $RepoRoot "logs\night" }
New-Item -ItemType Directory -Force $NightDir | Out-Null
$DateStr = $Now.ToString("yyyy-MM-dd")
$CompletionFile = Join-Path $NightDir "$DateStr.completion.json"
$HeartbeatFile = Join-Path $NightDir "$DateStr.heartbeat.json"
$LockFile = Join-Path $NightDir "run.lock"
$WatchFile = Join-Path $NightDir "$DateStr.watchdog.json"
if (Test-Path $WatchFile) { exit 0 }
if (Test-Path $CompletionFile) {
  @{ checkedAt=(Get-Date).ToString('o'); result='complete'; notified=$false } | ConvertTo-Json | Set-Content $WatchFile -Encoding utf8
  exit 0
}
$state = $null
foreach ($candidate in @($LockFile, $HeartbeatFile)) {
  if (Test-Path $candidate) { try { $state=Get-Content $candidate -Raw -Encoding utf8 | ConvertFrom-Json; break } catch {} }
}
$now = $Now
$heartbeatAgeMinutes = $null
if ($state -and $state.heartbeatAt) { try { $heartbeatAgeMinutes=[Math]::Round(($now-[datetime]$state.heartbeatAt).TotalMinutes,1) } catch {} }
$healthy = $state -and @('running','retry_wait') -contains $state.status -and $heartbeatAgeMinutes -ne $null -and $heartbeatAgeMinutes -le 3
if ($healthy) {
  $kind='running_healthy'; $title="[夜間見張り] 5:30時点で未完了（実行中・heartbeat正常 / child=$($state.childPid)）"
} elseif ($state) {
  $kind='stalled_or_failed'; $title="[夜間見張り] 5:30時点で完了痕跡なし（停止/heartbeat異常、要確認）"
} else {
  $kind='not_started'; $title="[夜間見張り] 5:30時点で起動・完了痕跡なし（要確認）"
}
$notified = $false
if (-not $DryRun) {
  $notify=node -e "import('./scripts/automation/autonomy-notify.mjs').then(async m=>{const r=await m.notifyAutonomyEvent({slug:'night-watchdog-$DateStr',status:'warning',title:process.argv[1]});console.log(JSON.stringify(r))})" $title 2>&1
  $notified=(($notify | Out-String) -match '"ok"\s*:\s*true')
}
@{ checkedAt=$now.ToString('o'); result=$kind; notified=$notified; dryRun=[bool]$DryRun; heartbeatAgeMinutes=$heartbeatAgeMinutes; childPid=if($state){$state.childPid}else{$null} } | ConvertTo-Json | Set-Content $WatchFile -Encoding utf8
if ($kind -eq 'running_healthy') { exit 0 }
exit 2
