/**
 * POST /api/snapshot/save
 * 
 * Save interest snapshot to MongoDB
 * Called automatically when user closes tab or every 60 seconds
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// MongoDB configuration
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

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Snapshot save API called');
    
    // Support both JSON and Blob (from sendBeacon)
    let body;
    const contentType = request.headers.get('content-type');
    
    console.log('📋 Content-Type:', contentType);
    
    if (contentType?.includes('application/json')) {
      body = await request.json();
      console.log('📦 JSON body received:', body);
    } else {
      // Handle Blob from sendBeacon
      const blob = await request.blob();
      const text = await blob.text();
      body = JSON.parse(text);
      console.log('📦 Blob body received:', body);
    }

    // Validate required fields
    const { user, asset, scaledBalance, liquidityIndex, liquidityRate, lastUpdateTimestamp } = body;

    console.log('🔍 Validating fields:', { user, asset, scaledBalance, liquidityIndex, liquidityRate, lastUpdateTimestamp });

    if (!user || !asset || scaledBalance === undefined || liquidityIndex === undefined) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🔌 Connecting to database...');
    const db = await getDatabase();

    // Upsert snapshot (update if exists, insert if new)
    const result = await db.collection('interest_snapshots').updateOne(
      {
        user: user.toLowerCase(),
        asset: asset.toUpperCase()
      },
      {
        $set: {
          user: user.toLowerCase(),
          asset: asset.toUpperCase(),
          scaledBalance: Number(scaledBalance),
          liquidityIndex: Number(liquidityIndex),
          liquidityRate: Number(liquidityRate),
          lastUpdateTimestamp: Number(lastUpdateTimestamp),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ Snapshot saved:', result);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error saving snapshot:', error);
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

