@echo off
title ЕГЕР ООД — SMS Сервиз
cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║       ЕГЕР ООД — SMS Сервиз          ║
echo   ╚══════════════════════════════════════╝
echo.

:: Check server.js exists in same folder
if not exist "%~dp0server.js" (
  echo   [ГРЕШКА] Не намирам server.js в тази папка.
  echo.
  echo   Уверете се, че start.bat е в същата папка като server.js
  echo   и всички останали файлове на проекта.
  echo.
  pause
  exit /b 1
)

:: Check node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo   [ГРЕШКА] Node.js не е инсталиран.
  echo.
  echo   Изтеглете го от: https://nodejs.org
  echo   Изберете версията LTS, инсталирайте я и стартирайте отново.
  echo.
  pause
  exit /b 1
)

:: Auto-install dependencies on first run
if not exist "%~dp0node_modules" (
  echo   Първо стартиране — инсталиране на зависимости...
  echo.
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo   [ГРЕШКА] npm install се провали.
    pause
    exit /b 1
  )
  echo.
)

:: Start
echo   Сървърът стартира...
echo   За да спрете — затворете този прозорец.
echo.

node server.js

echo.
echo   Сървърът е спрян.
pause
