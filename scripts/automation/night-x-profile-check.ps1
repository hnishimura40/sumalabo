[CmdletBinding()]
param(
  [string]$RunId = (Get-Date).ToString('yyyyMMddTHHmmss.fff'),
  [string]$NightDir = '',
  [int]$LaunchWaitSeconds = 10
)

$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot
if (-not $NightDir) { $NightDir = Join-Path $RepoRoot 'logs\night' }
New-Item -ItemType Directory -Path $NightDir -Force | Out-Null

function Write-ProfileResult([bool]$Ok, [string]$Reason, [int]$ExitCode, [object]$Evidence = $null) {
  @{
    ok = $Ok
    reason = $Reason
    runId = $RunId
    checkedAt = (Get-Date).ToString('o')
    evidence = $Evidence
  } | ConvertTo-Json -Depth 12 -Compress | Write-Output
  exit $ExitCode
}

$EnvironmentFile = Join-Path $RepoRoot 'config\night-environment.json'
$Environment = Get-Content -LiteralPath $EnvironmentFile -Raw -Encoding utf8 | ConvertFrom-Json
$ChromeProfileDirectory = [string]$Environment.chrome.profileDirectory
$ChromeUserDataDirectory = [string]$Environment.chrome.userDataDirectory
$ChromeProfileRoot = Join-Path $ChromeUserDataDirectory $ChromeProfileDirectory
$ExpectedHandle = '@' + [string]$Environment.account.expectedHandle
$ChromeExe = @($Environment.chrome.executableCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
if (-not $ChromeExe) { Write-ProfileResult $false 'x_chrome_executable_missing' 20 }
if (-not (Test-Path -LiteralPath $ChromeProfileRoot)) { Write-ProfileResult $false 'x_chrome_profile_directory_missing' 20 }

$ChromeExe = [string]$ChromeExe[0]
$env:CODEX_CHROMIUM_NATIVE_HOST_MANIFEST_PATH = [string]$Environment.chrome.nativeHostManifestPath
$env:CODEX_CHROMIUM_PREFERENCES_PATH = Join-Path $ChromeProfileRoot 'Preferences'
$launchArgs = @(
  "--user-data-dir=`"$ChromeUserDataDirectory`"",
  "--profile-directory=`"$ChromeProfileDirectory`"",
  '--new-window', 'https://x.com/home',
  '--no-first-run', '--no-default-browser-check', '--start-maximized'
)

try {
  Start-Process -FilePath $ChromeExe -ArgumentList $launchArgs | Out-Null
  Start-Sleep -Seconds $LaunchWaitSeconds
} catch {
  Write-ProfileResult $false "x_chrome_launch_failed:$($_.Exception.Message)" 20
}

$escapedProfile = [regex]::Escape($ChromeProfileDirectory)
$escapedUserData = [regex]::Escape($ChromeUserDataDirectory)
$matchingProcesses = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -match "--user-data-dir=(?:`"$escapedUserData`"|$escapedUserData)(?:\s|$)" -and
    $_.CommandLine -match "--profile-directory=(?:`"$escapedProfile`"|$escapedProfile)(?:\s|$)"
  })
$visibleMatching = @($matchingProcesses | ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } | Where-Object { $_.MainWindowHandle -ne 0 })
$ProfileMatched = $matchingProcesses.Count -gt 0 -and $visibleMatching.Count -gt 0
if (-not $ProfileMatched) { Write-ProfileResult $false 'x_chrome_exact_profile_process_missing' 20 }

$PromptFile = Join-Path $NightDir "$RunId.x-profile.prompt.md"
$ArgsFile = Join-Path $NightDir "$RunId.x-profile.args.json"
$EvidenceFile = Join-Path $NightDir "$RunId.x-profile.evidence.json"
$OutputFile = Join-Path $NightDir "$RunId.x-profile.full.log"
$RunnerOut = Join-Path $NightDir "$RunId.x-profile.runner.log"
$RunnerErr = Join-Path $NightDir "$RunId.x-profile.runner.err.log"
$ProfileState = Join-Path $NightDir "$RunId.x-profile.state.json"
$Prompt = Get-Content -LiteralPath (Join-Path $RepoRoot 'docs\night_environment_dom_probe.md') -Raw -Encoding utf8
$CodexArgs = @('exec', '--ephemeral', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--color', 'never', '--output-last-message', $EvidenceFile, '-C', $RepoRoot, '-')
Set-Content -LiteralPath $PromptFile -Value $Prompt -Encoding utf8
$CodexArgs | ConvertTo-Json | Set-Content -LiteralPath $ArgsFile -Encoding utf8

$Launcher = Join-Path $RepoRoot 'scripts\automation\night-process-runner.mjs'
$NodeExe = (Get-Command node -ErrorAction Stop).Source
$LauncherArgs = @($Launcher, '--prompt-file', $PromptFile, '--args-file', $ArgsFile, '--output-file', $OutputFile, '--state-file', $ProfileState, '--agent-exe', ([string]$Environment.codex.executable), '--heartbeat-ms', '15000')
$publisherToken = $env:GH_TOKEN
$publisherExpiry = $env:GH_TOKEN_EXPIRES_AT
Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:GH_TOKEN_EXPIRES_AT -ErrorAction SilentlyContinue
try {
  $process = Start-Process -FilePath $NodeExe -ArgumentList $LauncherArgs -RedirectStandardOutput $RunnerOut -RedirectStandardError $RunnerErr -WindowStyle Hidden -Wait -PassThru
} finally {
  if ($publisherToken) { $env:GH_TOKEN = $publisherToken }
  if ($publisherExpiry) { $env:GH_TOKEN_EXPIRES_AT = $publisherExpiry }
}
if (-not $process -or $process.ExitCode -ne 0) {
  $code = if ($process) { $process.ExitCode } else { -1 }
  Write-ProfileResult $false "x_profile_dom_probe_failed:exit=$code" 20
}

$evaluation = & node scripts/automation/night-environment-check.mjs --x-profile-only --profile-matched --dom-evidence $EvidenceFile 2>&1
$evaluationExit = $LASTEXITCODE
$evaluationJson = $null
try { $evaluationJson = ($evaluation | Out-String | ConvertFrom-Json) } catch {}
if ($evaluationExit -ne 0 -or -not $evaluationJson -or -not $evaluationJson.ok) {
  $failed = if ($evaluationJson -and $evaluationJson.failedChecks) { @($evaluationJson.failedChecks) -join ',' } else { 'dom_evidence_invalid' }
  Write-ProfileResult $false "x_profile_mismatch:$failed;expected=$ExpectedHandle" 20 $evaluationJson
}

Write-ProfileResult $true 'x_profile_confirmed' 0 $evaluationJson
