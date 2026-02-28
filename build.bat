@echo off
cd /d "%~dp0"
echo  NEON PLATFORMER - Build App
echo ================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from: https://nodejs.org
    echo  Install it, then run this file again.
    pause
    exit /b 1
)

echo  Step 1/3 - Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo  npm install failed. & pause & exit /b 1 )

echo.
echo  Step 2/3 - Creating icon...
node create-icon.js
if %errorlevel% neq 0 ( echo  Icon creation failed. & pause & exit /b 1 )

echo.
echo  Step 3/3 - Building installer...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist
if %errorlevel% neq 0 ( echo  Build failed. & pause & exit /b 1 )

echo.
echo  Done! Your installer is in the dist\ folder.
echo  Look for: NEON PLATFORMER Setup.exe
echo.
pause
