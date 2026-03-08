@echo off
setlocal
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
if not exist node_modules (
  echo [Tunnel Manager] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [Tunnel Manager] npm install failed.
    pause
    exit /b 1
  )
)
echo [Tunnel Manager] Starting app...
call npm start
if errorlevel 1 (
  echo [Tunnel Manager] App start failed.
  pause
)
endlocal
