# PowerShell script to copy icon to Android app

Write-Host "Setting up app icons..." -ForegroundColor Green

# Source icon
$sourceIcon = "c:\mycode\ChatGPT Image Jun 26, 2026, 06_40_03 AM.png"

# Copy to web (already done but ensuring)
Copy-Item $sourceIcon "c:\mycode\client\public\icon.png" -Force
Write-Host "Web icon copied" -ForegroundColor Green

# For Android - copy to drawable
Copy-Item $sourceIcon "c:\mycode\android\app\src\main\res\drawable\ic_launcher.png" -Force
Write-Host "Android drawable icon copied" -ForegroundColor Green

# Copy to all mipmap folders
$mipmapFolders = @(
    "mipmap-mdpi",
    "mipmap-hdpi", 
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi"
)

foreach ($folder in $mipmapFolders) {
    $targetPath = "c:\mycode\android\app\src\main\res\$folder"
    Copy-Item $sourceIcon "$targetPath\ic_launcher.png" -Force
    Copy-Item $sourceIcon "$targetPath\ic_launcher_round.png" -Force
    Copy-Item $sourceIcon "$targetPath\ic_launcher_foreground.png" -Force
    Write-Host "Copied to $folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "All icons set up successfully!" -ForegroundColor Green
Write-Host "Your custom icon will appear in:" -ForegroundColor Cyan
Write-Host "  - Browser tab" -ForegroundColor White
Write-Host "  - Android app icon" -ForegroundColor White
Write-Host "  - Android launcher" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. npm run build" -ForegroundColor White
Write-Host "  2. npx cap sync android" -ForegroundColor White
Write-Host "  3. Build APK in Android Studio" -ForegroundColor White
