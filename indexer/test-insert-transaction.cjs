const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testInsertTransaction() {
  console.log('🧪 Testing transaction insertion...');
  console.log('📊 MongoDB URI:', process.env.MONGODB_URI);
  
  let client;
  
  try {
    // Kết nối database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    console.log('📊 Using database: lendhub_local');
    
    // Kiểm tra collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    // Test insert transaction
    const testTransaction = {
      hash: '0x' + Math.random().toString(16).substr(2, 40),
      type: 'TestInsert',
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
      gas: '21000',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📝 Inserting test transaction...');
    const result = await db.collection('transactions').insertOne(testTransaction);
    console.log('✅ Transaction inserted:', result.insertedId);
    
    // Kiểm tra dữ liệu sau insert
    const count = await db.collection('transactions').countDocuments();
    console.log(`📊 Total transactions: ${count}`);
    
    // Lấy transaction vừa insert
    const insertedTx = await db.collection('transactions').findOne({ _id: result.insertedId });
    console.log('📄 Inserted transaction:');
    console.log(`  - Hash: ${insertedTx.hash}`);
    console.log(`  - Type: ${insertedTx.type}`);
    console.log(`  - User: ${insertedTx.user}`);
    console.log(`  - Amount: ${insertedTx.amount} ${insertedTx.asset.symbol}`);
    console.log(`  - Block: ${insertedTx.blockNumber}`);
    
    // Test update metadata
    console.log('\n📝 Updating metadata...');
    await db.collection('metadata').replaceOne(
      { _id: 'system' },
      {
        _id: 'system',
        lastIndexedBlock: 9999,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        description: 'LendHub Local Database',
        transactionCount: count
      },
      { upsert: true }
    );
    console.log('✅ Metadata updated');
    
    console.log('\n🎉 Transaction insertion test successful!');
    console.log('✅ Database operations working correctly');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testInsertTransaction();
