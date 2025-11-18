@echo off
echo ========================================
echo   Complete Fix: Writer + Unsuspend + Clean
echo ========================================
echo.

echo [1/4] Setting correct writer in contract...
npx hardhat run scripts/fix_writer_and_unsuspend.cjs --network ganache

echo.
echo [2/4] Stopping Chainlink...
docker-compose stop chainlink
timeout /t 2 /nobreak >nul

echo.
echo [3/4] Cleaning all transactions and unsuspending jobs in database...
docker-compose exec -T postgres psql -U postgres -d postgres -c "DELETE FROM eth_txes; UPDATE jobs SET suspended = false WHERE suspended = true;"

echo.
echo [4/4] Starting Chainlink...
docker-compose start chainlink
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Fix Complete!
echo ========================================
echo.
echo Check logs: docker-compose logs -f chainlink
echo Check UI: http://localhost:6688
echo.
pause

