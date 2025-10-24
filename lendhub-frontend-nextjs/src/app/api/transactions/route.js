import { MongoClient } from 'mongodb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get('user');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;

  // Check if MongoDB URI is configured
  if (!process.env.MONGODB_URI) {
    return Response.json({
      success: false,
      error: 'MongoDB URI not configured'
    }, { status: 500 });
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');

    // Build query
    const query = {};
    if (user) query.user = user;
    if (type) query.type = type;

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

    return Response.json({
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
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
