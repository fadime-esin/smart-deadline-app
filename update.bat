@echo off
rem ============================================================
rem  Smart Deadline - downloads the latest version of the project
rem  from GitHub and updates the files in this folder.
rem  Installed packages (node_modules) are kept, so start.bat and
rem  build-apk.bat can be used right afterwards.
rem
rem  Files in this folder that are not on GitHub are removed, so
rem  the folder always matches the GitHub version exactly.
rem ============================================================
setlocal
title Smart Deadline - Update from GitHub

rem The update can replace this file too, so a copy in the temp folder does the work.
if /i not "%~1"=="--run" (
    copy /y "%~f0" "%TEMP%\smart-deadline-update.bat" >nul
    "%TEMP%\smart-deadline-update.bat" --run "%~dp0"
)

set "TARGET=%~2"
if "%TARGET:~-1%"=="\" set "TARGET=%TARGET:~0,-1%"
set "REPO=fadime-esin/smart-deadline-app"
set "ZIP=%TEMP%\smart-deadline-main.zip"
set "WORK=%TEMP%\smart-deadline-update"
set "SRC=%WORK%\smart-deadline-app-main"
set "OLDLOCK=%TEMP%\smart-deadline-old-lock.json"

echo [..] Downloading the latest version from GitHub...
if exist "%WORK%" rmdir /s /q "%WORK%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/%REPO%/archive/refs/heads/main.zip' -OutFile '%ZIP%'; Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%WORK%' -Force"
if errorlevel 1 goto :error
if not exist "%SRC%\mobile\package.json" goto :error

rem Remember the current package list, to see afterwards whether packages changed.
if exist "%OLDLOCK%" del /q "%OLDLOCK%"
if exist "%TARGET%\mobile\package-lock.json" copy /y "%TARGET%\mobile\package-lock.json" "%OLDLOCK%" >nul

echo [..] Updating the project files...
robocopy "%SRC%" "%TARGET%" /MIR /XD node_modules .expo .git android ios /XF expo-env.d.ts /NFL /NDL /NJH /NJS /NP >nul
rem robocopy reports success with exit codes 0 to 7.
if errorlevel 8 goto :error

rem Install packages only when the package list has changed.
if not exist "%TARGET%\mobile\node_modules" goto :cleanup
fc /b "%OLDLOCK%" "%TARGET%\mobile\package-lock.json" >nul 2>&1
if not errorlevel 1 goto :cleanup
echo [..] The package list has changed: installing packages. This can take a few minutes...
pushd "%TARGET%\mobile"
call npm install
if errorlevel 1 (
    popd
    goto :error
)
popd

:cleanup
rmdir /s /q "%WORK%" 2>nul
del /q "%ZIP%" "%OLDLOCK%" 2>nul
echo.
echo [OK] The project is up to date with GitHub.
echo      You can now use start.bat, start-tunnel.bat or build-apk.bat.
goto :end

:error
echo.
echo [ERROR] The update did not finish. Check the internet connection,
echo         then copy the messages above and ask for help.

:end
echo.
pause
exit
