@echo off
echo ========================================
echo   MS Cable Tracker - Docker Startup
echo ========================================
echo.

echo [1/2] Building Docker image...
docker build -t ms-cable-tracker .
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting container...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start container!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Application started successfully!
echo   Open http://localhost:3000 in your browser
echo ========================================
echo.
echo Press any key to view logs (Ctrl+C to exit)...
pause >nul
docker compose logs -f
