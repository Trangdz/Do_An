@echo off
echo ========================================
echo   Starting Hardhat Node for Chainlink
echo ========================================
echo.
echo Configuration:
echo   - Host: 0.0.0.0 (accessible from Docker)
echo   - Port: 8545
echo   - Network: ganache
echo   - Chain ID: 5777
echo   - WebSocket: Enabled
echo.
echo Make sure Ganache CLI is STOPPED before starting!
echo.
pause

REM Start Hardhat node
npx hardhat node --host 0.0.0.0 --port 8545 --network ganache

pause


