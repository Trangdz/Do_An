// Test API trực tiếp
const { MongoClient } = require('mongodb');

async function testDirectAPI() {
  try {
    console.log('🧪 Testing Direct API...');
    
    // Simulate API request
    const MONGODB_URI = 'mongodb+srv://trang:trang@cluster0.kzpwxhw.mongodb.net/lendhub?retryWrites=true&w=majority';
    
    if (!MONGODB_URI) {
      console.log('❌ MongoDB URI not configured');
      return;
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub');
    
    // Build query (same as API)
    const query = {};
    const limit = 50;
    const offset = 0;
    
    // Get transactions
    const transactions = await db.collection('transactions')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    // Get total count
    const totalCount = await db.collection('transactions').countDocuments(query);
    
    await client.close();
    
    console.log('✅ API Response:');
    console.log(JSON.stringify({
      success: true,
      data: {
        transactions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error);
  }
}

testDirectAPI();



