@echo off
echo ========================================
echo   Ganache CLI for Docker (Chainlink)
echo ========================================
echo.
echo IMPORTANT: Must bind on 0.0.0.0 for Docker access!
echo.
echo Configuration:
echo   - Host: 0.0.0.0 (accessible from Docker)
echo   - Port: 8545 (default)
echo   - Network ID: 5777
echo   - WebSocket: Enabled (default)
echo   - Mnemonic: uniform message payment medal rural toward reject resist test immune smile ridge
echo.
echo Make sure to stop any existing Ganache on port 8545 first!
echo.
pause

npx ganache --server.host 0.0.0.0 --server.port 8545 --chain.chainId 5777 --chain.networkId 5777 --miner.blockGasLimit 0x1fffffffffffff --miner.defaultGasPrice 20000000000 --wallet.totalAccounts 10 --wallet.defaultBalance 1000 --wallet.mnemonic "uniform message payment medal rural toward reject resist test immune smile ridge"

pause

