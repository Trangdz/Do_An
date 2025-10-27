const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testConnection() {
  console.log('🧪 Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub');
    
    console.log('✅ Connected to MongoDB Atlas');
    
    // Test collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    // Test metadata
    const metadata = await db.collection('metadata').findOne({ key: 'lastIndexedBlock' });
    console.log('📈 Last indexed block:', metadata ? metadata.value : 'Not found');
    
    // Test transactions count
    const txCount = await db.collection('transactions').countDocuments();
    console.log('📝 Total transactions:', txCount);
    
    // Test users count
    const userCount = await db.collection('users').countDocuments();
    console.log('👥 Total users:', userCount);
    
    // Test assets count
    const assetCount = await db.collection('assets').countDocuments();
    console.log('💰 Total assets:', assetCount);
    
    await client.close();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConnection();











