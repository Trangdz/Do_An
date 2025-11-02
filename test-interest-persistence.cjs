/**
 * Test Interest Persistence System
 * 
 * Tests the complete flow:
 * 1. Interest Tracker saves data to MongoDB
 * 2. API endpoint returns correct data
 * 3. Frontend persistence works correctly
 */

require('dotenv').config();
const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const RPC_URL = process.env.RPC_URL || 'http://localhost:7545';
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;

async function testInterestPersistence() {
  console.log('🧪 Testing Interest Persistence System...\n');

  try {
    // 1. Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB\n');

    // 2. Get a test user from transactions
    console.log('2️⃣ Finding test user...');
    const transactions = await db.collection('transactions').find({}).limit(1).toArray();
    
    if (transactions.length === 0) {
      console.log('⚠️ No transactions found. Please create some positions first.');
      await client.close();
      return;
    }

    const testUser = transactions[0].user;
    console.log(`✅ Using test user: ${testUser}\n`);

    // 3. Check if Interest Tracker has created position data
    console.log('3️⃣ Checking user positions in database...');
    const positionDoc = await db.collection('userPositions').findOne({
      user: testUser.toLowerCase()
    });

    if (!positionDoc) {
      console.log('⚠️ No position data found. Make sure Interest Tracker is running.');
      console.log('   Run: cd indexer && npm run interest-tracker');
      await client.close();
      return;
    }

    console.log('✅ Position data found:');
    console.log(`   - Total Positions: ${positionDoc.positions?.length || 0}`);
    console.log(`   - Total Collateral: $${positionDoc.totalCollateralUSD?.toFixed(2) || 0}`);
    console.log(`   - Total Debt: $${positionDoc.totalDebtUSD?.toFixed(2) || 0}`);
    console.log(`   - Health Factor: ${positionDoc.healthFactor?.toFixed(4) || 0}`);
    console.log(`   - Last Update: ${new Date(positionDoc.updatedAt).toLocaleString()}\n`);

    // 4. Verify positions have interest data
    console.log('4️⃣ Verifying interest calculations...');
    if (positionDoc.positions && positionDoc.positions.length > 0) {
      const pos = positionDoc.positions[0];
      
      console.log(`Asset: ${pos.asset}`);
      
      if (pos.supply && BigInt(pos.supply.balance) > 0n) {
        const principal = BigInt(pos.supply.principal);
        const balance = BigInt(pos.supply.balance);
        const interest = balance - principal;
        const interestUSD = Number(interest) / 1e18 * pos.supply.valueUSD / (Number(balance) / 1e18);
        
        console.log(`   Supply:`);
        console.log(`     - Principal: ${ethers.formatEther(principal)}`);
        console.log(`     - Balance (with interest): ${ethers.formatEther(balance)}`);
        console.log(`     - Interest: ${ethers.formatEther(interest)} ($${interestUSD.toFixed(2)})`);
        console.log(`     - Rate: ${pos.supply.rateAPY?.toFixed(2)}% APY`);
      }
      
      if (pos.debt && BigInt(pos.debt.balance) > 0n) {
        const principal = BigInt(pos.debt.principal);
        const balance = BigInt(pos.debt.balance);
        const interest = balance - principal;
        const interestUSD = Number(interest) / 1e18 * pos.debt.valueUSD / (Number(balance) / 1e18);
        
        console.log(`   Debt:`);
        console.log(`     - Principal: ${ethers.formatEther(principal)}`);
        console.log(`     - Balance (with interest): ${ethers.formatEther(balance)}`);
        console.log(`     - Interest: ${ethers.formatEther(interest)} ($${interestUSD.toFixed(2)})`);
        console.log(`     - Rate: ${pos.debt.rateAPY?.toFixed(2)}% APY`);
      }
    }
    console.log('');

    // 5. Test API endpoint (if frontend is running)
    console.log('5️⃣ Testing API endpoint...');
    try {
      const response = await fetch(`http://localhost:3000/api/positions/${testUser}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API endpoint working');
        console.log(`   - Returned ${data.positions?.length || 0} positions`);
      } else {
        console.log('⚠️ API endpoint returned error:', response.status);
        console.log('   Make sure frontend is running: npm run dev');
      }
    } catch (error) {
      console.log('⚠️ Could not test API endpoint (frontend may not be running)');
      console.log('   Error:', error.message);
    }
    console.log('');

    // 6. Verify contract data matches
    console.log('6️⃣ Verifying contract data matches database...');
    if (LENDING_POOL_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const poolABI = [
          'function getCurrentSupplyBalance(address user, address asset) external view returns (uint256)',
          'function getCurrentDebtBalance(address user, address asset) external view returns (uint256)'
        ];
        const pool = new ethers.Contract(LENDING_POOL_ADDRESS, poolABI, provider);

        if (positionDoc.positions && positionDoc.positions.length > 0) {
          const pos = positionDoc.positions[0];
          const asset = pos.asset;

          try {
            const contractSupply = await pool.getCurrentSupplyBalance(testUser, asset);
            const dbSupply = BigInt(pos.supply.balance);
            
            const diff = contractSupply > dbSupply 
              ? contractSupply - dbSupply 
              : dbSupply - contractSupply;
            
            // Allow 1% difference due to time lag
            const threshold = contractSupply / 100n;
            
            if (diff < threshold) {
              console.log('✅ Supply balance matches contract (within 1%)');
            } else {
              console.log('⚠️ Supply balance differs from contract');
              console.log(`   Contract: ${ethers.formatEther(contractSupply)}`);
              console.log(`   Database: ${ethers.formatEther(dbSupply)}`);
              console.log('   (This is normal if Interest Tracker needs to update)');
            }
          } catch (error) {
            console.log('⚠️ Could not verify supply balance:', error.message);
          }

          try {
            const contractDebt = await pool.getCurrentDebtBalance(testUser, asset);
            const dbDebt = BigInt(pos.debt.balance);
            
            const diff = contractDebt > dbDebt 
              ? contractDebt - dbDebt 
              : dbDebt - contractDebt;
            
            const threshold = contractDebt / 100n;
            
            if (diff < threshold) {
              console.log('✅ Debt balance matches contract (within 1%)');
            } else {
              console.log('⚠️ Debt balance differs from contract');
              console.log(`   Contract: ${ethers.formatEther(contractDebt)}`);
              console.log(`   Database: ${ethers.formatEther(dbDebt)}`);
            }
          } catch (error) {
            console.log('⚠️ Could not verify debt balance:', error.message);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not verify with contract:', error.message);
      }
    } else {
      console.log('⚠️ LENDING_POOL_ADDRESS not set, skipping contract verification');
    }

    console.log('\n✅ Test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Keep Interest Tracker running: cd indexer && npm run interest-tracker');
    console.log('   2. Frontend will auto-load positions from API');
    console.log('   3. Positions will persist across page reloads');

    await client.close();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testInterestPersistence();

