@echo off
echo 🚀 Setting up LendHub MongoDB...
echo.

echo 📋 Prerequisites:
echo - MongoDB Atlas account
echo - Ganache blockchain running
echo - LendHub contracts deployed
echo.

echo 🔧 Configuration steps:
echo 1. Update indexer/config.env with your MongoDB Atlas URI
echo 2. Update contract addresses in config.env
echo 3. Run start-indexer.bat to start the indexer
echo.

echo 📊 Database setup:
echo - Database: lendhub
echo - Collections: transactions, users, assets, metadata
echo - Indexes: Auto-created by indexer
echo.

echo 🎯 Next steps:
echo 1. Start Ganache blockchain
echo 2. Deploy LendHub contracts
echo 3. Update config.env with contract addresses
echo 4. Run start-indexer.bat
echo 5. Test with transactions on frontend
echo.

pause





