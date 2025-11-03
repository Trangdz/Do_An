@echo off
echo ========================================
echo   LendHub v2 - Deploy with Ganache CLI
echo ========================================
echo.
echo Step 1: Starting Ganache CLI...
echo.
echo Make sure Ganache UI is CLOSED before continuing!
echo.
pause

REM Start Ganache CLI in background
start "Ganache CLI" cmd /k "ganache --host 0.0.0.0 --port 7545 --networkId 5777 --gasLimit 0x1fffffffffffff --gasPrice 20000000000 --deterministic --accounts 10 --defaultBalanceEther 1000 --mnemonic ""uniform message payment medal rural toward reject resist test immune smile ridge"" --db ""%CD%\ganache_cli_data"""

echo.
echo Waiting 5 seconds for Ganache to start...
timeout /t 5 /nobreak >nul

echo.
echo Step 2: Deploying contracts...
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache

echo.
echo Step 3: Setting up Chainlink...
npx hardhat run scripts/setup_chainlink_complete.cjs --network ganache

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Ganache CLI is running in a separate window.
echo To stop it, close that window or press Ctrl+C there.
echo.
pause


