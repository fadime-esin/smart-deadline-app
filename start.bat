@echo off
rem ============================================================
rem  Smart Deadline - starts the development server.
rem  Scan the QR code with the Expo Go app on your phone.
rem  Phone and computer must be on the same Wi-Fi.
rem  To stop, close this window.
rem ============================================================
title Smart Deadline - Development Server
cd /d "%~dp0mobile"

call "%~dp0setup-packages.bat"
if errorlevel 1 goto :error

echo [..] Starting the development server...
echo      When the QR code appears, scan it with Expo Go on your phone.
echo.
rem -c clears the bundler cache on every start (a few seconds slower, but avoids
rem "Cannot find native module" errors from stale cached files).
call npx expo start -c
goto :end

:error
echo.
echo [ERROR] Something went wrong. Copy the messages above and ask for help.

:end
echo.
pause
