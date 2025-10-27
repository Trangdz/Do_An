@echo off
echo Killing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Cleaning .next directory...
if exist .next rmdir /s /q .next

echo Starting Next.js...
call npm run dev

