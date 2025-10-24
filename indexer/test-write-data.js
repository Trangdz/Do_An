const { MongoClient } = require('mongodb');

async function testWriteData() {
  console.log('🧪 Testing data writing to MongoDB...');
  
  const uri = 'mongodb://localhost:27017';
  let client;
  
  try {
    // Kết nối
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Chọn database
    const db = client.db('lendhub_local');
    console.log('📊 Using database: lendhub_local');
    
    // Test 1: Kiểm tra quyền ghi
    console.log('\n1️⃣ Testing write permissions...');
    try {
      const testCollection = db.collection('test_write');
      const result = await testCollection.insertOne({
        test: 'write_permission',
        timestamp: new Date(),
        random: Math.random()
      });
      console.log('✅ Write permission OK:', result.insertedId);
      
      // Xóa test data
      await testCollection.deleteOne({ _id: result.insertedId });
      console.log('✅ Delete permission OK');
    } catch (e) {
      console.log('❌ Write permission failed:', e.message);
      return;
    }
    
    // Test 2: Ghi vào transactions collection
    console.log('\n2️⃣ Testing transactions collection...');
    const txCollection = db.collection('transactions');
    
    // Xóa dữ liệu cũ nếu có
    await txCollection.deleteMany({});
    console.log('🧹 Cleared old data');
    
    // Thêm dữ liệu mới
    const newTransactions = [
      {
        hash: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'Lend',
        user: '0x' + Math.random().toString(16).substr(2, 40),
        asset: {
          address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472',
          symbol: 'USDC',
          decimals: 6
        },
        amount: '1000.0',
        amountUSD: 1000.0,
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: 1001,
        status: 'success',
        gas: '21000'
      },
      {
        hash: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'Borrow',
        user: '0x' + Math.random().toString(16).substr(2, 40),
        asset: {
          address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          symbol: 'WETH',
          decimals: 18
        },
        amount: '5.0',
        amountUSD: 10000.0,
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        blockNumber: 1002,
        status: 'success',
        gas: '25000'
      }
    ];
    
    const insertResult = await txCollection.insertMany(newTransactions);
    console.log('✅ Inserted transactions:', insertResult.insertedIds);
    
    // Test 3: Đọc dữ liệu vừa ghi
    console.log('\n3️⃣ Verifying written data...');
    const count = await txCollection.countDocuments();
    console.log(`📊 Total transactions: ${count}`);
    
    const allTxs = await txCollection.find({}).toArray();
    console.log('📄 All transactions:');
    allTxs.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.type} - ${tx.amount} ${tx.asset.symbol} - ${tx.user.slice(0, 10)}...`);
    });
    
    // Test 4: Cập nhật metadata
    console.log('\n4️⃣ Updating metadata...');
    const metadataCollection = db.collection('metadata');
    await metadataCollection.replaceOne(
      { _id: 'system' },
      {
        _id: 'system',
        lastIndexedBlock: 1002,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        description: 'LendHub Local Database',
        transactionCount: count
      },
      { upsert: true }
    );
    console.log('✅ Metadata updated');
    
    // Test 5: Kiểm tra indexes
    console.log('\n5️⃣ Checking indexes...');
    const indexes = await txCollection.indexes();
    console.log('📊 Indexes:', indexes.length);
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 Data writing test completed successfully!');
    console.log(`📊 Database now contains ${count} transactions`);
    console.log('🔗 Ready for indexer and frontend');
    
  } catch (error) {
    console.error('❌ Data writing failed:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('not authorized')) {
      console.log('\n💡 Permission issue - try running as administrator');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB not running - start service first');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testWriteData();
