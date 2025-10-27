@echo off
echo 🚀 Starting LendHub Indexer...
echo.

cd indexer

echo 📦 Installing dependencies...
call npm install

echo.
echo 🔧 Testing connection...
call npm test

echo.
echo 🚀 Starting indexer...
call npm run dev

pause











