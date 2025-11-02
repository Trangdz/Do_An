@echo off
echo ========================================
echo   DEPLOY CONTRACTS VA FIX JOBS
echo ========================================
echo.
echo 1. Dang deploy contracts...
call npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
echo.
echo 2. Dang authorize node...
call npx hardhat run scripts/setup_chainlink_complete.cjs --network ganache
echo.
echo 3. Dang tao jobs moi...
call node scripts/fix_encode_final.cjs
echo.
echo ✅ HOAN TAT! Jobs se chay trong 1 phut
echo.
pause



