@echo off
echo ========================================
echo   Clean Chainlink Queue (Simple)
echo ========================================
echo.

echo Stopping Chainlink...
docker-compose stop chainlink
timeout /t 2 /nobreak >nul

echo.
echo Deleting pending transactions from database...
docker-compose exec -T postgres psql -U postgres -d postgres -c "DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress'); SELECT 'Deleted transactions. Remaining: ' || COUNT(*) FROM eth_txes;"

echo.
echo Starting Chainlink...
docker-compose start chainlink

echo.
echo Done! Check logs: docker-compose logs -f chainlink
pause




