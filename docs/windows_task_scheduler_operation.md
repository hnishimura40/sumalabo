# Windows Task Scheduler operation

This document describes the Windows Task Scheduler wrapper for Sumalabo's Sumahon monitoring workflow.

## What is automated

- Start the Sumalabo automation from Windows Task Scheduler.
- Check the working tree and record git status.
- Run `npm.cmd run build`.
- If available in the current branch, run the Sumahon watch queue command:
  `npm.cmd run sumahon:watch -- --max-jobs 1`
- Process at most one queued topic per launch.
- Keep logs under `logs/automation/`.

The standard target is handoff / preview preparation and `human_review_waiting`. Final fact-checking and publish approval remain human decisions.

## Why run only when the user is logged on

The later thumbnail workflow uses Chrome and UWSC. Windows desktop automation needs an interactive user session, so the scheduled task is intended for "run only when the user is logged on".

Edge must not be used. Chrome is the browser for this workflow.

## UWSC

UWSC executable:

`D:\documents\uwsc5302\UWSC.exe`

The thumbnail attachment helper is:

`scripts/automation/chatgpt-attach-base-images.uws`

## Locking

The wrapper uses:

`data/automation/locks/sumahon-queue-runner.lock`

If the lock exists, the wrapper exits safely. The lock is removed in a `finally` block after successful or failed runs.

The Sumahon watch CLI may also use its own lower-level lock. This gives two layers of protection against overlapping runs.

## Logs

Wrapper logs are written to:

`logs/automation/YYYYMMDD-HHMMSS.log`

Check this file first when a scheduled run fails.

## Register today's test schedule

Run from PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\documents\動画作成関連\すまラボ\scripts\automation\register-sumahon-tasks.ps1"
```

This registers:

- 21:30
- 22:30
- 23:30

Task name:

`Sumalabo Sumahon Queue Runner`

## Register production schedule

After the test is confirmed, register the production schedule:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\documents\動画作成関連\すまラボ\scripts\automation\register-sumahon-tasks.ps1" -Production
```

Production times:

- 02:00
- 03:00
- 04:00
- 05:00
- 14:00
- 15:00

## Manual execution

Dry-run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\documents\動画作成関連\すまラボ\scripts\automation\run-sumahon-queue.ps1" -DryRun
```

Normal run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\documents\動画作成関連\すまラボ\scripts\automation\run-sumahon-queue.ps1"
```

## Enable / disable

Disable:

```powershell
Disable-ScheduledTask -TaskName "Sumalabo Sumahon Queue Runner"
```

Enable:

```powershell
Enable-ScheduledTask -TaskName "Sumalabo Sumahon Queue Runner"
```

## Failure checklist

- Check `logs/automation/YYYYMMDD-HHMMSS.log`.
- Confirm the user was logged on.
- Confirm Chrome can be opened.
- Confirm UWSC exists at `D:\documents\uwsc5302\UWSC.exe`.
- Confirm the repo branch has the Sumahon watch script available.
- Confirm `npm.cmd run build` succeeds manually.
- Confirm no stale lock remains under `data/automation/locks/`.

## Current branch note

If `sumahon:watch` is not present in `package.json`, the wrapper logs a notice and exits without processing the queue. Merge or add the watch CLI before production scheduling.
