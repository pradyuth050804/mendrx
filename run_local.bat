@echo off
title MendRx - Local Launcher
echo ============================================================
echo                MendRx Local Development Launcher
echo ============================================================
echo.

:: ---- GCP Credentials ----
set GOOGLE_APPLICATION_CREDENTIALS=d:\KeyFalcon\mendrx\mendrx-be-main\mendrx-gcp-key.json

:: ---- Backend ----
echo [1/2] Starting Backend (Spring Boot on port 8080)...
echo.
start "MendRx Backend" cmd /k "cd /d d:\KeyFalcon\mendrx\mendrx-be-main && set ""GOOGLE_APPLICATION_CREDENTIALS=d:\KeyFalcon\mendrx\mendrx-be-main\mendrx-gcp-key.json"" && echo Starting Spring Boot with local profile... && call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local"

:: Wait a few seconds for backend to begin starting
timeout /t 10 /nobreak >nul

:: ---- Frontend ----
echo [2/2] Starting Frontend (Next.js on port 3000)...
echo.
start "MendRx Frontend" cmd /k "cd /d d:\KeyFalcon\mendrx\mendrx-fe-main && echo Installing dependencies... && call npm install && echo. && echo Starting Next.js dev server... && call npm run dev"

echo.
echo ============================================================
echo  Both services are starting in separate windows!
echo.
echo  Backend:  http://localhost:8080
echo  Health:   http://localhost:8080/actuator/health
echo  Frontend: http://localhost:3000
echo ============================================================
echo.
echo Press any key to close this launcher window...
pause >nul
