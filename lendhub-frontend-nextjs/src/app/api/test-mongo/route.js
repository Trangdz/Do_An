import { MongoClient } from 'mongodb';

export async function GET() {
  console.log('🧪 Testing MongoDB connection...');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  
  if (!process.env.MONGODB_URI) {
    return Response.json({
      success: false,
      error: 'MongoDB URI not configured',
      env: process.env
    }, { status: 500 });
  }

  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub');
    console.log('✅ Database accessed');
    
    // Test collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    // Test transactions collection
    const txCount = await db.collection('transactions').countDocuments();
    console.log('📝 Transactions count:', txCount);
    
    // Get sample transaction
    const sampleTx = await db.collection('transactions').findOne();
    console.log('📄 Sample transaction:', sampleTx);
    
    await client.close();
    console.log('✅ Connection closed');
    
    return Response.json({
      success: true,
      message: 'MongoDB connection successful',
      data: {
        collections: collections.map(c => c.name),
        transactionCount: txCount,
        sampleTransaction: sampleTx
      }
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}













