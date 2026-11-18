@echo off
rem ============================================================
rem  Smart Deadline - runs the automated tests.
rem ============================================================
title Smart Deadline - Tests
cd /d "%~dp0mobile"

call "%~dp0setup-packages.bat"
if errorlevel 1 (
    echo [ERROR] The packages could not be installed. Copy the messages above and ask for help.
    goto :end
)

echo [..] Running the tests...
echo.
call npx jest
if errorlevel 1 (
    echo.
    echo [FAILED] Some tests did not pass. Copy the output above and ask for help.
) else (
    echo.
    echo [PASSED] All tests passed.
)

:end
echo.
pause
