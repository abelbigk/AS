@echo off
REM Open Android Project in Android Studio
REM This script finds and opens Android Studio with the Android project

echo Opening Android Studio with Content Organizer React Native Project...
echo.

REM Try common Android Studio locations
set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"

if exist "%STUDIO_PATH%" (
    echo Found Android Studio at: %STUDIO_PATH%
    start "" "%STUDIO_PATH%" "%CD%\android"
    goto end
)

REM Try alternative path
set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"

if exist "%STUDIO_PATH%" (
    echo Found Android Studio at: %STUDIO_PATH%
    start "" "%STUDIO_PATH%" "%CD%\android"
    goto end
)

REM Try AppData location
for /f "tokens=*" %%A in ('dir "%LocalAppData%\JetBrains" /ad /b 2^>nul ^| findstr "AndroidStudio" ^| sort /r ^| findstr /n "." ^| findstr "^1:" ^| cut -c4-') do (
    set "STUDIO_HOME=%LocalAppData%\JetBrains\%%A"
)

if defined STUDIO_HOME (
    echo Found Android Studio at: %STUDIO_HOME%
    for /r "%STUDIO_HOME%" %%F in (studio.exe studio64.exe) do (
        if exist "%%F" (
            start "" "%%F" "%CD%\android"
            goto end
        )
    )
)

REM Fallback: Try to use 'studio' command if it's in PATH
where studio >nul 2>&1
if %errorlevel% equ 0 (
    echo Found Android Studio in PATH
    start studio "%CD%\android"
    goto end
)

echo.
echo ERROR: Could not find Android Studio installation
echo.
echo Please:
echo 1. Ensure Android Studio is installed
echo 2. Try opening manually: File ^> Open ^> C:\mycode3\mobile-rn\android
echo.
pause

:end
echo.
echo Android Studio opening with project...
echo Wait for Gradle sync to complete (5-10 minutes on first load)
echo.
echo Backend should be running in another terminal: npm run dev
echo.
pause
