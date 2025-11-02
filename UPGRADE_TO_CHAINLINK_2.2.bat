@echo off
echo ========================================
echo   UPGRADE TO CHAINLINK 2.2.0
echo ========================================
echo.
echo 1. Stopping containers...
docker-compose down
echo.
echo 2. Removing old Chainlink database volume...
docker volume rm lendhub_v2_pgdata -f 2>nul
echo.
echo 3. Starting Chainlink 2.2.0...
docker-compose up -d
echo.
echo 4. Waiting for Chainlink to be ready...
timeout /t 10 /nobreak >nul
echo.
echo ✅ Upgrade complete!
echo.
echo Next steps:
echo   - Run: node scripts/fix_encode_final.cjs
echo   - Run: npx hardhat run scripts/setup_chainlink_complete.cjs --network ganache
echo.
pause



