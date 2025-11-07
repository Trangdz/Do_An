const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function checkConnection() {
  console.log('🔍 Kiểm tra kết nối và cấu hình...\n');
  
  // Kiểm tra environment variables
  console.log('📋 Cấu hình môi trường:');
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Đã set' : '❌ Chưa set'}`);
  console.log(`   RPC_URL: ${process.env.RPC_URL ? '✅ Đã set' : '❌ Chưa set'}`);
  console.log(`   LENDING_POOL_ADDRESS: ${process.env.LENDING_POOL_ADDRESS ? '✅ Đã set' : '❌ Chưa set'}`);
  console.log(`   ORACLE_ADDRESS: ${process.env.ORACLE_ADDRESS ? '✅ Đã set' : '❌ Chưa set'}\n`);
  
  // Kiểm tra MongoDB
  console.log('🗄️ Kiểm tra MongoDB...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');
    console.log('   ✅ Kết nối MongoDB thành công');
    
    // Test write
    const testCollection = db.collection('test_connection');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Test connection'
    };
    await testCollection.insertOne(testDoc);
    console.log('   ✅ Ghi dữ liệu test thành công');
    
    // Xóa document test
    await testCollection.deleteOne({ test: true });
    console.log('   ✅ Xóa dữ liệu test thành công');
    
    // Kiểm tra collections
    const collections = await db.listCollections().toArray();
    console.log(`   📊 Số collections: ${collections.length}`);
    if (collections.length > 0) {
      console.log('   Collections:', collections.map(c => c.name).join(', '));
    }
    
    // Kiểm tra dữ liệu hiện có
    const txCount = await db.collection('transactions').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const assetCount = await db.collection('assets').countDocuments();
    
    console.log(`   📝 Transactions: ${txCount}`);
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   💰 Assets: ${assetCount}`);
    
    await client.close();
    console.log('   ✅ Đóng kết nối MongoDB thành công\n');
    
  } catch (error) {
    console.error('   ❌ Lỗi MongoDB:', error.message);
    console.log('   💡 Kiểm tra: MongoDB có đang chạy không? URI có đúng không?\n');
  }
  
  // Kiểm tra RPC connection
  console.log('🔗 Kiểm tra kết nối blockchain (RPC)...');
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Kết nối RPC thành công`);
    console.log(`   📦 Block hiện tại: ${blockNumber}`);
    
    // Kiểm tra network
    const network = await provider.getNetwork();
    console.log(`   🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Kiểm tra LendingPool contract
    if (process.env.LENDING_POOL_ADDRESS) {
      try {
        const poolABI = ['function getReservesList() view returns (address[])'];
        const pool = new ethers.Contract(process.env.LENDING_POOL_ADDRESS, poolABI, provider);
        const reserves = await pool.getReservesList();
        console.log(`   ✅ LendingPool contract hợp lệ`);
        console.log(`   📊 Số reserves: ${reserves.length}`);
      } catch (error) {
        console.log(`   ⚠️ Không thể gọi LendingPool contract: ${error.message}`);
      }
    }
    
    // Kiểm tra Oracle contract
    if (process.env.ORACLE_ADDRESS) {
      try {
        const oracleABI = ['function getAssetPrice1e18(address) view returns (uint256)'];
        const oracle = new ethers.Contract(process.env.ORACLE_ADDRESS, oracleABI, provider);
        console.log(`   ✅ Oracle contract hợp lệ`);
      } catch (error) {
        console.log(`   ⚠️ Không thể kiểm tra Oracle contract: ${error.message}`);
      }
    }
    
    console.log('   ✅ Đóng kết nối RPC thành công\n');
    
  } catch (error) {
    console.error('   ❌ Lỗi RPC:', error.message);
    console.log('   💡 Kiểm tra: Ganache/Node có đang chạy không? RPC_URL có đúng không?\n');
  }
  
  console.log('✅ Hoàn thành kiểm tra!\n');
  console.log('💡 Lệnh hữu ích:');
  console.log('   - Xem lịch sử: node view-history.js');
  console.log('   - Xem lịch sử user: node view-history.js <user_address>');
  console.log('   - Chạy indexer: node index.js\n');
}

checkConnection().catch(console.error);

