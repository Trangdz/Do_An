@echo off
echo Starting Ganache for Docker/Chainlink...
echo ========================================
echo.
echo Configuration:
echo - Port: 8545
echo - Network ID: 1337
echo - Chain ID: 1337
echo - Host: 0.0.0.0 (accessible from Docker)
echo - Accounts: 10
echo - Balance: 1000 ETH each
echo.
echo Press Ctrl+C to stop
echo.

npx ganache ^
  --port 8545 ^
  --networkId 1337 ^
  --chainId 1337 ^
  --accounts 10 ^
  --defaultBalanceEther 1000 ^
  --mnemonic "test test test test test test test test test test test junk" ^
  --host 0.0.0.0

pause







