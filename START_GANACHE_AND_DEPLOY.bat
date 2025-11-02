@echo off
chcp 65001 > nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo   🚀 KHỞI ĐỘNG GANACHE VÀ DEPLOY CONTRACTS
echo ═══════════════════════════════════════════════════════════════
echo.

REM Start Ganache in background and save output
echo 📡 Starting Ganache on port 8545...
start "Ganache" cmd /k "npx ganache --port 8545 --chain.chainId 1337 --wallet.mnemonic "test test test test test test test test test test test junk" --wallet.totalAccounts 10"

echo.
echo ⏳ Waiting 10 seconds for Ganache to start...
timeout /t 10 /nobreak > nul

echo.
echo 📦 Deploying contracts...
call npx hardhat run scripts/deploy_all_in_one.cjs --network ganache

echo.
echo ═══════════════════════════════════════════════════════════════
echo   ✅ DONE! 
echo ═══════════════════════════════════════════════════════════════
echo.
echo 🔑 NEXT: Find the Ganache window and copy Account (0) private key!
echo    Look for window titled "Ganache" in taskbar
echo.
pause










