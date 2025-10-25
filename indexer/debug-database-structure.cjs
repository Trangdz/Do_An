const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function debugDatabaseStructure() {
  let client;
  
  try {
    console.log('🔍 Debugging database structure...');
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Check transactions collection
    console.log('\n📝 TRANSACTIONS:');
    const transactions = await db.collection('transactions').find({}).limit(5).toArray();
    console.log(`Total transactions: ${await db.collection('transactions').countDocuments()}`);
    
    if (transactions.length > 0) {
      console.log('\nSample transaction:');
      console.log(JSON.stringify(transactions[0], null, 2));
    }
    
    // Check users collection
    console.log('\n👥 USERS:');
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log(`Total users: ${await db.collection('users').countDocuments()}`);
    
    if (users.length > 0) {
      console.log('\nSample user:');
      console.log(JSON.stringify(users[0], null, 2));
    }
    
    // Check unique user addresses in transactions
    console.log('\n🔍 UNIQUE USER ADDRESSES IN TRANSACTIONS:');
    const uniqueUsers = await db.collection('transactions').distinct('user');
    console.log(`Found ${uniqueUsers.length} unique users:`);
    uniqueUsers.forEach((user, i) => {
      console.log(`${i+1}. ${user}`);
    });
    
    // Test with actual user address
    if (uniqueUsers.length > 0) {
      const testUser = uniqueUsers[0];
      console.log(`\n👤 Testing with actual user: ${testUser}`);
      
      const userTransactions = await db.collection('transactions')
        .find({ user: testUser })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();
      
      console.log(`📊 Found ${userTransactions.length} transactions for this user:`);
      userTransactions.forEach((tx, i) => {
        console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
        console.log(`   👤 User: ${tx.user}`);
        console.log(`   🔗 Hash: ${tx.hash}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

debugDatabaseStructure();
