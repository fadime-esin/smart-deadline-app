@echo off
rem ============================================================
rem  Smart Deadline - makes sure all packages are installed.
rem  Called by the other .bat files; it can also be run on its own.
rem  Must be run from the "mobile" folder.
rem ============================================================
if not exist "node_modules" (
    echo [..] First run on this computer: installing packages. This takes a few minutes...
    call npm install
    if errorlevel 1 exit /b 1
)

rem Handwriting font used for headings (added with the School theme).
if not exist "node_modules\@expo-google-fonts\patrick-hand" (
    echo [..] Installing a new package ^(the handwriting font^)...
    call npm install @expo-google-fonts/patrick-hand
    if errorlevel 1 exit /b 1
)

rem Opens the phone's "Autostart" setting from the reminder setup guide.
if not exist "node_modules\expo-intent-launcher" (
    echo [..] Installing a new package ^(opens phone settings^)...
    call npx expo install expo-intent-launcher
    if errorlevel 1 exit /b 1
)
exit /b 0
