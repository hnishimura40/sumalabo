# ensure-chrome.ps1
#
# Claude in Chrome（拡張経路）が未接続のときの**自己復旧**用スタンドアロンスクリプト。
# night-run.ps1 の「Chrome 起動確認ブロック」と同等の処理を、昼の対話セッション中でも
# 単体で実行できる形に切り出したもの。
#
# 使い方:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/automation/ensure-chrome.ps1
#   [-WaitSeconds 12] [-ForceNewWindow]
#
# 挙動:
#   - config/night-environment.json の実行ファイル・user-data-dir・profile-directory を使う。
#   - 対象プロファイルが無い → 同プロファイルを --restore-last-session で起動（ChatGPT/X タブ・ログイン復元）。
#   - 対象プロファイルがある → 既定は何もしない。-ForceNewWindow 指定時のみ同プロファイルの新規ウィンドウを開いて
#     拡張のページ接続を促す（プロセスはあるのに MCP リレーが切れたケースの軽いnudge）。
#   - 起動後 WaitSeconds 待って安定を確認（拡張が MCP リレーへ接続する猶予）。
#
# 重要な限界（粘らないルール準拠）:
#   - これは「Chrome が起動していること」を保証するだけ。**拡張のペアリング自体が切れている場合は
#     Chrome 起動だけでは直らない**。呼び出し側は ensure-chrome 実行→30秒待って
#     list_connected_browsers を再確認（最大2回）。それでも未接続なら人間に再接続を依頼する。
#
# 終了コード: 0=Chrome稼働（既存 or 起動成功） / 3=chrome.exe不明 / 4=起動失敗

[CmdletBinding()]
param(
  [int] $WaitSeconds = 12,
  [switch] $ForceNewWindow
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Environment = Get-Content -LiteralPath (Join-Path $RepoRoot 'config\night-environment.json') -Raw -Encoding utf8 | ConvertFrom-Json
$ChromeProfileDirectory = [string]$Environment.chrome.profileDirectory
$ChromeUserDataDirectory = [string]$Environment.chrome.userDataDirectory
$ChromeExe = @($Environment.chrome.executableCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
if ($ChromeExe) { $ChromeExe = [string]$ChromeExe[0] }
if (-not (Test-Path $ChromeExe)) {
  Write-Host "ensure-chrome: NG chrome.exe が見つかりません（要インストール確認）。"
  exit 3
}

$launchArgs = @(
  "--user-data-dir=`"$ChromeUserDataDirectory`"",
  "--profile-directory=`"$ChromeProfileDirectory`"",
  "--restore-last-session", "--no-first-run", "--no-default-browser-check", "--start-maximized"
)

$escapedProfile = [regex]::Escape($ChromeProfileDirectory)
$targetRunning = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "--profile-directory=(?:`"$escapedProfile`"|$escapedProfile)(?:\s|$)" }).Count
if ($targetRunning -gt 0 -and -not $ForceNewWindow) {
  Write-Host ("ensure-chrome: OK {0} は既に起動中（root {1}）。拡張のMCP再接続を {2} 秒待機して確認してください。" -f $ChromeProfileDirectory, $targetRunning, $WaitSeconds)
  # プロセスはあるので起動はしない。ただし拡張リレーが切れている可能性があるため待機だけ行う。
  Start-Sleep -Seconds $WaitSeconds
  exit 0
}

if ($targetRunning -gt 0 -and $ForceNewWindow) {
  Write-Host ("ensure-chrome: {0} 稼働中だが -ForceNewWindow のため同プロファイルの新規ウィンドウを開く。" -f $ChromeProfileDirectory)
  Start-Process -FilePath $ChromeExe -ArgumentList $launchArgs | Out-Null
} else {
  Write-Host ("ensure-chrome: {0} 未起動。同プロファイルを --restore-last-session で起動する。" -f $ChromeProfileDirectory)
  Start-Process -FilePath $ChromeExe -ArgumentList $launchArgs | Out-Null
}

Start-Sleep -Seconds $WaitSeconds

$targetRunningAfter = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "--profile-directory=(?:`"$escapedProfile`"|$escapedProfile)(?:\s|$)" }).Count
if ($targetRunningAfter -eq 0) {
  Write-Host ("ensure-chrome: NG {0} の起動を確認できません。" -f $ChromeProfileDirectory)
  exit 4
}

Write-Host ("ensure-chrome: OK {0} の起動を確認（root {1}）。この後 30 秒ほど待って list_connected_browsers を再確認してください（最大2回・粘らない）。" -f $ChromeProfileDirectory, $targetRunningAfter)
exit 0
