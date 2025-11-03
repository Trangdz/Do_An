@echo off
echo ========================================
echo   FIX HOAN CHINH: DEPLOY CONTRACTS MOI
echo ========================================
echo.
echo ⚠️  CAN RESTART GANACHE DE CO ETH MOI!
echo.
echo Buoc 1: Dung Ganache hien tai (Ctrl+C)
echo Buoc 2: Chay lai Ganache:
echo    npx ganache --server.host 0.0.0.0 --server.port 7545 --chain.chainId 5777 --chain.networkId 5777
echo.
echo Sau do nhan phim bat ky de tiep tuc...
pause
echo.
echo 2. Deploy contracts moi...
call npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
echo.
echo 3. Authorize node...
call npx hardhat run scripts/setup_chainlink_complete.cjs --network ganache
echo.
echo 4. Tao jobs...
call node scripts/fix_encode_final.cjs
echo.
echo ✅ HOAN TAT! Cho 1-2 phut de jobs chay
echo.
pause



