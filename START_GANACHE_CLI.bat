@echo off
echo Starting Ganache CLI for Chainlink...
echo.
echo Configuration:
echo   - Host: 0.0.0.0 (accessible from Docker)
echo   - Port: 7545
echo   - Network ID: 5777
echo   - Mnemonic: uniform message payment medal rural toward reject resist test immune smile ridge
echo.
ganache --host 0.0.0.0 --port 7545 --networkId 5777 --gasLimit 0x1fffffffffffff --gasPrice 20000000000 --accounts 10 --defaultBalanceEther 1000 --mnemonic "uniform message payment medal rural toward reject resist test immune smile ridge" --db "%CD%\ganache_cli_data"
pause

