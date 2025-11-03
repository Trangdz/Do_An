@echo off
echo ========================================
echo   Checking Ganache Status
echo ========================================
echo.

echo Testing Ganache connection...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:7545,method:'POST',headers:{'Content-Type':'application/json'}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('Chain ID:', chainId); if(chainId==5777) console.log('✅ Chain ID đúng!'); else console.log('❌ Chain ID:', chainId, '(cần 5777)'); }); }); req.on('error',(e)=>console.log('❌ Ganache not ready:', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),3000);"

echo.
echo Checking port 7545...
netstat -an | findstr ":7545"

echo.
pause

