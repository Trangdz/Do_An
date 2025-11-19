@echo off
echo ========================================
echo   Complete Chainlink Reset
echo   (WARNING: This will delete ALL data!)
echo ========================================
echo.
echo This will:
echo   1. Stop all containers
echo   2. Delete PostgreSQL database volume
echo   3. Delete Chainlink data
echo   4. Restart everything fresh
echo.
set /p confirm="Are you ABSOLUTELY sure? Type 'RESET' to continue: "
if not "%confirm%"=="RESET" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo [1/5] Stopping all containers...
docker-compose down
timeout /t 2 /nobreak >nul

echo.
echo [2/5] Removing PostgreSQL volume...
docker volume rm lendhub_v2_pgdata 2>nul
if %errorlevel% neq 0 (
    echo Volume not found or already removed.
)

echo.
echo [3/5] Cleaning Chainlink data directory...
if exist "chainlink-data\*.db" (
    del /q "chainlink-data\*.db" 2>nul
    echo Deleted database files.
)
if exist "chainlink-data\*.log" (
    del /q "chainlink-data\*.log" 2>nul
    echo Deleted log files.
)

echo.
echo [4/5] Starting fresh containers...
docker-compose up -d
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Checking status...
docker-compose ps

echo.
echo ========================================
echo   Reset Complete!
echo ========================================
echo.
echo Chainlink has been completely reset.
echo.
echo IMPORTANT: You need to:
echo   1. Create new Chainlink account (if needed)
echo   2. Add ETH keys
echo   3. Fund Chainlink addresses
echo   4. Re-create jobs
echo.
echo Check logs: docker-compose logs -f chainlink
echo.
pause




