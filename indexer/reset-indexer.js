const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function resetIndexer() {
  let client;
  
  try {
    console.log('🔄 Resetting Indexer...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Reset lastIndexedBlock to 0
    console.log('\n📝 Resetting lastIndexedBlock to 0...');
    await db.collection('metadata').updateOne(
      { key: 'lastIndexedBlock' },
      { 
        $set: { 
          key: 'lastIndexedBlock', 
          value: 0, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );
    console.log('✅ Reset lastIndexedBlock to 0');
    
    // Clear existing transactions (optional)
    console.log('\n🗑️ Clearing existing transactions...');
    const deleteResult = await db.collection('transactions').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} transactions`);
    
    // Clear existing users (optional)
    console.log('\n🗑️ Clearing existing users...');
    const deleteUsersResult = await db.collection('users').deleteMany({});
    console.log(`✅ Deleted ${deleteUsersResult.deletedCount} users`);
    
    // Keep assets (don't delete them)
    console.log('\n💰 Keeping existing assets...');
    const assetCount = await db.collection('assets').countDocuments();
    console.log(`✅ Kept ${assetCount} assets`);
    
    console.log('\n✅ Indexer reset completed!');
    console.log('🚀 Now you can start the indexer again:');
    console.log('   node index.js');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

resetIndexer();














