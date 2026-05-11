# chatgpt-attach-files-clipboard.ps1
#
# すまラボ自動化: ChatGPTへローカル画像/PNGをクリップボード貼り付けで添付する標準ヘルパー。
#
# 仕様:
#   - 引数 -Files で複数ファイルパスを受け取る
#   - 各ファイルを 1つずつ CF_HDROP としてクリップボードにセットして Ctrl+V を送る
#   - 各貼り付けの間に 2.5秒待機 (-PasteWaitMs で上書き可)
#   - ChromeのChatGPTウィンドウを AttachThreadInput + SetForegroundWindow でフォアグラウンド化
#   - Edge は触らない / hidden file input は触らない / file_upload API は使わない
#   - 2ファイルまとめてCF_HDROPセットしない (ChatGPTのonpasteがfiles[0]しか拾わないため)
#   - UWSC はフォールバック扱い。本スクリプトでは呼ばない
#
# 使い方:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
#     "D:\documents\動画作成関連\すまラボ\scripts\automation\chatgpt-attach-files-clipboard.ps1" `
#     -Files "D:\documents\動画作成関連\すまラボ\public\images\characters\base\himari-base.png", `
#            "D:\documents\動画作成関連\すまラボ\public\images\characters\base\labomaru-base.png"
#
# 終了コード:
#   0 = 全ファイル送信成功 (DOM側で添付件数を別途確認すること)
#   2 = ChromeにChatGPTタイトルのウィンドウが見つからない
#   3 = 入力ファイルが存在しない
#   4 = フォアグラウンド化に失敗
#   5 = クリップボード設定に失敗

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string[]] $Files,
  [string] $WindowTitlePattern = '*ChatGPT*',
  [int] $PasteWaitMs = 2500,
  [int] $ForegroundWaitMs = 300
)

$ErrorActionPreference = 'Stop'

# --- 入力ファイルの存在チェック ---
foreach ($f in $Files) {
  if (-not (Test-Path -LiteralPath $f)) {
    Write-Error "File not found: $f"
    exit 3
  }
}

# --- Win32 P/Invoke ---
$sig = @'
using System;
using System.Runtime.InteropServices;
public class FgPaste {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  public static void Force(IntPtr hWnd) {
    IntPtr fg = GetForegroundWindow();
    uint pid;
    uint fgThread = GetWindowThreadProcessId(fg, out pid);
    uint myThread = GetCurrentThreadId();
    AttachThreadInput(myThread, fgThread, true);
    ShowWindow(hWnd, 9);          // SW_RESTORE
    BringWindowToTop(hWnd);
    SetForegroundWindow(hWnd);
    AttachThreadInput(myThread, fgThread, false);
  }
}
'@
Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms

# --- ChromeのChatGPTウィンドウを取得 ---
$chrome = Get-Process chrome -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like $WindowTitlePattern } |
  Select-Object -First 1

if (-not $chrome) {
  Write-Error "No Chrome window matching '$WindowTitlePattern' found. Make sure ChatGPT tab is the visible tab in a Chrome window."
  exit 2
}

Write-Host ("Target Chrome window: pid={0} title={1} handle={2}" -f $chrome.Id, $chrome.MainWindowTitle, $chrome.MainWindowHandle.ToInt64())

# --- フォアグラウンド化 (Edge は対象外) ---
if ($chrome.MainWindowTitle -match 'Edge') {
  Write-Error "Refusing to operate on Edge. Use Chrome only."
  exit 4
}

[FgPaste]::Force($chrome.MainWindowHandle)
Start-Sleep -Milliseconds $ForegroundWaitMs

$fg = [FgPaste]::GetForegroundWindow()
if ($fg -ne $chrome.MainWindowHandle) {
  Write-Error ("Failed to bring Chrome to foreground. fg={0} target={1}" -f $fg.ToInt64(), $chrome.MainWindowHandle.ToInt64())
  exit 4
}

# --- 1ファイルずつ CF_HDROP → Ctrl+V ---
$i = 0
foreach ($file in $Files) {
  $i++
  Write-Host ("[{0}/{1}] paste: {2}" -f $i, $Files.Count, $file)

  try {
    $sc = New-Object System.Collections.Specialized.StringCollection
    [void]$sc.Add($file)
    [System.Windows.Forms.Clipboard]::SetFileDropList($sc)
  }
  catch {
    Write-Error ("SetFileDropList failed for {0}: {1}" -f $file, $_.Exception.Message)
    exit 5
  }

  # 念のためChromeをもう一度フォアグラウンドに（別アプリが奪っていた場合の保険）
  [FgPaste]::Force($chrome.MainWindowHandle)
  Start-Sleep -Milliseconds 150

  $fg2 = [FgPaste]::GetForegroundWindow()
  if ($fg2 -ne $chrome.MainWindowHandle) {
    Write-Warning ("foreground lost before Ctrl+V (fg={0}). Retrying once..." -f $fg2.ToInt64())
    [FgPaste]::Force($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 200
  }

  [System.Windows.Forms.SendKeys]::SendWait('^v')
  Start-Sleep -Milliseconds $PasteWaitMs
}

Write-Host ("paste complete: {0} file(s) sent. Verify attachment count via DOM (button[aria-label^=\"ファイル\"][aria-label*=\"削除\"])." -f $Files.Count)
exit 0
