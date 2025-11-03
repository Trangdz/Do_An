@echo off
echo ========================================
echo   WebSocket Proxy for Chainlink
echo ========================================
echo.
echo This proxy converts WebSocket requests from Chainlink
echo to HTTP requests for Ganache/Hardhat node
echo.
echo Make sure Ganache/Hardhat is running on port 7545 first!
echo.
pause

node scripts/websocket_proxy.js

pause


