@echo off
echo ========================================
echo   Check Chainlink Transaction Queue
echo ========================================
echo.

echo Checking transaction queue status...
docker-compose logs --tail=20 chainlink | findstr /C:"Transaction throttling" /C:"in-flight" /C:"unstarted" /C:"Sending transaction" /C:"submitted" /C:"confirmed"

echo.
echo ========================================
echo   Queue Status:
echo ========================================
echo.
echo If you see "Transaction throttling" with decreasing "unstarted" number,
echo it means transactions are being processed!
echo.
echo Wait a few minutes for transactions to be confirmed and queue to clear.
echo.
pause

