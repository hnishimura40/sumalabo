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

  # ---- 2-bis. Chrome 起動確認（デフォルトプロファイル・拡張経路） ----
  # 夜間ドライバー（claude）は claude-in-chrome 拡張で **デフォルトプロファイルの Chrome** を
  # 操作する（ここが ChatGPT/X ログイン済み・拡張ペアリング済みの本番環境）。
  # 【Chrome 136+ 対応】Chrome 136 以降、デフォルトプロファイルでの --remote-debugging-port は
  # 無効化される（実測 2026-07-09 / Chrome 150：デフォルトではポート bind せず、専用 user-data-dir
  # なら bind）。そのため **debug-port ベースのプリフライトは使わない**。実操作は拡張が担うので、
  # ここでは「Chrome が起動していて拡張が接続できる状態」だけ保証する。**ChatGPT/X ログイン生存の
  # 検査は claude 側（拡張）で行う**（docs/night_driver_prompt.md 0-bis）。
  $ChromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
  if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }

  if (-not (Test-Path $ChromeExe)) {
    Log "SKIP: Chrome 実行ファイルが見つからない。ブラウザ経路なしのため停止（testMode 未消費）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: Chrome実行ファイル不明'}))" 2>&1 | Out-Null
    exit 0
  }

  $chromeCount = @(Get-Process chrome -ErrorAction SilentlyContinue).Count
  if ($chromeCount -gt 0) {
    Log "Chrome は既に起動中（$chromeCount プロセス）。拡張経路を利用（デフォルトプロファイル）。"
  } else {
    Log "Chrome 未起動。デフォルトプロファイルで起動する（--restore-last-session で ChatGPT/X タブ・ログイン復元）。"
    Start-Process -FilePath $ChromeExe -ArgumentList @(
      "--restore-last-session",
      "--no-first-run",
      "--no-default-browser-check",
      "--start-maximized"
    ) | Out-Null
    Start-Sleep -Seconds 12   # 拡張が MCP リレーへ接続する猶予
    if (@(Get-Process chrome -ErrorAction SilentlyContinue).Count -eq 0) {
      Log "SKIP: Chrome 起動に失敗（プロセスが立ち上がらない）。停止（testMode 未消費）。"
      node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'blocked',title:'[testMode] 夜間運転停止: Chrome起動失敗'}))" 2>&1 | Out-Null
      exit 0
    }
  }

  if ($BrowserCheckOnly) {
    Log "=== BrowserCheckOnly OK: Chrome起動を確認。ChatGPT/Xログイン生存と拡張接続はdriver側（拡張）で検査する設計。claudeは起動せず終了（testMode未消費） ==="
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

  # ---- 3-bis. transient クラッシュからの1回だけ resume ----
  # claude -p は稀に "tool call could not be parsed" 等の transient エラーで exit != 0 になる
  # （2026-07-14 の atlas run: turn5 で発生し 21 分の作業を放棄）。orchestrator の状態は
  # ステップ単位で保存されているので、**未完了の記事が直近に存在すれば1回だけ再開**する。
  # 検出は find-resumable-run.mjs（halted=false / finalize未完 / research done / 60分以内）。
  # 新規 scout はせず、resume 専用プロンプトで当該 slug を仕上げるだけ。
  if ($claudeExit -ne 0) {
    $resumeSlug = (node scripts/automation/find-resumable-run.mjs --window-min 60 2>$null | Out-String).Trim()
    if ($resumeSlug) {
      Log "resume: 未完了の記事 '$resumeSlug' を検出。transient クラッシュとみなし1回だけ再開する。"
      $ResumeTemplate = Get-Content (Join-Path $RepoRoot "docs\night_driver_resume_prompt.md") -Raw -Encoding utf8
      $ResumePrompt = $ResumeTemplate.Replace("{{SLUG}}", $resumeSlug)
      $swR = [System.Diagnostics.Stopwatch]::StartNew()
      & claude -p $ResumePrompt `
          --model claude-opus-4-8 `
          --chrome `
          --allowedTools $AllowedTools `
          --max-turns 1200 `
          2>&1 | Out-File -FilePath $ClaudeLog -Encoding utf8 -Append
      $resumeExit = $LASTEXITCODE
      $swR.Stop()
      Log "claude resume exited: code=$resumeExit elapsed=$([Math]::Round($swR.Elapsed.TotalMinutes,1))min (slug=$resumeSlug)"
      if ($resumeExit -ne 0) {
        node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[testMode] 夜間運転: 再開も失敗（exit $resumeExit / slug=$resumeSlug）。logs/night/$DateStr.log を確認'}))" 2>&1 | Out-Null
      } else {
        Log "resume 成功: '$resumeSlug' を完走。"
      }
      exit $resumeExit
    }
    Log "resume: 再開対象の未完了記事なし（60分以内の in-progress state が無い）。"
    node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'failed',title:'[testMode] 夜間運転が異常終了（exit $claudeExit）。logs/night/$DateStr.log を確認'}))" 2>&1 | Out-Null
  }
  exit $claudeExit
} finally {
  Remove-Item $LockFile -Force -Confirm:$false -ErrorAction SilentlyContinue
}
