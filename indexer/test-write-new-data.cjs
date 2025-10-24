const { MongoClient } = require('mongodb');

async function testWriteNewData() {
  console.log('🧪 Testing writing new data to database...');
  
  const uri = 'mongodb://localhost:27017';
  let client;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    const txCollection = db.collection('transactions');
    
    // Kiểm tra dữ liệu hiện tại
    const currentCount = await txCollection.countDocuments();
    console.log(`📊 Current transactions: ${currentCount}`);
    
    // Thêm dữ liệu mới
    const newTransaction = {
      hash: '0x' + Math.random().toString(16).substr(2, 40),
      type: 'Repay',
      user: '0x' + Math.random().toString(16).substr(2, 40),
      asset: {
        address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472',
        symbol: 'USDC',
        decimals: 6
      },
      amount: '500.0',
      amountUSD: 500.0,
      timestamp: Math.floor(Date.now() / 1000),
      blockNumber: 1003,
      status: 'success',
      gas: '22000'
    };
    
    console.log('📝 Adding new transaction...');
    const result = await txCollection.insertOne(newTransaction);
    console.log('✅ New transaction added:', result.insertedId);
    
    // Kiểm tra dữ liệu sau khi thêm
    const newCount = await txCollection.countDocuments();
    console.log(`📊 Total transactions after insert: ${newCount}`);
    
    // Lấy dữ liệu mới nhất
    const latestTx = await txCollection.findOne({}, { sort: { timestamp: -1 } });
    console.log('📄 Latest transaction:');
    console.log(`  - Hash: ${latestTx.hash}`);
    console.log(`  - Type: ${latestTx.type}`);
    console.log(`  - Amount: ${latestTx.amount} ${latestTx.asset.symbol}`);
    console.log(`  - User: ${latestTx.user}`);
    
    console.log('\n🎉 Data writing test successful!');
    console.log('✅ Database is working correctly');
    
  } catch (error) {
    console.error('❌ Error writing data:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testWriteNewData();
