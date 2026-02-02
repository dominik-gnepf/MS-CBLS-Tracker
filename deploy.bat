@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   MS Cable Tracker - Docker Deployment
echo ========================================
echo.
echo NOTE: All building happens inside Docker.
echo       Full reset on every deploy.
echo.

:: Check if Docker is installed
echo [1/6] Checking Docker installation...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed or not in PATH!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo        Docker found.

:: Check if Docker daemon is running
echo [2/6] Checking Docker daemon...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker daemon is not running!
    echo Please start Docker Desktop and wait for it to initialize.
    pause
    exit /b 1
)
echo        Docker daemon is running.

:: Stop and remove existing container
echo [3/6] Stopping and removing existing container...
docker compose down --volumes --remove-orphans >nul 2>&1
docker rm -f ms-cable-tracker >nul 2>&1
echo        Done.

:: Remove ALL related images
echo [4/6] Removing all related images...
docker rmi ms-cable-tracker >nul 2>&1
docker rmi ms-cbls-tracker-ms-cable-tracker >nul 2>&1
docker image prune -f >nul 2>&1
echo        Done.

:: Clear Docker build cache
echo [5/6] Clearing Docker build cache...
docker builder prune -af >nul 2>&1
echo        Done.

:: Build the Docker image with no cache
echo [6/6] Building Docker image (this may take several minutes)...
echo.
docker build -t ms-cable-tracker . --no-cache --progress=plain
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Docker build failed!
    echo ========================================
    echo.
    echo Common issues:
    echo   - Check your internet connection
    echo   - Ensure all source files are present
    echo   - Check Dockerfile syntax
    echo.
    pause
    exit /b 1
)
echo.
echo        Build successful.

:: Start the container
echo.
echo Starting container...
docker compose up -d --force-recreate
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Failed to start container!
    echo ========================================
    echo.
    pause
    exit /b 1
)

:: Wait for health check
echo.
echo Waiting for application to be ready...
set /a retries=0
set /a max_retries=30

:healthcheck
timeout /t 2 /nobreak >nul

:: Try curl first, then powershell as fallback
curl -s http://localhost:3000/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    goto :ready
)

:: Fallback to powershell if curl not available
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    goto :ready
)

set /a retries+=1
if !retries! LSS !max_retries! (
    echo        Waiting... (!retries!/!max_retries!)
    goto :healthcheck
)
echo WARNING: Health check timed out. Container may still be starting.

:ready
echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo   Application URL: http://localhost:3000
echo.
echo   Useful commands:
echo     - View logs:     docker compose logs -f
echo     - Stop:          docker compose down
echo     - Restart:       docker compose restart
echo.
echo ========================================

:: Show container status
echo.
echo Container Status:
docker compose ps
echo.

:: Ask to open browser
set /p openbrowser="Open application in browser? (Y/N): "
if /i "%openbrowser%"=="Y" (
    start http://localhost:3000
)

:: Ask to view logs
echo.
set /p viewlogs="View application logs? (Y/N): "
if /i "%viewlogs%"=="Y" (
    docker compose logs -f
)

endlocal
