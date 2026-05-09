$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

Write-Output "[sumalabo] Running Sumahon watch from $projectRoot"
npm.cmd run sumahon:watch -- @args
