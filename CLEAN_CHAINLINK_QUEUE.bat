@echo off
echo ========================================
echo   Clean Chainlink Transaction Queue
echo ========================================
echo.

echo [1/4] Stopping Chainlink container...
docker-compose stop chainlink
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Cleaning old transactions from database...
echo.
echo WARNING: This will delete all pending/unstarted transactions!
echo.
set /p confirm="Are you sure? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo Connecting to PostgreSQL to clean transactions...
docker-compose exec -T postgres psql -U postgres -d postgres -c "DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress');" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Trying alternative method...
    docker-compose exec postgres psql -U postgres -d postgres -c "DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress');"
)

echo.
echo [3/4] Starting Chainlink container...
docker-compose start chainlink
timeout /t 3 /nobreak >nul

echo.
echo [4/4] Checking Chainlink status...
docker-compose ps chainlink

echo.
echo ========================================
echo   Clean Complete!
echo ========================================
echo.
echo Chainlink has been restarted with clean queue.
echo Check logs: docker-compose logs -f chainlink
echo.
pause

