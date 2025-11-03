@echo off
echo ========================================
echo Starting Ganache with CORRECT Mnemonic
echo ========================================
echo.
echo Mnemonic: test test test test test test test test test test test junk
echo Port: 7545
echo Chain ID: 1337
echo.
echo Press Ctrl+C to stop
echo.

npx ganache --port 7545 --networkId 1337 --chainId 1337 --accounts 10 --defaultBalanceEther 1000 --mnemonic "test test test test test test test test test test test junk" --host 0.0.0.0

pause

