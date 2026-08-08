@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\work\sumalabo-night-runner\scripts\automation\night-watchdog.ps1"
exit /b %errorlevel%
