# Generate Android upload keystore for Play Console.
# Run from hizmet_app/android directory:
#   cd hizmet_app\android
#   .\generate-keystore.ps1
#
# The keystore is created at app\upload-keystore.jks because the Gradle
# signingConfigs block resolves storeFile relative to the :app module dir.
# After this completes:
#   1. Copy key.properties.example -> key.properties
#   2. Fill in the storePassword + keyPassword you typed below
#   3. Backup BOTH key.properties AND app\upload-keystore.jks
#      (Bitwarden, encrypted drive, etc.) — losing them means you can
#      never publish updates to this app on Play Store.

$ErrorActionPreference = "Stop"

$keystorePath = "app\upload-keystore.jks"

if (Test-Path $keystorePath) {
  Write-Host "$keystorePath already exists. Aborting to prevent overwrite." -ForegroundColor Red
  Write-Host "If you intend to replace it, move/rename the existing file first." -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path "app")) {
  Write-Host "app\ directory not found. Run this script from hizmet_app\android." -ForegroundColor Red
  exit 1
}

keytool -genkey -v `
  -keystore $keystorePath `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias upload

if ($LASTEXITCODE -ne 0) {
  Write-Host "keytool failed (exit $LASTEXITCODE). Is JDK installed and on PATH?" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Keystore created: $keystorePath" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy key.properties.example -> key.properties"
Write-Host "  2. Fill in your passwords (storePassword + keyPassword)"
Write-Host "  3. Backup BOTH files (Bitwarden, encrypted drive, etc.)"
Write-Host "  4. cd .. ; flutter build appbundle --release"
