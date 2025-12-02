@echo off
chcp 65001 >nul
echo ========================================
echo   🔧 KHẮC PHỤC LỖI CHAINLINK QUEUE
echo   (252/250 transactions queued)
echo ========================================
echo.

echo [1/6] 🔍 Kiểm tra Ganache (port 7545)...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:7545,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{try{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('✅ Ganache đang chạy! Chain ID:', chainId);}catch(e){console.log('❌ Phản hồi không hợp lệ');}}); }); req.on('error',(e)=>console.log('❌ Ganache KHÔNG chạy:', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),2000);"
timeout /t 2 /nobreak >nul

echo.
echo [2/6] 🔍 Kiểm tra Hardhat (port 8545)...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:8545,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{try{const r=JSON.parse(data); const chainId = parseInt(r.result,16); console.log('✅ Hardhat đang chạy! Chain ID:', chainId);}catch(e){console.log('⚠️  Hardhat không chạy (OK nếu dùng Ganache)');}}); }); req.on('error',(e)=>console.log('⚠️  Hardhat không chạy (OK nếu dùng Ganache)')); req.write(body); req.end(); setTimeout(()=>process.exit(),2000);"
timeout /t 2 /nobreak >nul

echo.
echo [3/6] 📋 Kiểm tra Chainlink container...
docker ps --filter "name=chainlink" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [4/6] 🔄 Khởi động lại Chainlink để áp dụng config mới...
docker-compose restart chainlink
timeout /t 5 /nobreak >nul

echo.
echo [5/6] 📊 Kiểm tra logs Chainlink (20 dòng cuối)...
echo ----------------------------------------
docker-compose logs --tail=20 chainlink
echo ----------------------------------------

echo.
echo [6/6] 🔍 Kiểm tra pending transactions trong Ganache...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0',method:'txpool_content',params:[],id:1}); const req = http.request({hostname:'127.0.0.1',port:7545,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}}, (res) => { let data = ''; res.on('data',(chunk)=>data+=chunk); res.on('end',()=>{try{const r=JSON.parse(data); if(r.result && r.result.pending){const pending = Object.keys(r.result.pending).length; console.log('📝 Pending transactions trong Ganache:', pending);}else{console.log('✅ Không có pending transactions');}}catch(e){console.log('⚠️  Không thể kiểm tra (có thể Ganache không hỗ trợ txpool_content)');}}); }); req.on('error',(e)=>console.log('⚠️  Không thể kiểm tra:', e.message)); req.write(body); req.end(); setTimeout(()=>process.exit(),2000);"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   ✅ HOÀN TẤT
echo ========================================
echo.
echo 📌 CÁC BƯỚC TIẾP THEO:
echo.
echo 1. Nếu Ganache/Hardhat KHÔNG chạy:
echo    → Khởi động Ganache: ganache-cli -p 7545
echo    → Hoặc Hardhat: npx hardhat node --port 8545
echo.
echo 2. Theo dõi logs Chainlink:
echo    → docker-compose logs -f chainlink
echo.
echo 3. Kiểm tra Chainlink UI:
echo    → http://localhost:6688
echo    → Vào tab "Transactions" để xem queue
echo.
echo 4. Nếu vẫn lỗi, kiểm tra:
echo    → ETH node có đang broadcast transactions không
echo    → Kết nối mạng giữa Chainlink và ETH node
echo    → Chainlink có đủ ETH để gửi transactions không
echo.
pause













