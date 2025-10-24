const { MongoClient } = require('mongodb');

async function setupLocalDatabase() {
  // MongoDB local URI
  const localUri = 'mongodb://localhost:27017';
  let client;
  
  try {
    console.log('🔗 Connecting to local MongoDB...');
    client = new MongoClient(localUri);
    await client.connect();
    
    console.log('✅ Connected to local MongoDB');
    
    // Tạo database lendhub_local
    const db = client.db('lendhub_local');
    
    // Tạo collections
    console.log('📁 Creating collections...');
    
    // Collections cần thiết
    const collections = [
      'transactions',
      'users', 
      'assets',
      'metadata'
    ];
    
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          console.log(`ℹ️  Collection already exists: ${collectionName}`);
        } else {
          console.log(`❌ Error creating ${collectionName}:`, error.message);
        }
      }
    }
    
    // Tạo indexes cho performance
    console.log('📊 Creating indexes...');
    
    // Index cho transactions
    try {
      await db.collection('transactions').createIndex({ "user": 1 });
      await db.collection('transactions').createIndex({ "timestamp": -1 });
      await db.collection('transactions').createIndex({ "hash": 1 }, { unique: true });
      console.log('✅ Created indexes for transactions');
    } catch (error) {
      console.log('ℹ️  Indexes may already exist:', error.message);
    }
    
    // Thêm metadata
    console.log('📝 Adding metadata...');
    await db.collection('metadata').insertOne({
      _id: 'system',
      lastIndexedBlock: 0,
      createdAt: new Date(),
      version: '1.0.0',
      description: 'LendHub Local Database'
    });
    
    console.log('✅ Added system metadata');
    
    // Test data
    console.log('🧪 Adding test data...');
    const testTransactions = [
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
    
    await db.collection('transactions').insertMany(testTransactions);
    console.log('✅ Added test transactions');
    
    // Kiểm tra dữ liệu
    console.log('🔍 Verifying data...');
    const transactionCount = await db.collection('transactions').countDocuments();
    console.log(`📊 Total transactions: ${transactionCount}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections created: ${collections.length}`);
    
    console.log('\n🎉 Local MongoDB database setup complete!');
    console.log('📋 Database: lendhub_local');
    console.log('🔗 Connection URI: mongodb://localhost:27017/lendhub_local');
    console.log('📊 Test data: 2 transactions added');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

setupLocalDatabase();
