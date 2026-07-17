# Deploy RescueLink backend to Railway with OTP env vars.
# Prerequisite: run `npx @railway/cli login` first.

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendRoot

Write-Host "Checking Railway login..."
npx --yes @railway/cli whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: npx @railway/cli login"
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-Host "Missing backend/.env — copy from railway.env.example and fill in secrets."
  exit 1
}

Write-Host "Setting Railway variables from backend/.env..."
Write-Host "(Skip FIREBASE_SERVICE_ACCOUNT here if it fails - paste it in Railway dashboard Variables instead.)"
Get-Content ".env" | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  if ($line -match "^([^=]+)=(.*)$") {
    $name = $matches[1].Trim()
    if ($name -eq "FIREBASE_SERVICE_ACCOUNT") {
      Write-Host "  -> $name (via stdin, parsed from .env file)"
      node -e "const fs=require('fs'); for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) { if (line.startsWith('FIREBASE_SERVICE_ACCOUNT=')) { process.stdout.write(line.slice('FIREBASE_SERVICE_ACCOUNT='.length)); break; } }" |
        npx --yes @railway/cli variables set FIREBASE_SERVICE_ACCOUNT --stdin 2>$null
      return
    }
    if ($name -eq "NODE_ENV") {
      $value = "production"
    } else {
      $value = $matches[2].Trim()
      if ($value -match '^".*"$') { $value = $value.Trim('"') }
    }
    Write-Host "  -> $name"
    npx --yes @railway/cli variables set "$name=$value" 2>$null
  }
}

Write-Host ""
Write-Host "IMPORTANT: In Railway dashboard, add variable FIREBASE_SERVICE_ACCOUNT"
Write-Host "  (copy the single-line JSON from backend/.env)"
Write-Host ""

Write-Host "Deploying to Railway..."
npx --yes @railway/cli up --detach

Write-Host "Fetching public URL..."
$domain = npx --yes @railway/cli domain 2>$null
if ($domain) {
  $url = if ($domain -match "^https?://") { $domain.Trim() } else { "https://$($domain.Trim())" }
  Write-Host "Railway URL: $url"
  Write-Host "OTP status: $url/api/otp/status"

  $frontendEnv = Join-Path (Split-Path $BackendRoot -Parent) "frontend\.env"
  @(
    "EXPO_PUBLIC_API_URL=$url"
    "EXPO_PUBLIC_USE_RAILWAY=1"
  ) | Set-Content -Path $frontendEnv -Encoding utf8
  Write-Host "Wrote frontend/.env with EXPO_PUBLIC_API_URL"
  Write-Host "Restart Expo (npx expo start) to use Railway for OTP."
} else {
  Write-Host "Deploy started. In Railway dashboard: generate a domain, then set frontend/.env EXPO_PUBLIC_API_URL."
}
