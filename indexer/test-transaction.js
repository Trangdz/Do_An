const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function testTransaction() {
  let client;
  
  try {
    console.log('🧪 Testing transaction creation...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
    console.log(`🏦 Pool Address: ${process.env.LENDING_POOL_ADDRESS}`);
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    
    console.log('✅ Connected to blockchain');
    
    // Get accounts
    const accounts = await provider.listAccounts();
    console.log(`👥 Found ${accounts.length} accounts`);
    
    if (accounts.length === 0) {
      console.log('❌ No accounts found. Make sure Ganache is running with accounts.');
      return;
    }
    
    const userAddress = accounts[0];
    console.log(`👤 Using account: ${userAddress}`);
    
    // Get balance
    const balance = await provider.getBalance(userAddress);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Create a test transaction record
    const testTransaction = {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      user: userAddress,
      asset: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18
      },
      amount: '1.0',
      amountUSD: 2500.00,
      type: 'Test',
      timestamp: Date.now(),
      blockNumber: await provider.getBlockNumber(),
      gas: {
        used: '21000',
        price: '20000000000',
        fee: '0.00042'
      },
      status: 'success',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('\n📝 Creating test transaction...');
    console.log(`   Hash: ${testTransaction.hash}`);
    console.log(`   User: ${testTransaction.user}`);
    console.log(`   Amount: ${testTransaction.amount} ${testTransaction.asset.symbol}`);
    console.log(`   Type: ${testTransaction.type}`);
    
    // Insert transaction
    const transactionResult = await db.collection('transactions').insertOne(testTransaction);
    console.log(`✅ Inserted transaction with ID: ${transactionResult.insertedId}`);
    
    // Update user stats
    const userResult = await db.collection('users').updateOne(
      { address: userAddress },
      { 
        $inc: { 
          totalTransactions: 1,
          totalVolume: testTransaction.amountUSD
        },
        $set: { 
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`✅ Updated user: ${userResult.upsertedId || 'existing user'}`);
    
    // Update asset stats
    const assetResult = await db.collection('assets').updateOne(
      { address: testTransaction.asset.address },
      { 
        $inc: { 
          totalTransactions: 1,
          totalVolume: testTransaction.amountUSD
        },
        $set: { 
          symbol: testTransaction.asset.symbol,
          decimals: testTransaction.asset.decimals,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`✅ Updated asset: ${assetResult.upsertedId || 'existing asset'}`);
    
    // Update metadata
    const metadataResult = await db.collection('metadata').updateOne(
      { key: 'lastTestTransaction' },
      { 
        $set: { 
          value: testTransaction.hash,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`✅ Updated metadata: ${metadataResult.upsertedId || 'existing metadata'}`);
    
    // Verify data
    console.log('\n🔍 Verifying data...');
    const transactionCount = await db.collection('transactions').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const assetCount = await db.collection('assets').countDocuments();
    const metadataCount = await db.collection('metadata').countDocuments();
    
    console.log(`📊 Results:`);
    console.log(`   Transactions: ${transactionCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Assets: ${assetCount}`);
    console.log(`   Metadata: ${metadataCount}`);
    
    // Show recent transactions
    console.log('\n📝 Recent transactions:');
    const recentTransactions = await db.collection('transactions')
      .find({})
      .sort({ timestamp: -1 })
      .limit(3)
      .toArray();
    
    recentTransactions.forEach(tx => {
      console.log(`   - ${tx.type}: ${tx.amount} ${tx.asset.symbol} (${tx.amountUSD} USD)`);
      console.log(`     Hash: ${tx.hash}`);
      console.log(`     User: ${tx.user}`);
      console.log(`     Block: ${tx.blockNumber}`);
      console.log(`     Time: ${new Date(tx.timestamp).toLocaleString()}`);
      console.log('');
    });
    
    console.log('✅ Transaction test completed successfully!');
    
  } catch (error) {
    console.error('❌ Transaction test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

testTransaction();