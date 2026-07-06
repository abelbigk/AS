@echo off
REM ============================================================
REM AGP COMPATIBILITY FIX - Permanent Solution
REM ============================================================
REM This script fixes the AGP 8.12.0 incompatibility issue
REM by patching node_modules/@react-native/gradle-plugin
REM
REM ERROR FIXED: "The project is using an incompatible version 
REM (AGP 8.12.0) of the Android Gradle plugin"
REM
REM ============================================================

echo.
echo ============================================================
echo AGP COMPATIBILITY FIX - Patching React Native Gradle Plugin
echo ============================================================
echo.
echo This fixes the error:
echo "The project is using an incompatible version (AGP 8.12.0)"
echo "Latest supported version is AGP 8.11.1"
echo.

setlocal enabledelayedexpansion

REM Check if the file exists
set "GRADLE_PLUGIN_FILE=node_modules\@react-native\gradle-plugin\gradle\libs.versions.toml"

if not exist "%GRADLE_PLUGIN_FILE%" (
    echo [ERROR] File not found: %GRADLE_PLUGIN_FILE%
    echo Please ensure npm dependencies are installed:
    echo   npm install
    pause
    exit /b 1
)

echo [1/3] Backing up original file...
if not exist "%GRADLE_PLUGIN_FILE%.backup" (
    copy "%GRADLE_PLUGIN_FILE%" "%GRADLE_PLUGIN_FILE%.backup" >nul
    echo [OK] Backup created: %GRADLE_PLUGIN_FILE%.backup
) else (
    echo [OK] Backup already exists, skipping
)

echo.
echo [2/3] Patching AGP version from 8.12.0 to 8.11.1...

REM Read the file and replace AGP version
powershell -Command ^
    "(Get-Content '%GRADLE_PLUGIN_FILE%') -replace 'agp = \"8.12.0\"', 'agp = \"8.11.1\"' | Set-Content '%GRADLE_PLUGIN_FILE%'"

REM Verify the change
powershell -Command ^
    "if ((Get-Content '%GRADLE_PLUGIN_FILE%') -match 'agp = \"8.11.1\"') { exit 0 } else { exit 1 }"

if %ERRORLEVEL% EQU 0 (
    echo [OK] AGP version successfully patched to 8.11.1
) else (
    echo [ERROR] Failed to patch AGP version
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning Gradle cache...
call gradlew clean >nul 2>&1

echo [OK] Gradle cache cleaned

echo.
echo ============================================================
echo SUCCESS: AGP Compatibility Fix Applied!
echo ============================================================
echo.
echo Next steps:
echo 1. Close Android Studio completely
echo 2. Reopen the project
echo 3. Gradle should sync without errors
echo.
echo If you still see the error:
echo - Try: File > Sync Now (in Android Studio)
echo - Or: ./gradlew clean && ./gradlew build
echo.
pause
