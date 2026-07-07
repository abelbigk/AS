@echo off
REM Fix AGP compatibility issue
REM React Native 0.86.0 hardcodes AGP 8.12.0, but Android Studio 2024.x only supports up to 8.11.1

echo Fixing AGP version compatibility...

REM Find and patch the file
set "file=node_modules\@react-native\gradle-plugin\gradle\libs.versions.toml"

if exist "%file%" (
    powershell -Command "(Get-Content '%file%') -replace 'agp = \"8.12.0\"', 'agp = \"8.11.1\"' | Set-Content '%file%'"
    echo.
    echo ✓ AGP version fixed: 8.12.0 → 8.11.1
    echo.
    echo Run in Android Studio:
    echo   File → Sync Now (or Ctrl+Shift+A → Sync)
    echo.
) else (
    echo ✗ File not found: %file%
    echo Make sure you're in the app directory with node_modules installed.
)

pause
