const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function viewHistory() {
  console.log('📖 Đang tải lịch sử giao dịch...\n');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');
    
    console.log('✅ Đã kết nối đến MongoDB\n');
    
    // Lấy tổng số giao dịch
    const totalTx = await db.collection('transactions').countDocuments();
    console.log(`📊 Tổng số giao dịch: ${totalTx}\n`);
    
    if (totalTx === 0) {
      console.log('⚠️ Chưa có giao dịch nào trong database');
      await client.close();
      return;
    }
    
    // Lấy các giao dịch mới nhất (giới hạn 20)
    console.log('📝 20 giao dịch mới nhất:\n');
    console.log('═'.repeat(120));
    
    const transactions = await db.collection('transactions')
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();
    
    transactions.forEach((tx, index) => {
      const date = new Date(tx.timestamp);
      console.log(`\n${index + 1}. ${tx.type.toUpperCase()}`);
      console.log(`   Hash: ${tx.hash}`);
      console.log(`   User: ${tx.user}`);
      console.log(`   Asset: ${tx.asset.symbol} (${tx.asset.address})`);
      console.log(`   Amount: ${parseFloat(tx.amount).toFixed(6)} ${tx.asset.symbol}`);
      console.log(`   USD Value: $${parseFloat(tx.amountUSD).toFixed(2)}`);
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   Time: ${date.toLocaleString('vi-VN')}`);
      console.log(`   Gas: ${tx.gas?.used || 'N/A'}`);
      console.log('   ' + '-'.repeat(116));
    });
    
    // Thống kê theo loại giao dịch
    console.log('\n\n📈 Thống kê theo loại giao dịch:\n');
    const stats = await db.collection('transactions').aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountUSD' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} giao dịch - Tổng giá trị: $${parseFloat(stat.totalAmount).toFixed(2)}`);
    });
    
    // Thống kê users
    console.log('\n👥 Thống kê users:\n');
    const userCount = await db.collection('users').countDocuments();
    console.log(`   Tổng số users: ${userCount}`);
    
    const topUsers = await db.collection('users')
      .find({})
      .sort({ totalVolume: -1 })
      .limit(5)
      .toArray();
    
    if (topUsers.length > 0) {
      console.log('\n   Top 5 users theo volume:');
      topUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.address}`);
        console.log(`      Transactions: ${user.totalTransactions || 0}`);
        console.log(`      Volume: $${parseFloat(user.totalVolume || 0).toFixed(2)}`);
      });
    }
    
    // Thống kê assets
    console.log('\n💰 Thống kê assets:\n');
    const assetCount = await db.collection('assets').countDocuments();
    console.log(`   Tổng số assets: ${assetCount}`);
    
    const topAssets = await db.collection('assets')
      .find({})
      .sort({ totalVolume: -1 })
      .limit(5)
      .toArray();
    
    if (topAssets.length > 0) {
      console.log('\n   Top 5 assets theo volume:');
      topAssets.forEach((asset, index) => {
        console.log(`   ${index + 1}. ${asset.symbol} (${asset.address})`);
        console.log(`      Transactions: ${asset.totalTransactions || 0}`);
        console.log(`      Volume: $${parseFloat(asset.totalVolume || 0).toFixed(2)}`);
      });
    }
    
    // Last indexed block
    console.log('\n📦 Trạng thái indexer:\n');
    const lastBlock = await db.collection('metadata').findOne({ key: 'lastIndexedBlock' });
    console.log(`   Block mới nhất đã index: ${lastBlock ? lastBlock.value : 'Chưa có'}`);
    
    await client.close();
    console.log('\n✅ Hoàn thành!\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

// Hỗ trợ query theo user address
const userAddress = process.argv[2];

if (userAddress) {
  // Query lịch sử của một user cụ thể
  async function viewUserHistory(address) {
    console.log(`📖 Đang tải lịch sử của user: ${address}\n`);
    
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db('lendhub_local');
      
      const userTx = await db.collection('transactions')
        .find({ user: address })
        .sort({ timestamp: -1 })
        .toArray();
      
      if (userTx.length === 0) {
        console.log(`⚠️ Không tìm thấy giao dịch nào cho user: ${address}`);
        await client.close();
        return;
      }
      
      console.log(`📊 Tìm thấy ${userTx.length} giao dịch:\n`);
      console.log('═'.repeat(120));
      
      userTx.forEach((tx, index) => {
        const date = new Date(tx.timestamp);
        console.log(`\n${index + 1}. ${tx.type.toUpperCase()}`);
        console.log(`   Hash: ${tx.hash}`);
        console.log(`   Asset: ${tx.asset.symbol}`);
        console.log(`   Amount: ${parseFloat(tx.amount).toFixed(6)} ${tx.asset.symbol}`);
        console.log(`   USD Value: $${parseFloat(tx.amountUSD).toFixed(2)}`);
        console.log(`   Block: ${tx.blockNumber}`);
        console.log(`   Time: ${date.toLocaleString('vi-VN')}`);
        console.log('   ' + '-'.repeat(116));
      });
      
      await client.close();
      console.log('\n✅ Hoàn thành!\n');
      
    } catch (error) {
      console.error('❌ Lỗi:', error.message);
      process.exit(1);
    }
  }
  
  viewUserHistory(userAddress);
} else {
  viewHistory();
}































