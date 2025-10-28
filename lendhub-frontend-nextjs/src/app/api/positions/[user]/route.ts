/**
 * API Route: Get User Positions
 * 
 * Fetches user debt and interest data from MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'lendhub';

let client: MongoClient | null = null;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(MONGODB_DB);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {
  try {
    const { user: userAddress } = await params;
    
    if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid user address' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const positions = await db.collection('userPositions').findOne({
      user: userAddress.toLowerCase()
    });

    if (!positions) {
      return NextResponse.json(
        { 
          user: userAddress,
          positions: [],
          totalCollateralUSD: 0,
          totalDebtUSD: 0,
          healthFactor: 999999,
          updatedAt: new Date().toISOString(),
          lastUpdateTimestamp: Math.floor(Date.now() / 1000)
        },
        { status: 200 }
      );
    }

    // Remove MongoDB _id field
    const { _id, ...data } = positions;

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching positions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cleanup connection on process exit
process.on('beforeExit', async () => {
  if (client) {
    await client.close();
  }
});

