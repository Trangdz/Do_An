const { MongoClient } = require('mongodb');

async function checkLocalConnection() {
  const uri = 'mongodb://localhost:27017';
  let client;
  
  try {
    console.log('🔗 Testing connection to MongoDB local...');
    console.log('📍 URI:', uri);
    
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Successfully connected to MongoDB local!');
    
    // Kiểm tra database lendhub_local
    const db = client.db('lendhub_local');
    console.log('📊 Database: lendhub_local');
    
    // Liệt kê collections
    console.log('\n📁 Collections:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ No collections found - database is empty');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  - ${collection.name}: ${count} documents`);
      }
    }
    
    // Kiểm tra transactions collection
    console.log('\n🔍 Checking transactions:');
    const txCount = await db.collection('transactions').countDocuments();
    console.log(`📊 Total transactions: ${txCount}`);
    
    if (txCount > 0) {
      const sampleTx = await db.collection('transactions').findOne();
      console.log('📄 Sample transaction:');
      console.log(`  - Hash: ${sampleTx?.hash}`);
      console.log(`  - Type: ${sampleTx?.type}`);
      console.log(`  - User: ${sampleTx?.user}`);
      console.log(`  - Asset: ${sampleTx?.asset?.symbol}`);
      console.log(`  - Amount: ${sampleTx?.amount}`);
    }
    
    // Kiểm tra metadata
    console.log('\n📝 Checking metadata:');
    const metadata = await db.collection('metadata').findOne({ _id: 'system' });
    if (metadata) {
      console.log(`  - Last indexed block: ${metadata.lastIndexedBlock}`);
      console.log(`  - Version: ${metadata.version}`);
      console.log(`  - Created: ${metadata.createdAt}`);
    } else {
      console.log('❌ No system metadata found');
    }
    
    console.log('\n🎉 Database connection and structure verified!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solutions:');
      console.log('1. Make sure MongoDB service is running:');
      console.log('   Get-Service -Name "*mongo*"');
      console.log('2. Start MongoDB service:');
      console.log('   net start MongoDB');
      console.log('3. Check if MongoDB is installed:');
      console.log('   mongosh --version');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

checkLocalConnection();
