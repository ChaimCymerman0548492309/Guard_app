# EAS preview APK build (PowerShell). Run from repo root.
#   $env:EXPO_TOKEN = "paste_token_only"
#   .\scripts\eas-preview-android.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $env:EXPO_TOKEN) {
    Write-Host "ERROR: Set EXPO_TOKEN first (Expo access token, no 'Bearer ' prefix)." -ForegroundColor Red
    Write-Host "  https://expo.dev/settings/access-tokens" -ForegroundColor Yellow
    exit 1
}

if ($env:EXPO_TOKEN -match "^Bearer") {
    Write-Host "ERROR: Do not include 'Bearer ' in EXPO_TOKEN." -ForegroundColor Red
    exit 1
}

& (Join-Path $Root "scripts\install-monorepo.ps1")
if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    exit $LASTEXITCODE
}

Write-Host "==> Verifying Expo config..." -ForegroundColor Cyan
Set-Location (Join-Path $Root "apps\mobile")
npx expo config --type public | Out-Null

Write-Host "==> EAS Android preview build..." -ForegroundColor Cyan
npx eas-cli@latest build --platform android --profile preview --non-interactive --wait

Write-Host ""
Write-Host "Install link: expo.dev -> project guardian -> Builds" -ForegroundColor Green
