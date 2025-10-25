const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testRealUser() {
  let client;
  
  try {
    console.log('🔍 Testing with real user who has transactions...');
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Get all users first
    const allUsers = await db.collection('users').find({}).toArray();
    console.log(`\n👥 Found ${allUsers.length} users in database:`);
    allUsers.forEach((user, i) => {
      console.log(`${i+1}. ${user._id} - ${user.totalTransactions} transactions`);
    });
    
    // Test with the first user who has transactions
    if (allUsers.length > 0) {
      const testUser = allUsers[0]._id;
      console.log(`\n👤 Testing user: ${testUser}`);
      
      // Get transactions for this specific user
      const transactions = await db.collection('transactions')
        .find({ user: testUser })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      
      console.log(`📊 Found ${transactions.length} transactions for this user:`);
      
      transactions.forEach((tx, i) => {
        console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
        console.log(`   💰 USD: $${tx.amountUSD}`);
        console.log(`   👤 User: ${tx.user}`);
        console.log(`   🔗 Hash: ${tx.hash}`);
        console.log(`   📅 Time: ${new Date(tx.timestamp).toLocaleString()}`);
      });
      
      // Test API endpoint
      console.log('\n🌐 Testing API endpoint...');
      
      try {
        const response = await fetch(`http://localhost:3000/api/transactions?user=${testUser}&limit=10&offset=0`);
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ API returned ${data.data.transactions.length} transactions`);
          console.log('📋 API Response:');
          data.data.transactions.forEach((tx, i) => {
            console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
            console.log(`   👤 User: ${tx.user}`);
            console.log(`   💰 USD: $${tx.amountUSD}`);
          });
        } else {
          console.log('❌ API Error:', data.error);
        }
      } catch (error) {
        console.log('⚠️ API not available (frontend not running)');
      }
    } else {
      console.log('❌ No users found in database');
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

testRealUser();

