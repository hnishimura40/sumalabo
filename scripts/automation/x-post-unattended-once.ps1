param(
  [string]$Slug = "ai-work-productivity-experience-2026",
  [switch]$DryRun
)

$ErrorActionPreference = "Continue"
$RepoRoot = "D:\documents\動画作成関連\すまラボ"
Set-Location $RepoRoot
$LogDir = Join-Path $RepoRoot "logs\social"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Mode = if ($DryRun) { "dry-run" } else { "post" }
$LogFile = Join-Path $LogDir ("{0}.scheduled-{1}.log" -f $Slug, $Mode)
$LockFile = Join-Path $LogDir ("{0}.scheduled-x.lock" -f $Slug)

function Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Encoding UTF8 -LiteralPath $LogFile -Value $line
  Write-Host $line
}

if (Test-Path -LiteralPath $LockFile) {
  Log "SKIP: dedicated X task lock exists"
  exit 0
}
@{ pid = $PID; startedAt = (Get-Date).ToString("o"); mode = $Mode } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $LockFile

try {
  if (-not $DryRun) {
    $NightLock = Join-Path $RepoRoot "logs\night\run.lock"
    if (Test-Path -LiteralPath $NightLock) {
      try {
        $night = Get-Content -Raw -Encoding UTF8 -LiteralPath $NightLock | ConvertFrom-Json
        if (Get-Process -Id $night.pid -ErrorAction SilentlyContinue) {
          $reason = "night-run is still active; scheduled X post skipped to avoid interference"
          Log $reason
          node scripts/run/post-to-x.mjs --error --slug $Slug --stage preflight --reason $reason | Out-Null
          node scripts/automation/record-x-scheduled-failure.mjs --slug $Slug --reason $reason | Out-Null
          exit 0
        }
      } catch { Log "WARN: stale or invalid night-run lock; continuing" }
    }
  }

  node scripts/run/post-to-x.mjs --check --slug $Slug *> $null
  if ($LASTEXITCODE -eq 3) { Log "SKIP: x-posted ledger already contains slug"; exit 0 }
  if ($LASTEXITCODE -ne 0) { throw "preflight ledger check failed" }

  if (-not (Test-Path -LiteralPath "logs\social\$Slug.x-post.json")) {
    node scripts/run/generate-x-post.mjs --slug $Slug
    if ($LASTEXITCODE -ne 0) { throw "X post JSON generation failed" }
  }

  $Template = Get-Content -Raw -Encoding UTF8 -LiteralPath "docs\x-post-unattended-procedure.md"
  $Prompt = $Template.Replace("{{SLUG}}", $Slug).Replace("{{MODE}}", $Mode)
  $AllowedTools = "Bash Read Write Edit Glob Grep ToolSearch mcp__claude-in-chrome__*"
  Log "launch claude -p --chrome mode=$Mode"
  $ClaudeOutput = & claude -p $Prompt --model claude-opus-4-8 --chrome --allowedTools $AllowedTools --max-turns 220 2>&1
  $ClaudeExit = $LASTEXITCODE
  $OutputText = $ClaudeOutput | Out-String
  $FilteredOutput = $OutputText | node scripts/sumahon/filter-report-output.mjs
  $FilteredOutput | Out-File -Encoding UTF8 -Append -LiteralPath $LogFile
  $OutputText = $FilteredOutput | Out-String
  if ($DryRun) {
    $SuccessMarker = ($OutputText -match '@suma_labo') -and ($OutputText -match 'mediaCount["'']?\s*:\s*4') -and ($OutputText -match 'posted["'']?\s*:\s*false')
  } else {
    $StatusUrls = [regex]::Matches($OutputText, 'https://x\.com/suma_labo/status/\d+')
    $SuccessMarker = ($OutputText -match '@suma_labo') -and ($OutputText -match 'main[^\r\n]*count[^\r\n]*1') -and ($OutputText -match 'reply[^\r\n]*count[^\r\n]*1') -and ($StatusUrls.Count -ge 2)
  }
  if ($ClaudeExit -ne 0 -or -not $SuccessMarker) {
    $reason = "unattended claude-in-chrome $Mode failed (exit=$ClaudeExit)"
    Log $reason
    if (-not $DryRun) {
      node scripts/run/post-to-x.mjs --error --slug $Slug --stage $Mode --reason $reason | Out-Null
      node scripts/automation/record-x-scheduled-failure.mjs --slug $Slug --reason $reason | Out-Null
    }
    exit 1
  }
  Log "complete mode=$Mode"
  exit 0
} catch {
  $reason = $_.Exception.Message
  Log "ERROR: $reason"
  if (-not $DryRun) {
    node scripts/run/post-to-x.mjs --error --slug $Slug --stage runner --reason $reason | Out-Null
    node scripts/automation/record-x-scheduled-failure.mjs --slug $Slug --reason $reason | Out-Null
  }
  exit 1
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath $LockFile
}
