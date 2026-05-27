# disable-sumahon-tasks.ps1 — すまラボ自動巡回 Windows スケジュールタスクの無効化
#
# 役割:
#   user-directed mode 運用へ移行したため、定期実行されている
#   "Sumalabo Sumahon Queue Runner" と "Sumalabo Claude Pipeline Runner Test"
#   を Disabled にする。タスク自体は削除しない（後で手動起動できるよう残す）。
#
# 使い方:
#   npm run automation:disable-tasks
#     または
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\automation\disable-sumahon-tasks.ps1
#
# 関連:
#   docs/user_directed_mode.md - user-directed mode の運用詳細
#   scripts/automation/register-sumahon-tasks.ps1 - 旧・タスク登録（非推奨）

$ErrorActionPreference = "Stop"

$Names = @(
  "Sumalabo Sumahon Queue Runner",
  "Sumalabo Claude Pipeline Runner Test"
)

Write-Output "=== すまラボ自動巡回タスクの無効化 (user-directed mode) ==="
Write-Output ""

$results = @()
foreach ($n in $Names) {
  $t = Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue
  if (-not $t) {
    Write-Output ("[skip] not found: " + $n)
    $results += [PSCustomObject]@{ TaskName = $n; Before = "(not found)"; After = "(skipped)" }
    continue
  }
  $before = $t.State
  if ($before -eq "Disabled") {
    Write-Output ("[skip] already Disabled: " + $n)
    $results += [PSCustomObject]@{ TaskName = $n; Before = $before; After = "Disabled" }
    continue
  }
  try {
    Disable-ScheduledTask -TaskName $n -ErrorAction Stop | Out-Null
    $after = (Get-ScheduledTask -TaskName $n).State
    Write-Output ("[ok] " + $n + " : " + $before + " -> " + $after)
    $results += [PSCustomObject]@{ TaskName = $n; Before = $before; After = $after }
  } catch {
    Write-Output ("[error] " + $n + " : " + $_.Exception.Message)
    $results += [PSCustomObject]@{ TaskName = $n; Before = $before; After = ("ERROR: " + $_.Exception.Message) }
  }
}

Write-Output ""
Write-Output "=== 結果 ==="
$results | Format-Table -AutoSize | Out-String | Write-Output

Write-Output ""
Write-Output "再有効化したい場合 (ユーザー判断必須):"
Write-Output "  Enable-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner'"
Write-Output "  Enable-ScheduledTask -TaskName 'Sumalabo Claude Pipeline Runner Test'"
Write-Output ""
Write-Output "タスク自体を削除したい場合 (戻せないので注意):"
Write-Output "  Unregister-ScheduledTask -TaskName 'Sumalabo Sumahon Queue Runner' -Confirm:`$false"
