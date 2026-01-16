# PowerShell Script to Create Chrome Extension ZIP Package
# This script packages your extension for Chrome Web Store submission

$extensionName = "linkedin-job-filter-highlighter"
$outputZip = "$extensionName.zip"

# Files and folders to include in the extension package
$filesToInclude = @(
    "manifest.json",
    "content-v2-bundled.js",
    "background.js",
    "popup.html",
    "popup.js",
    "styles.css",
    "assets\icons",
    "src\shared",
    "src\utils"
)

Write-Host "Creating Chrome Extension package..." -ForegroundColor Green
Write-Host ""

# Check if zip already exists and remove it
if (Test-Path $outputZip) {
    Write-Host "Removing existing ZIP file..." -ForegroundColor Yellow
    Remove-Item $outputZip -Force
}

# Create temporary directory for packaging
$tempDir = "temp-extension-package"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files to package..." -ForegroundColor Cyan
Write-Host ""

# Copy each file/folder to temp directory
foreach ($item in $filesToInclude) {
    $sourcePath = Join-Path (Get-Location) $item

    if (Test-Path $sourcePath) {
        if (Test-Path $sourcePath -PathType Container) {
            # It's a directory
            $destPath = Join-Path $tempDir $item
            $destParent = Split-Path $destPath -Parent
            if (-not (Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
            Write-Host "  ✓ Copied folder: $item" -ForegroundColor Green
        } else {
            # It's a file
            $destPath = Join-Path $tempDir $item
            $destParent = Split-Path $destPath -Parent
            if ($destParent -and -not (Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "  ✓ Copied file: $item" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ Not found: $item" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Cyan

# Create ZIP from temp directory
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputZip -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

# Get ZIP file size
$zipSize = (Get-Item $outputZip).Length
$zipSizeMB = [math]::Round($zipSize / 1MB, 2)
$zipSizeKB = [math]::Round($zipSize / 1KB, 0)

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Extension package created successfully!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Package: $outputZip" -ForegroundColor Cyan
Write-Host "📏 Size: $zipSizeKB KB ($zipSizeMB MB)" -ForegroundColor Cyan
Write-Host ""

if ($zipSizeMB -gt 10) {
    Write-Host "⚠️  WARNING: ZIP size exceeds 10MB limit!" -ForegroundColor Red
    Write-Host "   Chrome Web Store maximum size is 10MB" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "✓ Size is within Chrome Web Store 10MB limit" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Chrome Web Store Developer Dashboard" -ForegroundColor White
Write-Host "2. Upload $outputZip" -ForegroundColor White
Write-Host "3. Fill in store listing details" -ForegroundColor White
Write-Host "4. Submit for review" -ForegroundColor White
Write-Host ""
Write-Host "📖 See CHROME-STORE-SUBMISSION-GUIDE.md for detailed instructions" -ForegroundColor Cyan
