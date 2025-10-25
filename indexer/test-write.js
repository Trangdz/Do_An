const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testWriteData() {
  let client;
  
  try {
    console.log('🧪 Testing MongoDB write operations...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Test 1: Insert a test transaction
    console.log('\n📝 Test 1: Inserting test transaction...');
    const testTransaction = {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      user: '0xc7c744636f70D3ee88141e8a2a44F8225DeE6c76',
      asset: {
        address: '0x853ce536DBbFF984dA79E69BD74248bF4ae4e266',
        symbol: 'WETH',
        decimals: 18
      },
      amount: '1.5',
      amountUSD: 3750.00,
      type: 'Lend',
      timestamp: Date.now(),
      blockNumber: 1404,
      gas: {
        used: '21000',
        price: '20000000000',
        fee: '0.00042'
      },
      status: 'success',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const transactionResult = await db.collection('transactions').insertOne(testTransaction);
    console.log(`✅ Inserted transaction with ID: ${transactionResult.insertedId}`);
    
    // Test 2: Insert a test user
    console.log('\n👤 Test 2: Inserting test user...');
    const testUser = {
      address: '0xc7c744636f70D3ee88141e8a2a44F8225DeE6c76',
      totalTransactions: 1,
      totalVolume: 3750.00,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const userResult = await db.collection('users').updateOne(
      { address: testUser.address },
      { $set: testUser },
      { upsert: true }
    );
    console.log(`✅ Updated user: ${userResult.upsertedId || 'existing user'}`);
    
    // Test 3: Insert a test asset
    console.log('\n💰 Test 3: Inserting test asset...');
    const testAsset = {
      address: '0x853ce536DBbFF984dA79E69BD74248bF4ae4e266',
      symbol: 'WETH',
      decimals: 18,
      totalTransactions: 1,
      totalVolume: 3750.00,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const assetResult = await db.collection('assets').updateOne(
      { address: testAsset.address },
      { $set: testAsset },
      { upsert: true }
    );
    console.log(`✅ Updated asset: ${assetResult.upsertedId || 'existing asset'}`);
    
    // Test 4: Update metadata
    console.log('\n📊 Test 4: Updating metadata...');
    const testMetadata = {
      key: 'lastIndexedBlock',
      value: 1404,
      updatedAt: new Date()
    };
    
    const metadataResult = await db.collection('metadata').updateOne(
      { key: testMetadata.key },
      { $set: testMetadata },
      { upsert: true }
    );
    console.log(`✅ Updated metadata: ${metadataResult.upsertedId || 'existing metadata'}`);
    
    // Test 5: Verify data
    console.log('\n🔍 Test 5: Verifying data...');
    const transactionCount = await db.collection('transactions').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const assetCount = await db.collection('assets').countDocuments();
    const metadataCount = await db.collection('metadata').countDocuments();
    
    console.log(`📊 Results:`);
    console.log(`   Transactions: ${transactionCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Assets: ${assetCount}`);
    console.log(`   Metadata: ${metadataCount}`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

testWriteData();





