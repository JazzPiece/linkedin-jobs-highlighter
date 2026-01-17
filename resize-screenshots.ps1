# PowerShell Script to Resize Screenshots to Exactly 1280x800 for Chrome Web Store
# This script forces exact dimensions without maintaining aspect ratio

# Add required assembly for image processing
Add-Type -AssemblyName System.Drawing

# Define input and output paths
$inputFolder = "C:\Users\young\OneDrive\Desktop\Learn\Code\linkedin-jobs-highlighter\assets\screenshots"
$outputFolder = "C:\Users\young\OneDrive\Desktop\Learn\Code\linkedin-jobs-highlighter\assets\screenshots\resized"

# Create output folder if it doesn't exist
if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

# Target dimensions required by Chrome Web Store
$targetWidth = 1280
$targetHeight = 800
  
# List of screenshot files to resize
$screenshots = @(
    "01-filterworking.png",
    "02-hidecollapse.png",
    "03-hidesettings.png",
    "04-highlightList.png",
    "05-highlightsetting.png"
)

Write-Host "Starting screenshot resize process..." -ForegroundColor Green
Write-Host "Target dimensions: ${targetWidth}x${targetHeight}" -ForegroundColor Cyan
Write-Host ""

foreach ($filename in $screenshots) {
    $inputPath = Join-Path $inputFolder $filename

    if (-not (Test-Path $inputPath)) {
        Write-Host "ERROR: File not found - $filename" -ForegroundColor Red
        continue
    }

    try {
        Write-Host "Processing: $filename" -ForegroundColor Yellow

        # Load the original image
        $image = [System.Drawing.Image]::FromFile($inputPath)
        $originalWidth = $image.Width
        $originalHeight = $image.Height

        Write-Host "  Original size: ${originalWidth}x${originalHeight}" -ForegroundColor Gray

        # Create new bitmap with exact target dimensions
        $newImage = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)

        # Create graphics object for drawing
        $graphics = [System.Drawing.Graphics]::FromImage($newImage)

        # Set high quality rendering
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        # Draw the original image stretched/compressed to exact dimensions
        $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)

        # Save the resized image
        $outputPath = Join-Path $outputFolder $filename
        $newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

        Write-Host "  Resized to: ${targetWidth}x${targetHeight}" -ForegroundColor Green
        Write-Host "  Saved to: $outputPath" -ForegroundColor Green
        Write-Host ""

        # Clean up
        $graphics.Dispose()
        $newImage.Dispose()
        $image.Dispose()

    } catch {
        Write-Host "ERROR processing $filename : $_" -ForegroundColor Red
    }
}

Write-Host "Screenshot resize complete!" -ForegroundColor Green
Write-Host "Resized images saved to: $outputFolder" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check the resized-screenshots folder" -ForegroundColor White
Write-Host "2. Verify images look acceptable (may be slightly stretched)" -ForegroundColor White
Write-Host "3. Upload these resized images to Chrome Web Store" -ForegroundColor White
