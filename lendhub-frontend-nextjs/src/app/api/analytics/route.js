import { MongoClient } from 'mongodb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '7d';
  const user = searchParams.get('user');

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
    const db = client.db('lendhub');

    // Calculate time range
    const now = new Date();
    const timeRanges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    const timeRange = timeRanges[timeframe] || timeRanges['7d'];
    const startTime = new Date(now.getTime() - timeRange);

    // Build query
    const query = {
      timestamp: { $gte: startTime.getTime() }
    };
    if (user) query.user = user;

    // Get transaction statistics
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalVolume: { $sum: '$amountUSD' },
          avgAmount: { $avg: '$amountUSD' },
          totalGasFee: { $sum: { $toDouble: '$gas.fee' } }
        }
      },
      { $sort: { count: -1 } }
    ];

    const transactionStats = await db.collection('transactions').aggregate(pipeline).toArray();

    // Get total volume
    const totalVolumeResult = await db.collection('transactions').aggregate([
      { $match: query },
      { $group: { _id: null, totalVolume: { $sum: '$amountUSD' } } }
    ]).toArray();

    const totalVolume = totalVolumeResult[0]?.totalVolume || 0;

    // Get unique users
    const uniqueUsers = await db.collection('transactions').distinct('user', query);

    // Get top assets
    const topAssets = await db.collection('transactions').aggregate([
      { $match: query },
      {
        $group: {
          _id: '$asset.symbol',
          count: { $sum: 1 },
          totalVolume: { $sum: '$amountUSD' }
        }
      },
      { $sort: { totalVolume: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get daily volume
    const dailyVolume = await db.collection('transactions').aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $toDate: '$timestamp' }
            }
          },
          volume: { $sum: '$amountUSD' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    await client.close();

    return Response.json({
      success: true,
      data: {
        timeframe,
        totalVolume,
        uniqueUsers: uniqueUsers.length,
        transactionStats,
        topAssets,
        dailyVolume,
        summary: {
          totalTransactions: transactionStats.reduce((sum, stat) => sum + stat.count, 0),
          totalGasFees: transactionStats.reduce((sum, stat) => sum + stat.totalGasFee, 0)
        }
      }
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
