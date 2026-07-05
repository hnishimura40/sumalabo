# scripts/automation/night-run.ps1 — 夜間自動運転の起動エントリ（タスクスケジューラから呼ばれる）
#
# 役割:
#   1. 多重起動ガード（前夜/当夜の run が生きていたら新規起動しない）
#   2. testMode の軽量プリフライト（非アクティブなら Claude を起動すらしない）
#   3. ヘッドレス Claude Code（claude -p / モデル claude-opus-4-8 / 最小 allowlist）で
#      docs/night_driver_prompt.md を実行
#   4. ログ全量を logs/night/{date}.log に保存
#
# 登録: npm run schedule:auto-run（既定 4:30 JST）
# 手動テスト: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1

$ErrorActionPreference = 'Continue'
$RepoRoot = "D:\documents\動画作成関連\すまラボ"
Set-Location $RepoRoot

$NightDir = Join-Path $RepoRoot "logs\night"
New-Item -ItemType Directory -Force $NightDir | Out-Null
$DateStr = (Get-Date).ToString("yyyy-MM-dd")
$LogFile = Join-Path $NightDir "$DateStr.log"
$LockFile = Join-Path $NightDir "run.lock"

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $LogFile -Value $line -Encoding utf8
  Write-Host $line
}

# ---- 1. 多重起動ガード ----
if (Test-Path $LockFile) {
  try {
    $lock = Get-Content $LockFile -Raw | ConvertFrom-Json
    $proc = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue
    if ($proc) {
      Log "SKIP: 前回の run (pid=$($lock.pid), started=$($lock.startedAt)) がまだ生きています。多重起動しません。"
      exit 0
    }
    Log "古い lock (pid=$($lock.pid) は終了済み) を回収します。"
  } catch {
    Log "lock ファイルが壊れています。回収します。"
  }
  Remove-Item $LockFile -Force -Confirm:$false
}
@{ pid = $PID; startedAt = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content $LockFile -Encoding utf8

try {
  # ---- 2. 軽量プリフライト（Claude を起動する前に node だけで判定） ----
  Log "preflight: test-mode --status"
  $preflight = node scripts/automation/test-mode.mjs --status 2>&1
  $preflightExit = $LASTEXITCODE
  Log ($preflight | Out-String).Trim()
  if ($preflightExit -ne 0) {
    Log "SKIP: testMode 非アクティブ（exit $preflightExit）。Claude を起動しません。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'skipped',title:'[testMode] 夜間運転スキップ（testMode非アクティブ/実行済み）'}))" 2>&1 | Out-Null
    exit 0
  }

  # ---- 3. ヘッドレス Claude Code 起動 ----
  $PromptFile = Join-Path $RepoRoot "docs\night_driver_prompt.md"
  $Prompt = Get-Content $PromptFile -Raw -Encoding utf8
  # 最小 allowlist: 開発ツール一式 + Chrome MCP（ChatGPT 画像生成 / X 投稿に必須）。
  # 破壊的操作（git push -f 等）は allowlist に含めない。
  $AllowedTools = "Bash Read Write Edit Glob Grep TaskCreate TaskUpdate mcp__claude-in-chrome__*"

  Log "launch: claude -p (model=claude-opus-4-8)"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & claude -p $Prompt `
      --model claude-opus-4-8 `
      --allowedTools $AllowedTools `
      --max-turns 400 `
      2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding utf8 }
  $claudeExit = $LASTEXITCODE
  $sw.Stop()
  Log "claude exited: code=$claudeExit elapsed=$([Math]::Round($sw.Elapsed.TotalMinutes,1))min"

  if ($claudeExit -ne 0) {
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[testMode] 夜間運転が異常終了（exit $claudeExit）。logs/night/$DateStr.log を確認'}))" 2>&1 | Out-Null
  }
  exit $claudeExit
} finally {
  Remove-Item $LockFile -Force -Confirm:$false -ErrorAction SilentlyContinue
}
