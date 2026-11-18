@echo off
rem ============================================================
rem  Smart Deadline - starts the development server in TUNNEL mode.
rem  Use this when the phone is NOT on the same Wi-Fi as this
rem  computer (e.g. friends trying the app from home).
rem  Scan the QR code with Expo Go. Keep this window open while
rem  the app is being used; to stop, close this window.
rem
rem  Uses Expo's own tunnel, which needs this computer to be logged
rem  in to Expo (EXPO_TOKEN). If it is not, the ngrok tunnel is
rem  used instead, which needs no account.
rem ============================================================
title Smart Deadline - Tunnel Server
cd /d "%~dp0mobile"

call "%~dp0setup-packages.bat"
if errorlevel 1 goto :error

echo [..] Checking the Expo login...
rem findstr succeeds (errorlevel 0) only if the text "Not logged in" is printed.
call npx expo whoami 2>&1 | findstr /C:"Not logged in" >nul
if not errorlevel 1 goto :ngrok

echo [..] Starting the development server through Expo's tunnel...
echo      When the QR code appears, it works from any network.
echo.
rem -c clears the bundler cache on every start (see start.bat).
call npx expo start --tunnel -c
goto :end

:ngrok
echo [..] Not logged in to Expo, so the ngrok tunnel is used instead.
if not exist "node_modules\@expo\ngrok" (
    echo [..] Installing the tunnel tool ^(one time only^)...
    call npm install --save-dev @expo/ngrok
    if errorlevel 1 goto :error
)
echo [..] Starting the development server through an ngrok tunnel...
echo      When the QR code appears, it works from any network.
echo.
call npx expo start --tunnel ngrok -c
goto :end

:error
echo.
echo [ERROR] Something went wrong. Copy the messages above and ask for help.

:end
echo.
pause
