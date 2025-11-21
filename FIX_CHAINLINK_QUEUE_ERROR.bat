@echo off
echo ========================================
echo   Fix Chainlink Queue Error
echo   (MaxQueued exceeded)
echo ========================================
echo.

echo [1/5] Checking Ganache status (port 7545)...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:7545,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{try{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('✅ Ganache is running! Chain ID:', chainId);}catch(e){console.log('❌ Invalid response');}}); }); req.on('error',(e)=>console.log('❌ Ganache NOT running:', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),2000);"
timeout /t 2 /nobreak >nul

echo.
echo [2/5] Checking Hardhat status (port 8545)...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:8545,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{try{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('✅ Hardhat is running! Chain ID:', chainId);}catch(e){console.log('❌ Invalid response');}}); }); req.on('error',(e)=>console.log('⚠️  Hardhat NOT running (this is OK if using Ganache):', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),2000);"
timeout /t 2 /nobreak >nul

echo.
echo [3/5] Checking Chainlink container status...
docker ps --filter "name=chainlink" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [4/5] Restarting Chainlink container to apply new config...
docker-compose restart chainlink
timeout /t 3 /nobreak >nul

echo.
echo [5/5] Checking Chainlink logs (last 20 lines)...
echo ----------------------------------------
docker-compose logs --tail=20 chainlink
echo ----------------------------------------

echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo 1. If Ganache/Hardhat is NOT running:
echo    - Start Ganache: ganache-cli -p 7545
echo    - Or start Hardhat: npx hardhat node --port 8545
echo.
echo 2. Monitor Chainlink logs:
echo    docker-compose logs -f chainlink
echo.
echo 3. Check Chainlink UI:
echo    http://localhost:6688
echo.
echo 4. If still having issues, check ETH node logs
echo    and ensure it's broadcasting transactions
echo.
pause






