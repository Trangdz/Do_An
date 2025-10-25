const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testSpecificUser() {
  let client;
  
  try {
    console.log('🔍 Testing specific user transactions...');
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Test with a specific user address
    const testUser = '0x72A99A677E7451ce76ab072898af4c0741A2F086';
    
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
      console.log(`   🔗 Hash: ${tx.hash}`);
      console.log(`   📅 Time: ${new Date(tx.timestamp).toLocaleString()}`);
      console.log(`   📦 Block: ${tx.blockNumber}`);
    });
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    
    const response = await fetch(`http://localhost:3000/api/transactions?user=${testUser}&limit=10&offset=0`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API returned ${data.data.transactions.length} transactions`);
      console.log('📋 API Response:');
      console.log(JSON.stringify(data.data.transactions, null, 2));
    } else {
      console.log('❌ API Error:', data.error);
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

testSpecificUser();
