# x-post-chrome.ps1
#
# すまラボ自動化: X 投稿 Chrome UI ルートのクリップボード準備ヘルパー。
#
# 仕様:
#   - 引数 -PostText で投稿本文を受け取り、テキストクリップボードへセット
#   - 任意で -ImagePath を渡せば CF_HDROP クリップボードへ画像 1 ファイルセット (Ctrl+V でX に添付できる)
#   - 複数枚は -ImagePaths（カンマ区切り or 配列）で最大4枚まとめて CF_HDROP セット
#     （X の composer は 1 回の Ctrl+V で複数画像を添付できる。画像投稿+リプライ運用・2026-07-14）
#   - Chrome の x.com (またはタイトルに "X" / "𝕏" を含む) ウィンドウを AttachThreadInput + SetForegroundWindow で前面化
#   - Edge は触らない
#   - 本スクリプトは **クリック/投稿そのものはしない**。投稿の最終クリックは Claude in Chrome MCP が DOM 経由で行う。
#     これは「人間に投稿させない」+「自動連投の暴走を防ぐ」両立のため、PS では準備だけにする。
#
# 使い方:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
#     "scripts/automation/x-post-chrome.ps1" `
#     -PostText "投稿本文..." `
#     [-ImagePath "public/images/thumbnails/xxx.png"] `
#     [-WindowTitlePattern "*X*"]
#
# 終了コード:
#   0 = クリップボード準備 + Chrome 前面化 成功
#   2 = Chrome の X ウィンドウが見つからない (要: x.com を Chrome で開いておく)
#   3 = 画像ファイルが見つからない
#   4 = フォアグラウンド化に失敗
#   5 = クリップボード設定に失敗

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $PostText,
  [string] $ImagePath = "",
  [string[]] $ImagePaths = @(),
  [string] $WindowTitlePattern = "*x.com*",
  [int] $ForegroundWaitMs = 300,
  [long] $WindowHandle = 0,
  [switch] $ClipboardOnly
)

$ErrorActionPreference = 'Stop'

# 添付画像リストの正規化: -ImagePaths（複数・カンマ区切りも許容）優先、無ければ -ImagePath 1枚。最大4枚。
$imageList = @()
if ($ImagePaths -and $ImagePaths.Count -gt 0) {
  foreach ($p in $ImagePaths) { foreach ($q in ($p -split ',')) { if ($q.Trim()) { $imageList += $q.Trim() } } }
}
elseif ($ImagePath) {
  $imageList += $ImagePath
}
if ($imageList.Count -gt 4) { $imageList = $imageList[0..3] }

# 画像ファイル存在チェック (指定時のみ)
foreach ($img in $imageList) {
  if (-not (Test-Path -LiteralPath $img)) {
    Write-Error "Image file not found: $img"
    exit 3
  }
}

# === Win32 P/Invoke ===
$sig = @'
using System;
using System.Runtime.InteropServices;
public class XFg {
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
    ShowWindow(hWnd, 9);
    BringWindowToTop(hWnd);
    SetForegroundWindow(hWnd);
    AttachThreadInput(myThread, fgThread, false);
  }
}
'@
Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms

# === Chrome の X タブを持つウィンドウを探す（必要時のみ） ===
if (-not $ClipboardOnly) {
  $chrome = $null
  if ($WindowHandle -gt 0) {
    $chrome = [pscustomobject]@{ Id = 0; MainWindowHandle = [IntPtr]$WindowHandle; MainWindowTitle = "Chrome (caller-supplied visible window)" }
  } else {
    $chrome = Get-Process chrome -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowTitle -like $WindowTitlePattern -or $_.MainWindowTitle -like "*X / *" -or $_.MainWindowTitle -like "*ポスト*" -or $_.MainWindowTitle -like "*ホーム / X*" } |
      Select-Object -First 1
  }
  if (-not $chrome) {
    $chrome = Get-Process chrome -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowHandle -ne 0 -and -not ($_.MainWindowTitle -like "*Edge*") } |
      Select-Object -First 1
  }
  if (-not $chrome) { Write-Error "No Chrome window found. Open x.com in Chrome and re-run." }
  if ($chrome.MainWindowTitle -match 'Edge') { Write-Error "Refusing to operate on Edge. Use Chrome only." }
  Write-Host ("Target Chrome window: pid={0} title={1}" -f $chrome.Id, $chrome.MainWindowTitle)
  [XFg]::Force($chrome.MainWindowHandle)
  Start-Sleep -Milliseconds $ForegroundWaitMs
  $fg = [XFg]::GetForegroundWindow()
  if ($fg -ne $chrome.MainWindowHandle) {
    Write-Error ("Failed to bring Chrome to foreground. fg={0} target={1}" -f $fg.ToInt64(), $chrome.MainWindowHandle.ToInt64())
  }
} else {
  Write-Host "clipboard-only: Chrome focus is delegated to Codex Browser"
}

# === クリップボード設定: テキストか画像か ===
try {
  if ($imageList.Count -gt 0) {
    # 画像優先で CF_HDROP セット (Ctrl+V で添付を意図)。複数枚は1回の貼り付けでまとめて添付。
    $sc = New-Object System.Collections.Specialized.StringCollection
    foreach ($img in $imageList) { [void]$sc.Add((Resolve-Path -LiteralPath $img).Path) }
    [System.Windows.Forms.Clipboard]::SetFileDropList($sc)
    Write-Host ("clipboard: image CF_HDROP = {0} file(s): {1}" -f $imageList.Count, ($imageList -join ' | '))
  }
  else {
    # テキストクリップボード
    [System.Windows.Forms.Clipboard]::SetText($PostText)
    Write-Host ("clipboard: text length = {0}" -f $PostText.Length)
  }
}
catch {
  Write-Error ("Clipboard set failed: {0}" -f $_.Exception.Message)
  exit 5
}

Write-Host "ready. Claude in Chrome should now focus the compose textarea and Ctrl+V, then click the post button via MCP."
return
