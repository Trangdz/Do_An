@echo off
echo ========================================
echo   Hardhat Node for Chainlink
echo ========================================
echo.
echo Starting Hardhat node with WebSocket support...
echo This will use the 'ganache' network config from hardhat.config.cjs
echo.
echo IMPORTANT: Make sure Ganache CLI is STOPPED!
echo.

REM Use hardhat node command (better WebSocket support than Ganache)
REM Hardhat node by default uses Chain ID 31337, but we'll configure it
npx hardhat node --hostname 0.0.0.0 --port 7545

pause

