@echo off
rem ============================================================
rem  Smart Deadline - builds an installable Android APK.
rem  The build runs on Expo's free cloud build service (EAS Build),
rem  so Android Studio is not needed on this computer.
rem
rem  Needs: this computer logged in to Expo (EXPO_TOKEN).
rem  Time: usually 10-30 minutes (free builds wait in a queue).
rem  At the end, a download link and a QR code for the APK appear.
rem  Open the link on the phone to download and install the APK.
rem ============================================================
title Smart Deadline - APK Build
cd /d "%~dp0mobile"

call "%~dp0setup-packages.bat"
if errorlevel 1 goto :error

rem Upload the project files as they are on disk (ignores Git state).
set EAS_NO_VCS=1

echo [..] Checking the Expo login...
call npx --yes eas-cli@latest whoami
if errorlevel 1 goto :error

echo.
echo [..] Linking the project to Expo (only asks questions the first time).
echo      If asked to create a project, answer Y.
call npx --yes eas-cli@latest init
if errorlevel 1 goto :error

echo.
echo [..] Starting the APK build in the cloud.
echo      If asked to generate a new Android Keystore, answer Y.
echo      Keep this window open until the download link appears.
echo.
call npx --yes eas-cli@latest build --platform android --profile apk
if errorlevel 1 goto :error
goto :end

:error
echo.
echo [ERROR] Something went wrong. Copy the messages above and ask for help.

:end
echo.
pause
