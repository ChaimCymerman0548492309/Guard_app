# Install all monorepo dependencies (required before EAS / Expo on Windows).
# Uses your existing Node/npm to bootstrap pnpm once, then pnpm install.
# Run from repo root in PowerShell:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\install-monorepo.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Ensure-PnpmOnPath {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        return $true
    }

    $npmGlobal = Join-Path $env:APPDATA "npm"
    if (Test-Path $npmGlobal) {
        $env:Path = "$npmGlobal;$env:Path"
    }
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        return $true
    }

    $pnpmCmd = Join-Path $npmGlobal "pnpm.cmd"
    if (Test-Path $pnpmCmd) {
        Set-Alias -Name pnpm -Value $pnpmCmd -Scope Script -Force
        return $true
    }

    return $false
}

if (-not (Ensure-PnpmOnPath)) {
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        Write-Host "==> Enabling pnpm via corepack (Node $(node -v))..." -ForegroundColor Yellow
        corepack enable
        corepack prepare pnpm@10.33.3 --activate
    }
}

if (-not (Ensure-PnpmOnPath)) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "==> Installing pnpm globally with npm $(npm -v)..." -ForegroundColor Yellow
        npm install -g pnpm@10.33.3
    }
}

if (-not (Ensure-PnpmOnPath)) {
    Write-Host "ERROR: Could not run pnpm after install." -ForegroundColor Red
    Write-Host "  Close PowerShell, open a new window, cd to repo root, run:" -ForegroundColor Yellow
    Write-Host "    pnpm -v" -ForegroundColor Yellow
    Write-Host "  Then: .\scripts\install-monorepo.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "==> Using pnpm $(pnpm -v)" -ForegroundColor Green
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
