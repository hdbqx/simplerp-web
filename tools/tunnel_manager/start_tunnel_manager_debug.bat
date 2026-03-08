@echo off
setlocal
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
echo [Tunnel Manager] Debug launcher
echo Working dir: %cd%
echo Node:
node -v
echo NPM:
npm -v
echo.
if not exist node_modules (
  echo [1/2] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)
echo [2/2] Starting Electron...
call npm start
echo.
echo [Tunnel Manager] Process exited with code %errorlevel%.
pause
endlocal
