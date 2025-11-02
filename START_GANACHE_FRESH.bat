@echo off
echo ========================================
echo Starting Fresh Ganache Blockchain
echo ========================================
echo.
echo This will start Ganache with:
echo - Port: 8545
echo - Chain ID: 1337
echo - Network ID: 1337
echo - 10 accounts with 1000 ETH each
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

