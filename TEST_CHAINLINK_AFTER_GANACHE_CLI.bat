@echo off
echo ========================================
echo   Testing Chainlink Connection
echo ========================================
echo.

echo Step 1: Restarting Chainlink...
docker-compose restart chainlink
echo Waiting 30 seconds for Chainlink to start...
timeout /t 30 /nobreak >nul

echo.
echo Step 2: Testing connection...
node scripts/test_chainlink_connection.cjs

echo.
echo Step 3: Checking Chainlink logs...
docker logs chainlink_node --tail 50 | findstr /i "5777 alive reachable connected"

echo.
echo ========================================
echo   Test Complete!
echo ========================================
echo.
echo If EVM Status shows "passing" or "alive", Chainlink is connected!
echo If still "failing", check Ganache CLI is running and accessible.
echo.
pause


