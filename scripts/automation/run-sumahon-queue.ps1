param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SafeProjectRoot = $ProjectRoot.Replace("\", "/")
$LogDir = Join-Path $ProjectRoot "logs\automation"
$LockDir = Join-Path $ProjectRoot "data\automation\locks"
$LockPath = Join-Path $LockDir "sumahon-queue-runner.lock"
$StartedAt = Get-Date
$Stamp = $StartedAt.ToString("yyyyMMdd-HHmmss")
$LogPath = Join-Path $LogDir "$Stamp.log"

function Write-RunLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Write-Output $line
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

function Test-NpmScript {
  param([string]$ScriptName)
  $packagePath = Join-Path $ProjectRoot "package.json"
  if (-not (Test-Path $packagePath)) {
    return $false
  }

  $package = Get-Content -Path $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
  return $null -ne $package.scripts.$ScriptName
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $LockDir | Out-Null
$GitConfigPath = Join-Path $LogDir "scheduler-empty-gitconfig"
if (-not (Test-Path $GitConfigPath)) {
  Set-Content -Path $GitConfigPath -Value "" -Encoding UTF8
}
$env:GIT_CONFIG_GLOBAL = $GitConfigPath
$env:GIT_CONFIG_NOSYSTEM = "1"
$env:XDG_CONFIG_HOME = $LogDir

# Node.js の DeprecationWarning (例: DEP0190 spawn shell:true) を抑制する。
# Windows タスク経由の Windows PowerShell 5.1 では $ErrorActionPreference=Stop +
# `npm ... 2>&1 | ForEach-Object` の組み合わせで stderr に出た deprecation
# warning が fatal error 扱いになり、runner が exit 1 で停止していたため
# (2026-05-12 02/03/04/05 の 4 回の実行で観測)。
# NODE_OPTIONS=--no-deprecation は子プロセス (npm.cmd → node) に inherit され、
# 全 descendant の deprecation warning を抑える (NODE_NO_DEPRECATION 環境変数では
# DEP0190 は抑制されないことを実測で確認)。
if ($env:NODE_OPTIONS) {
  $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --no-deprecation"
} else {
  $env:NODE_OPTIONS = "--no-deprecation"
}

try {
  Set-Location $ProjectRoot
  Write-RunLog "Sumalabo Sumahon queue runner started. DryRun=$DryRun"
  Write-RunLog "ProjectRoot=$ProjectRoot"

  if (Test-Path $LockPath) {
    Write-RunLog "Lock exists: $LockPath"
    Write-RunLog "Another run may be active. Exiting safely."
    exit 0
  }

  Set-Content -Path $LockPath -Value (@{
      createdAt = (Get-Date).ToString("o")
      pid = $PID
      dryRun = [bool]$DryRun
    } | ConvertTo-Json) -Encoding UTF8
  Write-RunLog "Lock created: $LockPath"

  Write-RunLog "git branch:"
  & git -c "safe.directory=$SafeProjectRoot" branch --show-current 2>&1 | ForEach-Object { Write-RunLog "  $_" }
  if ($LASTEXITCODE -ne 0) {
    Write-RunLog "  git branch command exited with code $LASTEXITCODE"
  }
  Write-RunLog "git status --short:"
  & git -c "safe.directory=$SafeProjectRoot" status --short 2>&1 | ForEach-Object { Write-RunLog "  $_" }
  if ($LASTEXITCODE -ne 0) {
    Write-RunLog "  git status command exited with code $LASTEXITCODE"
  }

  $hasWatchScript = Test-NpmScript "sumahon:watch"
  if (-not $hasWatchScript) {
    Write-RunLog "npm script 'sumahon:watch' is not available in this branch."
    Write-RunLog "Queue processing was not started. Merge/add the watch CLI before production scheduling."
    Write-RunLog "Available preparation command: npm.cmd run article:prepare-from-sumahon -- --url <smhn-url>"
    Write-RunLog "Expected future command: npm.cmd run sumahon:watch -- --max-jobs 1"
    if ($DryRun) {
      Write-RunLog "Dry-run completed with missing watch script notice."
      exit 0
    }
    exit 2
  }

  if ($DryRun) {
    Write-RunLog "Dry-run mode: build and queue execution are skipped."
    Write-RunLog "Would run: npm.cmd run build"
    Write-RunLog "Would run: npm.cmd run sumahon:watch -- --max-jobs 1"
    exit 0
  }

  Write-RunLog "Running build."
  npm.cmd run build 2>&1 | ForEach-Object { Write-RunLog "  $_" }

  Write-RunLog "Running Sumahon watch queue. Max jobs per run: 1"
  npm.cmd run sumahon:watch -- --max-jobs 1 2>&1 | ForEach-Object { Write-RunLog "  $_" }

  Write-RunLog "Sumahon queue runner completed."
} catch {
  Write-RunLog "ERROR: $($_.Exception.Message)"
  exit 1
} finally {
  if (Test-Path $LockPath) {
    Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
    Write-RunLog "Lock removed: $LockPath"
  }
}
