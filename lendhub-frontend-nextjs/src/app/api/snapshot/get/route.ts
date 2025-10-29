/**
 * GET /api/snapshot/get?user=...&asset=...
 * 
 * Get latest interest snapshot from MongoDB
 * Called on page load to restore user's interest state
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lendhub_local';
const MONGODB_DB = process.env.MONGODB_DB || 'lendhub_local';

let client: MongoClient | null = null;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(MONGODB_DB);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const asset = searchParams.get('asset');

    if (!user || !asset) {
      return NextResponse.json(
        { error: 'Missing user or asset parameter' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find snapshot
    const snapshot = await db.collection('interest_snapshots').findOne({
      user: user.toLowerCase(),
      asset: asset.toUpperCase()
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Remove MongoDB _id field
    const { _id, updatedAt, ...data } = snapshot;

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error getting snapshot:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cleanup connection
process.on('beforeExit', async () => {
  if (client) {
    await client.close();
  }
});


