const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...');
  
  let client;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Kiểm tra transactions
    const txCount = await db.collection('transactions').countDocuments();
    console.log(`📊 Total transactions: ${txCount}`);
    
    // Lấy 5 transactions gần nhất
    const recentTxs = await db.collection('transactions')
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    console.log('\n📄 Recent transactions:');
    recentTxs.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'} - ${tx.hash.slice(0, 10)}...`);
      console.log(`   User: ${tx.user}`);
      console.log(`   Amount USD: $${tx.amountUSD}`);
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   Asset: ${tx.asset?.address}`);
      console.log('');
    });
    
    // Kiểm tra metadata
    const metadata = await db.collection('metadata').findOne({ _id: 'system' });
    if (metadata) {
      console.log('📝 System metadata:');
      console.log(`  - Last indexed block: ${metadata.lastIndexedBlock}`);
      console.log(`  - Transaction count: ${metadata.transactionCount || 'N/A'}`);
      console.log(`  - Version: ${metadata.version}`);
    }
    
    // Kiểm tra collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
    }
    
    console.log('\n🎉 Database status check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

checkDatabaseStatus();
