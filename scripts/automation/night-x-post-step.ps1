param(
  [Parameter(Mandatory=$true)][string]$Slug,
  [Parameter(Mandatory=$true)][string]$RunId,
  [Parameter(Mandatory=$true)][string]$StartedAt,
  [Parameter(Mandatory=$true)][string]$NightDir,
  [Parameter(Mandatory=$true)][string]$StateFile,
  [string]$PreflightWarnings = ''
)

$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot
$XPostInputFile = Join-Path $RepoRoot "logs\social\$Slug.x-post.json"
$XLog = Join-Path $NightDir "$RunId.x-step.log"

function Write-XResult([string]$Status, [string]$Reason, [int]$ExitCode) {
  @{
    status = $Status
    reason = $Reason
    slug = $Slug
    runId = $RunId
    finishedAt = (Get-Date).ToString('o')
  } | ConvertTo-Json -Compress | Write-Output
  exit $ExitCode
}

function Preserve-XPending([string]$Reason) {
  if (Test-Path -LiteralPath $XPostInputFile) {
    $warnings = @($PreflightWarnings, $Reason) | Where-Object { $_ } | Select-Object -Unique
    & node scripts/automation/x-pending-bundle.mjs create --slug $Slug --run-id $RunId --started-at $StartedAt --warnings ($warnings -join ',') 2>&1 |
      Out-File -FilePath $XLog -Encoding utf8 -Append
  }
  Write-XResult 'warning' $Reason 20
}

# This process starts only after the primary three-point contract has passed.
# Every failure below is X-local and must remain a warning to the parent run.
& node scripts/run/generate-x-post.mjs --slug $Slug 2>&1 | Out-File -FilePath $XLog -Encoding utf8 -Append
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $XPostInputFile)) {
  Preserve-XPending 'x_input_generation_failed'
}

$ledgerCheck = & node scripts/sumahon/x-posted-ledger.mjs --check-access 2>&1
$ledgerCheckExit = $LASTEXITCODE
$ledgerCheck | Out-File -FilePath $XLog -Encoding utf8 -Append
if ($ledgerCheckExit -ne 0) {
  Preserve-XPending 'x_ledger_io_unavailable'
}

if ($PreflightWarnings) {
  Preserve-XPending "x_preflight_warning:$PreflightWarnings"
}

$XPostInput = $null
try { $XPostInput = Get-Content $XPostInputFile -Raw -Encoding utf8 | ConvertFrom-Json } catch {}
$XImages = @($XPostInput.attachmentPlan.attach)
if (-not $XPostInput -or $XImages.Count -ne 4) {
  Preserve-XPending "x_attachment_plan_invalid:expected=4;actual=$($XImages.Count)"
}

$XChromeWindow = Get-Process chrome -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1
if (-not $XChromeWindow) {
  Preserve-XPending 'x_visible_window_missing_before_prestage'
}

$ClipboardHelper = Join-Path $RepoRoot 'scripts\automation\x-post-chrome.ps1'
$XImageArg = $XImages -join ','
try {
  & $ClipboardHelper -PostText 'x' -ImagePaths $XImageArg -ClipboardOnly 2>&1 |
    Out-File -FilePath $XLog -Encoding utf8 -Append
  if ($LASTEXITCODE -ne 0) { Preserve-XPending "x_clipboard_prestage_failed:exit=$LASTEXITCODE" }
} catch {
  Preserve-XPending "x_clipboard_prestage_failed:$($_.Exception.Message)"
}

$XPromptFile = Join-Path $RepoRoot 'docs\x-post-codex-night-prompt.md'
$XPrompt = (Get-Content $XPromptFile -Raw -Encoding utf8).Replace('{{SLUG}}', $Slug)
$PromptPath = Join-Path $NightDir "$RunId.codex-phase-c.prompt.md"
$ArgsPath = Join-Path $NightDir "$RunId.codex-phase-c.args.json"
$OutputFile = Join-Path $NightDir "$RunId.codex-phase-c.log"
$RunnerOut = Join-Path $NightDir "$RunId.codex-phase-c.runner.log"
$RunnerErr = Join-Path $NightDir "$RunId.codex-phase-c.runner.err.log"
$LedgerPath = (& node -e "import('./scripts/sumahon/x-posted-path.mjs').then(m=>console.log(m.X_POSTED_LEDGER_PATH))" | Out-String).Trim()
$StateDirectory = Split-Path -Parent $LedgerPath
$xCodexArgs = @('exec', '--ephemeral', '--sandbox', 'workspace-write', '--add-dir', 'D:\downloads\sumalabo-codex', '--add-dir', $StateDirectory, '--skip-git-repo-check', '--color', 'never', '-C', $RepoRoot, '-')
Set-Content -LiteralPath $PromptPath -Value $XPrompt -Encoding utf8
$xCodexArgs | ConvertTo-Json | Set-Content -LiteralPath $ArgsPath -Encoding utf8

$EnvironmentFile = Join-Path $RepoRoot 'config\night-environment.json'
$CodexExe = [string](Get-Content -LiteralPath $EnvironmentFile -Raw -Encoding utf8 | ConvertFrom-Json).codex.executable
$Launcher = Join-Path $RepoRoot 'scripts\automation\night-process-runner.mjs'
$NodeExe = (Get-Command node -ErrorAction Stop).Source
$LauncherArgs = @($Launcher, '--prompt-file', $PromptPath, '--args-file', $ArgsPath, '--output-file', $OutputFile, '--state-file', $StateFile, '--agent-exe', $CodexExe, '--heartbeat-ms', '15000')
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
if (Test-Path $RunnerErr) { Get-Content $RunnerErr -ErrorAction SilentlyContinue | Add-Content $RunnerOut -Encoding utf8 }
if (-not $process -or $process.ExitCode -ne 0) {
  $code = if ($process) { $process.ExitCode } else { -1 }
  Preserve-XPending "codex_phase_c_failed:exit=$code"
}

Write-XResult 'completed' 'x_step_completed' 0
