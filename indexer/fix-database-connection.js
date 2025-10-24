const { MongoClient } = require('mongodb');

async function fixDatabaseConnection() {
  console.log('🔧 Fixing database connection...');
  
  // Test 1: Kiểm tra MongoDB service
  console.log('\n1️⃣ Checking MongoDB service...');
  try {
    const { exec } = require('child_process');
    exec('Get-Service -Name "*mongo*"', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Cannot check service:', error.message);
      } else {
        console.log('✅ Service status:', stdout);
      }
    });
  } catch (e) {
    console.log('ℹ️  Service check skipped');
  }
  
  // Test 2: Kiểm tra kết nối cơ bản
  console.log('\n2️⃣ Testing basic connection...');
  const uri = 'mongodb://localhost:27017';
  let client;
  
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test 3: Kiểm tra database
    console.log('\n3️⃣ Checking database...');
    const db = client.db('lendhub_local');
    
    // Tạo database nếu chưa có
    console.log('📁 Creating database structure...');
    
    // Tạo collections
    const collections = ['transactions', 'users', 'assets', 'metadata'];
    for (const name of collections) {
      try {
        await db.createCollection(name);
        console.log(`✅ Created collection: ${name}`);
      } catch (e) {
        if (e.code === 48) {
          console.log(`ℹ️  Collection exists: ${name}`);
        } else {
          console.log(`❌ Error creating ${name}:`, e.message);
        }
      }
    }
    
    // Test 4: Thêm dữ liệu test
    console.log('\n4️⃣ Testing data insertion...');
    const testData = {
      hash: '0x' + Math.random().toString(16).substr(2, 40),
      type: 'Test',
      user: '0x' + Math.random().toString(16).substr(2, 40),
      asset: {
        address: '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472',
        symbol: 'USDC',
        decimals: 6
      },
      amount: '100.0',
      amountUSD: 100.0,
      timestamp: Math.floor(Date.now() / 1000),
      blockNumber: 9999,
      status: 'success',
      gas: '21000'
    };
    
    const result = await db.collection('transactions').insertOne(testData);
    console.log('✅ Test data inserted:', result.insertedId);
    
    // Test 5: Đọc dữ liệu
    console.log('\n5️⃣ Testing data retrieval...');
    const count = await db.collection('transactions').countDocuments();
    console.log(`📊 Total documents: ${count}`);
    
    const sample = await db.collection('transactions').findOne();
    console.log('📄 Sample document:', {
      hash: sample?.hash,
      type: sample?.type,
      user: sample?.user,
      asset: sample?.asset?.symbol
    });
    
    // Test 6: Tạo indexes
    console.log('\n6️⃣ Creating indexes...');
    try {
      await db.collection('transactions').createIndex({ "user": 1 });
      await db.collection('transactions').createIndex({ "timestamp": -1 });
      await db.collection('transactions').createIndex({ "hash": 1 }, { unique: true });
      console.log('✅ Indexes created successfully');
    } catch (e) {
      console.log('ℹ️  Indexes may already exist');
    }
    
    // Test 7: Metadata
    console.log('\n7️⃣ Adding metadata...');
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
    console.log('✅ Metadata added');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('🔗 Connection URI: mongodb://localhost:27017/lendhub_local');
    console.log('📊 Ready for indexer and frontend');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solutions:');
      console.log('1. Start MongoDB service:');
      console.log('   net start MongoDB');
      console.log('2. Check if MongoDB is running:');
      console.log('   mongosh --eval "db.adminCommand(\'ping\')"');
      console.log('3. Install MongoDB if missing:');
      console.log('   winget install MongoDB.Server');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

fixDatabaseConnection();
