@echo off
echo Starting Ganache for Chainlink...
ganache --host 0.0.0.0 --port 7545 --networkId 1337 --gasLimit 0x1fffffffffffff --gasPrice 20000000000 --deterministic --accounts 10 --defaultBalanceEther 1000 --mnemonic "test test test test test test test test test test test junk" --db "%CD%\ganache_data"


