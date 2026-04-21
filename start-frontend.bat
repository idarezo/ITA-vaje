@echo off
title Domovanje - Frontend Starter

echo ============================================
echo  Domovanje - Zagon mikro frontendov
echo ============================================
echo.

echo [1/6] Zaganjam auth-mf        (port 3001)...
start "auth-mf :3001" cmd /k "cd /d "%~dp0frontend\auth-mf" && npm start"

echo [2/6] Zaganjam register-mf    (port 3002)...
start "register-mf :3002" cmd /k "cd /d "%~dp0frontend\register-mf" && npm start"

echo [3/6] Zaganjam property-mf    (port 3031)...
start "property-mf :3031" cmd /k "cd /d "%~dp0frontend\property-mf" && npm start"

echo [4/6] Zaganjam residents-mf   (port 3033)...
start "residents-mf :3033" cmd /k "cd /d "%~dp0frontend\residents-mf" && npm start"

echo [5/6] Zaganjam payment-mf     (port 3035)...
start "payment-mf :3035" cmd /k "cd /d "%~dp0frontend\payment-mf" && npm start"

echo.
echo Cakam 20 sekund, da se MF-ji zazenejo...
timeout /t 20 /nobreak

echo.
echo [6/6] Zaganjam container-app  (port 3000)...
start "container-app :3000" cmd /k "cd /d "%~dp0frontend\container-app" && npm start"

echo.
echo ============================================
echo  Vse storitve so bile zaznane:
echo   http://localhost:3000  - Aplikacija
echo   http://localhost:3001  - auth-mf
echo   http://localhost:3002  - register-mf
echo   http://localhost:3031  - property-mf
echo   http://localhost:3033  - residents-mf
echo   http://localhost:3035  - payment-mf
echo ============================================
echo.
pause
