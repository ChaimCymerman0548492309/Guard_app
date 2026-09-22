# Install all monorepo dependencies (required before EAS / Expo on Windows).
# Run from repo root in PowerShell:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\install-monorepo.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        Write-Host "pnpm not on PATH — enabling via corepack..." -ForegroundColor Yellow
        corepack enable
        corepack prepare pnpm@10.33.3 --activate
    }
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm not found." -ForegroundColor Red
    Write-Host "  Install Node.js LTS, then run ONE of:" -ForegroundColor Yellow
    Write-Host "    corepack enable" -ForegroundColor Yellow
    Write-Host "    corepack prepare pnpm@10.33.3 --activate" -ForegroundColor Yellow
    Write-Host "  OR: npm install -g pnpm" -ForegroundColor Yellow
    Write-Host "  Close and reopen PowerShell, then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "==> pnpm install (repo root)..." -ForegroundColor Cyan
pnpm install --ignore-scripts

Write-Host "==> Building workspace packages for mobile..." -ForegroundColor Cyan
pnpm --filter @guardian/shared build
pnpm --filter @guardian/ui build
pnpm --filter @guardian/risk-engine build
pnpm --filter @guardian/simulator build

$pluginApp = Join-Path $Root "apps\mobile\node_modules\expo-localization\app.plugin.js"
$pluginRoot = Join-Path $Root "node_modules\expo-localization\app.plugin.js"

if ((Test-Path $pluginApp) -or (Test-Path $pluginRoot)) {
    Write-Host "OK: expo-localization config plugin found." -ForegroundColor Green
} else {
    Write-Host "ERROR: expo-localization still missing after install." -ForegroundColor Red
    Write-Host "Try: Remove-Item -Recurse -Force node_modules; pnpm install" -ForegroundColor Yellow
    exit 1
}

Write-Host "Done. Next: set EXPO_TOKEN and run .\scripts\eas-preview-android.ps1" -ForegroundColor Green
