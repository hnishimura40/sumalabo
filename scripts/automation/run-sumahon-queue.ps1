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

# scheduler-gitconfig: 以前は空ファイルだったが、それだと credential.helper が
# 読み込まれず `git push origin auto/sumahon-...` が認証なしで失敗する
# (2026-05-12 14:00 / 15:00 の実行で観測)。
# 必要最小限の設定 (credential.helper=manager, gpg 署名 OFF) を持つ scheduler
# 専用 gitconfig を生成して、ユーザー側の Credential Manager を使えるようにする。
# gpgsign=false は無人実行でも gpg agent を起動しないため。
$GitConfigPath = Join-Path $LogDir "scheduler-gitconfig"
$GitConfigContent = @"
[credential]
	helper = manager
[commit]
	gpgsign = false
[tag]
	gpgsign = false
[core]
	autocrlf = false
"@
Set-Content -Path $GitConfigPath -Value $GitConfigContent -Encoding UTF8
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

  # === Reset to main if a previous run left us on a preview branch ===
  # 2026-05-13 02:00 で publish-gate がブロックしたあと、create-from-sumahon が
  # auto/sumahon-... に切り替えたまま終了し、03:00 / 04:00 / 05:00 の
  # assertNoTrackedChanges が "M data/automation/processed-urls.json" を理由に
  # 連続失敗した。これを避けるため、runner 入口で main 以外なら main へ戻し、
  # tracked dirty があれば安全停止する (ignored / untracked は無視)。
  #
  # 注意 (PS 5.1 + ErrorActionPreference=Stop):
  #   git は正常実行でも stderr に "Switched to branch 'main'" / "From https://..."
  #   などを出す。$ErrorActionPreference=Stop 下では 2>&1 経由でこれらが
  #   NativeCommandError として fatal 扱いになり runner が落ちる
  #   (2026-05-13 08:00 の dry-run で実観測)。npm 区間と同じく
  #   $ErrorActionPreference="Continue" でラップして LASTEXITCODE だけで成否判定する。
  $PrevErrorActionPreferenceGit = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $shouldExitFromBranchReset = $false
  try {
    $currentBranchOutput = & git -c "safe.directory=$SafeProjectRoot" branch --show-current 2>&1
    $currentBranch = ($currentBranchOutput | Out-String).Trim()
    if (-not $currentBranch) {
      Write-RunLog "Could not detect current branch. Continuing without reset."
    } elseif ($currentBranch -ne "main") {
      Write-RunLog "Current branch is '$currentBranch' (not main). Attempting safe reset to main."
      $trackedDirty = & git -c "safe.directory=$SafeProjectRoot" status --porcelain --untracked-files=no 2>&1
      $trackedDirtyText = ($trackedDirty | Out-String).Trim()
      if ($trackedDirtyText) {
        Write-RunLog "Tracked dirty files detected; refusing to discard. Listing:"
        $trackedDirtyText -split "`r?`n" | ForEach-Object {
          $line = $_.Trim()
          if ($line) { Write-RunLog "  $line" }
        }
        Write-RunLog "Resolve tracked changes manually (commit or revert) before next run. Exiting safely."
        $shouldExitFromBranchReset = $true
      } else {
        & git -c "safe.directory=$SafeProjectRoot" checkout main 2>&1 | ForEach-Object { Write-RunLog "  $_" }
        $checkoutExit = $LASTEXITCODE
        if ($checkoutExit -ne 0) {
          Write-RunLog "  git checkout main failed with code $checkoutExit. Exiting safely."
          $shouldExitFromBranchReset = $true
        } else {
          & git -c "safe.directory=$SafeProjectRoot" pull --ff-only origin main 2>&1 | ForEach-Object { Write-RunLog "  $_" }
          $pullExit = $LASTEXITCODE
          if ($pullExit -ne 0) {
            Write-RunLog "  git pull failed (non-fatal, code=$pullExit); continuing with local main."
          }
          $confirmedBranchOutput = & git -c "safe.directory=$SafeProjectRoot" branch --show-current 2>&1
          $confirmedBranch = ($confirmedBranchOutput | Out-String).Trim()
          Write-RunLog "Now on branch: $confirmedBranch"
        }
      }
    } else {
      Write-RunLog "Already on main."
    }
  } finally {
    $ErrorActionPreference = $PrevErrorActionPreferenceGit
  }
  if ($shouldExitFromBranchReset) {
    exit 0
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

  # npm.cmd 経由で実行される子プロセスは、git の "Switched to a new branch"
  # のような正常な stderr 出力でも PowerShell 5.1 では $ErrorActionPreference=Stop
  # + 2>&1 パイプライン下で fatal error として扱われ、runner が exit 1 で停止する
  # (2026-05-12 14:00 / 15:00 で観測。MDX commit までは進んだが push 前に kill)。
  # npm 実行中だけ $ErrorActionPreference="Continue" にし、stderr を error 扱いせず
  # ログに通す。LASTEXITCODE で明示的に exit code をチェックして真の失敗だけ throw。
  $PrevErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    Write-RunLog "Running build."
    npm.cmd run build 2>&1 | ForEach-Object { Write-RunLog "  $_" }
    $buildExit = $LASTEXITCODE
    if ($buildExit -ne 0) {
      throw "npm run build failed with exit code $buildExit"
    }

    Write-RunLog "Running Sumahon watch queue. Max jobs per run: 1"
    npm.cmd run sumahon:watch -- --max-jobs 1 2>&1 | ForEach-Object { Write-RunLog "  $_" }
    $watchExit = $LASTEXITCODE
    if ($watchExit -ne 0) {
      throw "npm run sumahon:watch failed with exit code $watchExit"
    }
  } finally {
    $ErrorActionPreference = $PrevErrorActionPreference
  }

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
