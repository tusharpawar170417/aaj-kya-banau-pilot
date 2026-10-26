Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "Starting Expo container for Aaj Kya Banau..." -ForegroundColor Cyan

docker compose down -v

docker compose up --build
