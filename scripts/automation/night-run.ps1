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

param(
  # ブラウザ経路だけドライラン実測（Chrome起動→DevTools→chrome-preflight）。
  # testMode を消費せず、claude 本体も起動しない。修正の実測確認用。
  [switch]$BrowserCheckOnly
)
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

# ---- 1. 多重起動ガード ----（ドライランでは lock を取らない）
if (-not $BrowserCheckOnly) {
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
}

try {
  if ($BrowserCheckOnly) { Log "=== BrowserCheckOnly ドライラン（testMode未消費・claude未起動） ===" }

  # ---- 2. 軽量プリフライト（Claude を起動する前に node だけで判定） ----
  # ドライランでは testMode ゲートをスキップ（ブラウザ経路だけ確かめたいため）。
  if (-not $BrowserCheckOnly) {
    Log "preflight: test-mode --status"
    $preflight = node scripts/automation/test-mode.mjs --status 2>&1
    $preflightExit = $LASTEXITCODE
    Log ($preflight | Out-String).Trim()
    if ($preflightExit -ne 0) {
      Log "SKIP: testMode 非アクティブ（exit $preflightExit）。Claude を起動しません。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'skipped',title:'[testMode] 夜間運転スキップ（testMode非アクティブ/実行済み）'}))" 2>&1 | Out-Null
      exit 0
    }
  }

  # ---- 2-bis. Chrome 起動（専用プロファイル + DevTools）+ ブラウザ経路プリフライト ----
  # 【Chrome 136+ 対応】Chrome は 136 以降、既定（デフォルト）プロファイルでの
  # --remote-debugging-port を無効化する（Cookie 窃取対策）。実測（2026-07-09, Chrome 150）：
  #   デフォルトプロファイル + --remote-debugging-port → ポート bind せず（7/8・7/9の不応答原因）
  #   専用 --user-data-dir + --remote-debugging-port → 即 bind
  # よって専用の自動運転プロファイル（$AutoProfile）でポート付き起動する。
  # このプロファイルには一度だけ ChatGPT/X ログイン + claude-in-chrome 拡張ペアリングが必要
  # （docs/night_chrome_profile_setup.md 参照）。ユーザーの通常 Chrome とは独立に共存する。
  $ChromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
  if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
  $DebugPort = 9222
  $env:CHROME_DEBUG_PORT = "$DebugPort"
  $AutoProfile = if ($env:SUMALABO_CHROME_PROFILE) { $env:SUMALABO_CHROME_PROFILE } else { "D:\work\chrome-automation-profile" }

  function Test-DebugPort {
    try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$DebugPort/json/version" -TimeoutSec 3 | Out-Null; return $true }
    catch { return $false }
  }

  # 自動運転プロファイルで起動中の Chrome だけを終了する（ユーザーの通常 Chrome は残す）。
  # ポート未応答なのに自動運転プロファイルの Chrome が生きている＝異常状態なので作り直す。
  function Stop-AutomationChrome {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine.Contains($AutoProfile) })
    if ($procs.Count -eq 0) { return $false }
    Log "自動運転プロファイルの Chrome プロセス $($procs.Count) 個を終了（作り直しのため。通常Chromeは対象外）。"
    $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2   # SingletonLock 解放待ち
    return $true
  }

  function Start-AutomationChrome {
    Start-Process -FilePath $ChromeExe -ArgumentList @(
      "--user-data-dir=$AutoProfile",
      "--restore-last-session",
      "--remote-debugging-port=$DebugPort",
      "--remote-allow-origins=*",
      "--no-first-run",
      "--no-default-browser-check",
      "--start-maximized"
    ) | Out-Null
  }

  if (-not (Test-Path $ChromeExe)) {
    Log "SKIP: Chrome 実行ファイルが見つからない。ブラウザ経路なしのため停止（testMode 未消費）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: Chrome実行ファイル不明'}))" 2>&1 | Out-Null
    exit 0
  }

  if (-not (Test-Path $AutoProfile)) {
    Log "SKIP: 自動運転プロファイル ($AutoProfile) が未作成。初回セットアップ（一度だけChatGPT/Xログイン+拡張ペアリング）が必要。docs/night_chrome_profile_setup.md 参照。停止（testMode 未消費）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: 自動運転Chromeプロファイル未セットアップ（初回ログイン+拡張ペアリングが必要）'}))" 2>&1 | Out-Null
    exit 0
  }

  $portUp = Test-DebugPort
  if ($portUp) {
    Log "Chrome DevTools ポートは既に応答（自動運転プロファイル起動済み）。そのまま利用。"
  } else {
    $devId = if (Test-Path 'data\automation\night-browser.json') { (Get-Content 'data\automation\night-browser.json' -Raw | ConvertFrom-Json).deviceId } else { 'n/a' }
    Log "launch Chrome: --user-data-dir=$AutoProfile --remote-debugging-port=$DebugPort (deviceId=$devId)"
    Stop-AutomationChrome | Out-Null   # 自動運転プロファイルの残骸があれば掃除
    Start-AutomationChrome
    # 起動直後は DevTools が数秒〜十数秒応答しない。最大 ~60s 待つ（30回 × 2s）。
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 2
      if (Test-DebugPort) { $portUp = $true; break }
    }
    if (-not $portUp) {
      Log "DevTools 未応答。自動運転プロファイルの Chrome を全終了して単独起動を再試行します。"
      Stop-AutomationChrome | Out-Null
      Start-AutomationChrome
      for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-DebugPort) { $portUp = $true; break }
      }
    }
  }

  if (-not $portUp) {
    Log "SKIP: Chrome DevTools ポートが応答しない（起動失敗）。停止（testMode 未消費）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: Chrome起動/DevTools不応答'}))" 2>&1 | Out-Null
    exit 0
  }
  Log "Chrome DevTools ポート応答 OK (http://127.0.0.1:$DebugPort, profile=$AutoProfile)"

  # restore-last-session のタブ復元・ログインリダイレクトが落ち着くまで待つ
  Start-Sleep -Seconds 8
  Log "preflight: chrome-preflight（ChatGPT/X ログイン生存・工房到達）"
  $chromePre = node scripts/automation/chrome-preflight.mjs 2>&1
  $chromePreExit = $LASTEXITCODE
  Log ($chromePre | Out-String).Trim()
  if ($chromePreExit -ne 0) {
    Log "SKIP: ブラウザ経路プリフライト不合格（exit $chromePreExit）。testMode 未消費で安全停止。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: ブラウザ経路プリフライト不合格（Chrome起動済みだがChatGPT/Xログイン切れ等）'}))" 2>&1 | Out-Null
    exit 0
  }

  if ($BrowserCheckOnly) {
    Log "=== BrowserCheckOnly OK: Chrome起動・DevTools応答・chrome-preflight合格を実測。claudeは起動せず終了（testMode未消費） ==="
    exit 0
  }

  # ---- 3. ヘッドレス Claude Code 起動 ----
  $PromptFile = Join-Path $RepoRoot "docs\night_driver_prompt.md"
  $Prompt = Get-Content $PromptFile -Raw -Encoding utf8
  # 最小 allowlist: 開発ツール一式 + Chrome MCP（ChatGPT 画像生成 / X 投稿に必須）。
  # 破壊的操作（git push -f 等）は allowlist に含めない。
  $AllowedTools = "Bash Read Write Edit Glob Grep ToolSearch TaskCreate TaskUpdate mcp__claude-in-chrome__*"

  # claude の出力は専用ファイルへ（runner 本体ログや tail との Add-Content ロック競合を避ける。
  # 2026-07-05 の初回実走で Add-Content が sharing violation で全損した対策）
  $ClaudeLog = Join-Path $NightDir "$DateStr.claude.log"
  Log "launch: claude -p (model=claude-opus-4-8, --chrome) -> $ClaudeLog"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & claude -p $Prompt `
      --model claude-opus-4-8 `
      --chrome `
      --allowedTools $AllowedTools `
      --max-turns 1200 `
      2>&1 | Out-File -FilePath $ClaudeLog -Encoding utf8 -Append
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
