@echo off
echo ========================================
echo   Clean All Pending Transactions
echo ========================================
echo.

echo Current transaction status:
docker-compose exec -T postgres psql -U postgres -d postgres -c "SELECT state, COUNT(*) as count FROM eth_txes GROUP BY state ORDER BY state;"

echo.
echo Stopping Chainlink...
docker-compose stop chainlink
timeout /t 2 /nobreak >nul

echo.
echo Deleting ALL pending transactions (unstarted, in_progress, unconfirmed)...
docker-compose exec -T postgres psql -U postgres -d postgres -c "DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress', 'unconfirmed');"

echo.
echo Remaining transactions:
docker-compose exec -T postgres psql -U postgres -d postgres -c "SELECT state, COUNT(*) as count FROM eth_txes GROUP BY state ORDER BY state;"

echo.
echo Starting Chainlink...
docker-compose start chainlink
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Clean Complete!
echo ========================================
echo.
echo Chainlink restarted with clean queue.
echo Check logs: docker-compose logs -f chainlink
echo.
pause



