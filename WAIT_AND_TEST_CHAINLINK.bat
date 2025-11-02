@echo off
echo ========================================
echo   Testing Chainlink Connection
echo ========================================
echo.
echo Waiting 5 seconds for you to confirm Ganache is running...
timeout /t 5 /nobreak >nul

echo.
echo Step 1: Testing Ganache connection...
node -e "const http = require('http'); const body = JSON.stringify({jsonrpc:'2.0', method:'eth_blockNumber', params:[], id:1}); const req = http.request({hostname:'127.0.0.1', port:8545, method:'POST', headers:{'Content-Type':'application/json'}}, (res) => {let data=''; res.on('data', d => data+=d); res.on('end', () => {const result = JSON.parse(data); const block = parseInt(result.result, 16); console.log('✅ Ganache is running! Block:', block); process.exit(0);});}); req.on('error', (e) => {console.log('❌ Ganache not accessible:', e.message); process.exit(1);}); req.write(body); req.end();"

if errorlevel 1 (
    echo.
    echo ❌ Ganache is not running or not accessible!
    echo Please start Ganache CLI first using START_GANACHE_CLI.bat
    pause
    exit /b 1
)

echo.
echo Step 2: Restarting Chainlink...
docker-compose restart chainlink

echo.
echo Waiting 40 seconds for Chainlink to initialize...
timeout /t 40 /nobreak >nul

echo.
echo Step 3: Testing Chainlink connection...
node scripts/test_chainlink_connection.cjs

echo.
echo Step 4: Checking Chainlink logs...
docker logs chainlink_node --tail 30 | findstr /i "5777 alive reachable connected"

echo.
echo ========================================
echo   Test Complete!
echo ========================================
echo.
echo If EVM Status shows "passing" or you see "alive" in logs, Chainlink is connected!
echo.
pause


