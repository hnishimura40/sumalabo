@echo off
"C:\Program Files\nodejs\node.exe" "__RUNNER_ROOT__\scripts\automation\codex-auth-probe.mjs"
exit /b %errorlevel%
