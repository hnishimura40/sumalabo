param([Parameter(Mandatory = $true)][string]$Slug)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot
$Environment = Get-Content -LiteralPath (Join-Path $RepoRoot 'config\night-environment.json') -Raw -Encoding utf8 | ConvertFrom-Json
$manifestFile = Get-ChildItem -LiteralPath (Join-Path $RepoRoot 'logs\social') -Filter "$Slug.*.x-pending.json" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $manifestFile) { throw "x_pending_manifest_missing:$Slug" }
$manifest = Get-Content -LiteralPath $manifestFile.FullName -Raw -Encoding utf8 | ConvertFrom-Json

node scripts/automation/x-pending-bundle.mjs verify --root $RepoRoot --slug $Slug --run-id $manifest.runId
if ($LASTEXITCODE -ne 0) { exit 30 }

node scripts/run/post-to-x.mjs --check --slug $Slug *> $null
if ($LASTEXITCODE -eq 3) {
  $recoveryRunId = 'recovery' + (Get-Date).ToString('yyyyMMddTHHmmss.fff')
  node scripts/automation/night-run-contract.mjs evaluate --run-id $recoveryRunId --started-at $manifest.startedAt --slug $Slug --completion-kind recovery
  exit $LASTEXITCODE
}
if ($LASTEXITCODE -ne 0) { exit 30 }

$ChromeExe = @($Environment.chrome.executableCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
if (-not $ChromeExe) { throw 'chrome_executable_missing' }
$visibleChrome = @(Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
if ($visibleChrome -eq 0) {
  Start-Process -FilePath ([string]$ChromeExe[0]) -ArgumentList @(
    "--profile-directory=$($Environment.chrome.profileDirectory)", '--new-window', 'https://x.com/compose/post',
    '--no-first-run', '--no-default-browser-check', '--start-maximized'
  ) | Out-Null
  Start-Sleep -Seconds 15
}
if (@(Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count -eq 0) { throw 'chrome_visible_window_missing' }

$imagePaths = @($manifest.images | Sort-Object index | ForEach-Object { Join-Path $RepoRoot ([string]$_.path) })
if ($imagePaths.Count -ne 4) { throw "x_attachment_plan_invalid:$($imagePaths.Count)" }
& (Join-Path $RepoRoot 'scripts\automation\x-post-chrome.ps1') -PostText 'x' -ImagePaths ($imagePaths -join ',') -ClipboardOnly
if ($LASTEXITCODE -ne 0) { exit 30 }

$recoveryRunId = 'recovery' + (Get-Date).ToString('yyyyMMddTHHmmss.fff')
$logDir = Join-Path $RepoRoot 'logs\social'
$promptFile = Join-Path $logDir "$Slug.$recoveryRunId.recovery.prompt.md"
$argsFile = Join-Path $logDir "$Slug.$recoveryRunId.recovery.args.json"
$outputFile = Join-Path $logDir "$Slug.$recoveryRunId.recovery.full.log"
$lastMessageFile = Join-Path $logDir "$Slug.$recoveryRunId.recovery.evidence.txt"
$stateFile = Join-Path $logDir "$Slug.$recoveryRunId.recovery.state.json"
$runnerOut = Join-Path $logDir "$Slug.$recoveryRunId.recovery.runner.log"
$runnerErr = Join-Path $logDir "$Slug.$recoveryRunId.recovery.runner.err.log"
$prompt = (Get-Content -LiteralPath (Join-Path $RepoRoot 'docs\x-post-codex-night-prompt.md') -Raw -Encoding utf8).Replace('{{SLUG}}', $Slug)
$args = @('exec','--ephemeral','--sandbox','workspace-write','--add-dir','D:\downloads\sumalabo-codex','--skip-git-repo-check','--color','never','--output-last-message',$lastMessageFile,'-C',$RepoRoot,'-')
Set-Content -LiteralPath $promptFile -Value $prompt -Encoding utf8
$args | ConvertTo-Json | Set-Content -LiteralPath $argsFile -Encoding utf8
$launcherArgs = @(
  (Join-Path $RepoRoot 'scripts\automation\night-process-runner.mjs'), '--prompt-file', $promptFile,
  '--args-file', $argsFile, '--output-file', $outputFile, '--state-file', $stateFile,
  '--agent-exe', ([string]$Environment.codex.executable), '--heartbeat-ms', '15000'
)
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$publisherToken = $env:GH_TOKEN
$publisherExpiry = $env:GH_TOKEN_EXPIRES_AT
Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:GH_TOKEN_EXPIRES_AT -ErrorAction SilentlyContinue
try {
  $proc = Start-Process -FilePath $nodeExe -ArgumentList $launcherArgs -RedirectStandardOutput $runnerOut -RedirectStandardError $runnerErr -WindowStyle Hidden -Wait -PassThru
} finally {
  if ($publisherToken) { $env:GH_TOKEN = $publisherToken }
  if ($publisherExpiry) { $env:GH_TOKEN_EXPIRES_AT = $publisherExpiry }
}
if ($proc.ExitCode -ne 0) { exit 30 }

node scripts/automation/night-run-contract.mjs evaluate --run-id $recoveryRunId --started-at $manifest.startedAt --slug $Slug --completion-kind recovery
exit $LASTEXITCODE
