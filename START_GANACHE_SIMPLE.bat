@echo off
echo ========================================
echo   Starting Ganache CLI (Simple)
echo ========================================
echo.

echo Stopping existing Ganache processes...
taskkill /IM node.exe /F /FI "WINDOWTITLE eq ganache*" 2>NUL
timeout /t 2 /nobreak >NUL

echo.
echo Starting Ganache on port 8545...
echo Host: 0.0.0.0 (accessible from Docker)
echo Network ID: 5777
echo Chain ID: 5777
echo.

start "Ganache CLI" cmd /k "cd /d %~dp0 && npx ganache --server.host 0.0.0.0 --server.port 8545 --chain.chainId 5777 --chain.networkId 5777 --miner.blockGasLimit 0x1fffffffffffff --miner.defaultGasPrice 20000000000 --wallet.totalAccounts 10 --wallet.defaultBalance 1000 --wallet.mnemonic ""dwarf virtual cotton sudden uncover initial true apple call prepare inquiry west"""

echo.
echo ✅ Ganache window opened!
echo.
echo ⏳ Waiting 20 seconds for Ganache to start...
timeout /t 20 /nobreak

echo.
echo Testing connection...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:8545,method:'POST',headers:{'Content-Type':'application/json'}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('Chain ID:', chainId); if(chainId==5777) console.log('✅ Ganache is ready!'); else console.log('⚠️ Chain ID:', chainId, '(cần 5777)'); }); }); req.on('error',(e)=>console.log('❌ Ganache not ready:', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),5000);"

echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo 1. Check Ganache window - should see "Listening on 0.0.0.0:8545"
echo 2. If Ganache is ready, restart Chainlink:
echo    docker-compose restart chainlink
echo 3. Check Chainlink logs:
echo    docker logs chainlink_node --tail 50
echo.
pause

