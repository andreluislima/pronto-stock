@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Instale Node.js LTS pelo site https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalando dependencias na primeira execucao...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)
echo Iniciando o Pronto Stock em uma janela separada...
start "Pronto Stock - Servidor" cmd /k "npm run dev"
echo Abrindo navegador em http://localhost:5173
ping 127.0.0.1 -n 6 >nul
start "" "http://localhost:5173"
echo.
echo Para encerrar, feche a janela "Pronto Stock - Servidor".
