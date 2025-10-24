const { MongoClient } = require('mongodb');

async function createDatabaseQuick() {
  const uri = 'mongodb://localhost:27017';
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('lendhub_local');
    console.log('✅ Connected to lendhub_local database');
    
    // 1. Tạo collections
    console.log('📁 Creating collections...');
    const collections = ['transactions', 'users', 'assets', 'metadata'];
    
    for (const name of collections) {
      try {
        await db.createCollection(name);
        console.log(`✅ Created: ${name}`);
      } catch (e) {
        console.log(`ℹ️  ${name} already exists`);
      }
    }
    
    // 2. Tạo indexes cho transactions
    console.log('📊 Creating indexes...');
    const txCollection = db.collection('transactions');
    
    try {
      await txCollection.createIndex({ "user": 1 });
      await txCollection.createIndex({ "timestamp": -1 });
      await txCollection.createIndex({ "hash": 1 }, { unique: true });
      await txCollection.createIndex({ "blockNumber": 1 });
      await txCollection.createIndex({ "type": 1 });
      console.log('✅ Created transaction indexes');
    } catch (e) {
      console.log('ℹ️  Indexes may already exist');
    }
    
    // 3. Thêm metadata
    console.log('📝 Adding metadata...');
    await db.collection('metadata').replaceOne(
      { _id: 'system' },
      {
        _id: 'system',
        lastIndexedBlock: 0,
        createdAt: new Date(),
        version: '1.0.0',
        description: 'LendHub Local Database'
      },
      { upsert: true }
    );
    console.log('✅ Added system metadata');
    
    // 4. Thêm test data
    console.log('🧪 Adding test data...');
    const testData = [
      {
        hash: '0x1234567890abcdef1234567890abcdef12345678',
        type: 'Lend',
        user: '0xabcdef1234567890abcdef1234567890abcdef12',
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
        hash: '0x2345678901bcdef1234567890abcdef1234567890',
        type: 'Borrow',
        user: '0xbcdef1234567890abcdef1234567890abcdef1234',
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
    
    await txCollection.insertMany(testData);
    console.log('✅ Added 2 test transactions');
    
    // 5. Kiểm tra kết quả
    console.log('🔍 Verifying...');
    const count = await txCollection.countDocuments();
    const collections = await db.listCollections().toArray();
    
    console.log('\n🎉 Database setup complete!');
    console.log(`📊 Transactions: ${count}`);
    console.log(`📁 Collections: ${collections.length}`);
    console.log('🔗 URI: mongodb://localhost:27017/lendhub_local');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

createDatabaseQuick();
