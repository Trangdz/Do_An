const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testDifferentUser() {
  let client;
  
  try {
    console.log('🔍 Testing with different user...');
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Test with a different user address (one that doesn't exist)
    const testUser = '0x1234567890123456789012345678901234567890';
    
    console.log(`\n👤 Testing user: ${testUser}`);
    
    // Get transactions for this specific user
    const transactions = await db.collection('transactions')
      .find({ user: testUser })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    console.log(`📊 Found ${transactions.length} transactions for this user:`);
    
    if (transactions.length === 0) {
      console.log('✅ Correct! No transactions found for this user');
    } else {
      console.log('❌ Error! Found transactions for wrong user:');
      transactions.forEach((tx, i) => {
        console.log(`\n${i+1}. ${tx.type} - ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
        console.log(`   👤 User: ${tx.user}`);
        console.log(`   🔗 Hash: ${tx.hash}`);
      });
    }
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/transactions?user=${testUser}&limit=10&offset=0`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ API returned ${data.data.transactions.length} transactions`);
        if (data.data.transactions.length === 0) {
          console.log('✅ Correct! API returned no transactions for this user');
        } else {
          console.log('❌ Error! API returned transactions for wrong user:');
          console.log(JSON.stringify(data.data.transactions, null, 2));
        }
      } else {
        console.log('❌ API Error:', data.error);
      }
    } catch (error) {
      console.log('⚠️ API not available (frontend not running)');
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

testDifferentUser();

