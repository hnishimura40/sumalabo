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
#   - chrome.exe を探す（Program Files / (x86)）。無ければ exit 3。
#   - Chrome プロセスが無い → --restore-last-session でデフォルトプロファイル起動（ChatGPT/X タブ・ログイン復元）。
#   - Chrome プロセスがある → 既定は何もしない（既存を尊重）。-ForceNewWindow 指定時のみ新規ウィンドウを開いて
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

$ChromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $ChromeExe)) {
  Write-Host "ensure-chrome: NG chrome.exe が見つかりません（要インストール確認）。"
  exit 3
}

$launchArgs = @("--restore-last-session", "--no-first-run", "--no-default-browser-check", "--start-maximized")

$running = @(Get-Process chrome -ErrorAction SilentlyContinue).Count
if ($running -gt 0 -and -not $ForceNewWindow) {
  Write-Host ("ensure-chrome: OK Chrome は既に起動中（{0} プロセス）。拡張のMCP再接続を {1} 秒待機して確認してください。" -f $running, $WaitSeconds)
  # プロセスはあるので起動はしない。ただし拡張リレーが切れている可能性があるため待機だけ行う。
  Start-Sleep -Seconds $WaitSeconds
  exit 0
}

if ($running -gt 0 -and $ForceNewWindow) {
  Write-Host ("ensure-chrome: Chrome 稼働中（{0} プロセス）だが -ForceNewWindow のため新規ウィンドウを開いて拡張接続を促す。" -f $running)
  Start-Process -FilePath $ChromeExe -ArgumentList $launchArgs | Out-Null
} else {
  Write-Host "ensure-chrome: Chrome 未起動。--restore-last-session で起動する（ChatGPT/X タブ・ログイン復元）。"
  Start-Process -FilePath $ChromeExe -ArgumentList $launchArgs | Out-Null
}

Start-Sleep -Seconds $WaitSeconds

if (@(Get-Process chrome -ErrorAction SilentlyContinue).Count -eq 0) {
  Write-Host "ensure-chrome: NG Chrome 起動に失敗（プロセスが立ち上がらない）。"
  exit 4
}

Write-Host ("ensure-chrome: OK Chrome 起動を確認（{0} プロセス）。この後 30 秒ほど待って list_connected_browsers を再確認してください（最大2回・粘らない）。" -f @(Get-Process chrome -ErrorAction SilentlyContinue).Count)
exit 0
