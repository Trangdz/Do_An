const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testMongoConnection() {
  let client;
  
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MongoDB URI not configured in config.env');
      return;
    }
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Test write operation
    console.log('\n📝 Testing write operation...');
    const testDoc = {
      test: true,
      timestamp: Date.now(),
      message: 'Test connection from script'
    };
    
    const writeResult = await db.collection('test').insertOne(testDoc);
    console.log('✅ Write test successful:', writeResult.insertedId);
    
    // Test read operation
    console.log('\n📖 Testing read operation...');
    const testRead = await db.collection('test').findOne({ _id: writeResult.insertedId });
    console.log('✅ Read test successful:', testRead);
    
    // Check transactions collection
    console.log('\n📊 Checking transactions collection...');
    const transactionCount = await db.collection('transactions').countDocuments();
    console.log(`📈 Total transactions: ${transactionCount}`);
    
    if (transactionCount > 0) {
      const recentTx = await db.collection('transactions').findOne({}, { sort: { timestamp: -1 } });
      console.log('📋 Most recent transaction:');
      console.log(`   Type: ${recentTx.type}`);
      console.log(`   User: ${recentTx.user}`);
      console.log(`   Asset: ${recentTx.asset?.symbol || 'Unknown'}`);
      console.log(`   Amount: ${recentTx.amount} ${recentTx.asset?.symbol || ''}`);
      console.log(`   USD: $${recentTx.amountUSD}`);
      console.log(`   Time: ${new Date(recentTx.timestamp * 1000).toLocaleString()}`);
    }
    
    // Clean up test document
    await db.collection('test').deleteOne({ _id: writeResult.insertedId });
    console.log('🧹 Cleaned up test document');
    
    console.log('\n✅ MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

testMongoConnection();

