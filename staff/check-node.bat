@echo off
cd /d "%~dp0"
title ЕГЕР ООД — Инсталация

:: Check if node is already installed
where node >nul 2>&1
if %errorlevel% == 0 goto START

echo.
echo  Инсталиране на Node.js (само един път)...
echo.

:: Download and silently install Node.js LTS
curl -o node_installer.msi https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
msiexec /i node_installer.msi /quiet /norestart
del node_installer.msi

:: Refresh PATH
call refreshenv 2>nul
set "PATH=%PATH%;C:\Program Files\nodejs"

:START
echo.
echo  Инсталиране на зависимости...
call npm install --prefix "%~dp0"

echo.
echo  Стартиране...
start "" http://localhost:3000
node "%~dp0server.js"

pause