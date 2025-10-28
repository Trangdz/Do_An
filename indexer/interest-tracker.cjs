/**
 * Interest Tracker Service
 * 
 * Tính toán và lưu trữ debt/interest data liên tục vào MongoDB
 * Sử dụng smart contract để accrue interest và lưu snapshot
 */

require('dotenv').config({ path: './config.env' });
const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');

class InterestTracker {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.poolAddress = process.env.LENDING_POOL_ADDRESS;
    this.isRunning = false;
    this.updateInterval = 60000; // Update every 1 minute
    this.intervalId = null;
    
    // Contract ABI for interest tracking
    this.poolABI = [
      'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
      'function reserves(address asset) view returns (uint128 liquidityIndex, uint128 variableBorrowIndex, uint40 lastUpdate, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint256 reserveCash, uint256 totalDebtPrincipal, uint16 ltvBps, uint16 liquidationThresholdBps, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, bool isBorrowable)',
      'function getCurrentSupplyBalance(address user, address asset) external view returns (uint256)',
      'function getCurrentDebtBalance(address user, address asset) external view returns (uint256)',
      'function _getAccountData(address user) internal view returns (uint256, uint256, uint256)',
      'function getAccountData(address user) external view returns (uint256 totalCollateral, uint256 totalDebt, uint256 healthFactor)',
      'function _allAssets(uint256) view returns (address)',
      'function _allAssetsLength() view returns (uint256)',
      'function accruePublic(address asset) external',
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event ReserveDataUpdated(address indexed asset, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay)'
    ];
    
    this.pool = null;
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB');
      
      // Create indexes for efficient queries
      await this.db.collection('userPositions').createIndex({ user: 1, asset: 1 }, { unique: true });
      await this.db.collection('userPositions').createIndex({ user: 1, updatedAt: -1 });
      await this.db.collection('userPositions').createIndex({ 'debt.balance': 1 });
      
      // Create pool contract instance
      this.pool = new ethers.Contract(this.poolAddress, this.poolABI, this.provider);
      console.log('✅ Initialized Interest Tracker');
      
      return true;
    } catch (error) {
      console.error('❌ Error connecting:', error);
      return false;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Interest Tracker already running');
      return;
    }

    if (!this.db || !this.pool) {
      const connected = await this.connect();
      if (!connected) {
        console.error('❌ Failed to connect');
        return;
      }
    }

    this.isRunning = true;
    console.log('🚀 Starting Interest Tracker...');
    
    // Initial update
    await this.updateAllPositions();
    
    // Periodic updates
    this.intervalId = setInterval(() => {
      this.updateAllPositions().catch(console.error);
    }, this.updateInterval);
    
    console.log(`✅ Interest Tracker running (updates every ${this.updateInterval / 1000}s)`);
  }

  async stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.client.close();
    console.log('🛑 Interest Tracker stopped');
  }

  async updateAllPositions() {
    try {
      console.log('🔄 Updating all user positions...');
      
      // Method 1: Get users from database transactions (if available)
      let users = [];
      try {
        users = await this.db.collection('transactions')
          .distinct('user', { 
            $or: [
              { type: 'Lend' },
              { type: 'Borrow' },
              { type: 'Supplied' },
              { type: 'Borrowed' }
            ]
          });
        console.log(`📊 Found ${users.length} users from transactions DB`);
      } catch (error) {
        console.log('⚠️ Could not get users from DB:', error.message);
      }
      
      // Method 2: If no users found, try to get from blockchain events
      if (users.length === 0) {
        console.log('🔍 Searching blockchain for users with positions...');
        users = await this.getUsersFromBlockchain();
        console.log(`📊 Found ${users.length} users from blockchain`);
      }
      
      // Get all assets
      const assets = await this.getAssets();
      
      if (users.length === 0) {
        console.log('⚠️ No users found. Waiting for first transactions...');
        return;
      }
      
      // Update each user's positions
      for (const user of users) {
        await this.updateUserPositions(user, assets);
      }
      
      console.log('✅ Updated all positions');
    } catch (error) {
      console.error('❌ Error updating positions:', error);
    }
  }

  async getUsersFromBlockchain() {
    try {
      const users = new Set();
      
      // Create contract interface for events
      const eventInterface = new ethers.Interface([
        'event Supplied(address indexed user, address indexed asset, uint256 amount)',
        'event Borrowed(address indexed user, address indexed asset, uint256 amount)'
      ]);
      
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
      
      // Get Supplied events
      try {
        const suppliedTopic = eventInterface.getEvent('Supplied').topicHash;
        const logs = await this.provider.getLogs({
          address: this.poolAddress,
          topics: [suppliedTopic],
          fromBlock: fromBlock,
          toBlock: currentBlock
        });
        
        logs.forEach(log => {
          try {
            const parsed = eventInterface.parseLog(log);
            if (parsed && parsed.args && parsed.args.user) {
              users.add(parsed.args.user.toLowerCase());
            }
          } catch (e) {
            // Skip invalid logs
          }
        });
      } catch (error) {
        console.log('⚠️ Could not query Supplied events:', error.message);
      }
      
      // Get Borrowed events
      try {
        const borrowedTopic = eventInterface.getEvent('Borrowed').topicHash;
        const logs = await this.provider.getLogs({
          address: this.poolAddress,
          topics: [borrowedTopic],
          fromBlock: fromBlock,
          toBlock: currentBlock
        });
        
        logs.forEach(log => {
          try {
            const parsed = eventInterface.parseLog(log);
            if (parsed && parsed.args && parsed.args.user) {
              users.add(parsed.args.user.toLowerCase());
            }
          } catch (e) {
            // Skip invalid logs
          }
        });
      } catch (error) {
        console.log('⚠️ Could not query Borrowed events:', error.message);
      }
      
      return Array.from(users);
    } catch (error) {
      console.error('❌ Error getting users from blockchain:', error);
      return [];
    }
  }

  async getAssets() {
    try {
      // Try to get assets from contract
      try {
        const lengthABI = ['function _allAssetsLength() view returns (uint256)'];
        const poolContract = new ethers.Contract(this.poolAddress, lengthABI, this.provider);
        const length = await poolContract._allAssetsLength();
        
        const assets = [];
        const assetABI = ['function _allAssets(uint256) view returns (address)'];
        const assetContract = new ethers.Contract(this.poolAddress, assetABI, this.provider);
        
        for (let i = 0; i < length; i++) {
          const asset = await assetContract._allAssets(i);
          assets.push(asset);
        }
        
        return assets;
      } catch (error) {
        console.warn('⚠️ Could not get assets from contract, using known assets');
        // Fallback to known assets (normalize to checksum)
        // Convert to lowercase first, then normalize to avoid checksum errors
        return [
          ethers.getAddress('0xf7087e183958b9292a6a2deda6d4bb8feea50472'.toLowerCase()), // USDC
          ethers.getAddress('0x92c2dc1fc29b180de2da0fdb217823d939b6e0a5'.toLowerCase()), // WETH
          ethers.getAddress('0x7e1600e50472a5850a295cb8eeeb5c323c1f6254'.toLowerCase())  // DAI
        ];
      }
    } catch (error) {
      console.error('❌ Error getting assets:', error);
      return [];
    }
  }

  async updateUserPositions(userAddress, assets) {
    try {
      // Normalize user address (convert to lowercase first)
      const normalizedUser = ethers.getAddress(userAddress.toLowerCase());
      
      // Accrue interest for all assets first (important!)
      for (const asset of assets) {
        try {
          const normalizedAsset = ethers.getAddress(asset.toLowerCase());
          await this.pool.accruePublic(normalizedAsset);
        } catch (error) {
          // Silently continue if accrue fails (e.g., asset not initialized)
        }
      }
      
      const positions = [];
      
      for (const asset of assets) {
        try {
          const position = await this.getUserPosition(normalizedUser, asset);
          if (position && (position.supply.balance > 0 || position.debt.balance > 0)) {
            positions.push(position);
          }
        } catch (error) {
          // Skip assets with errors
          continue;
        }
      }
      
      // Calculate total values
      let totalCollateralUSD = 0;
      let totalDebtUSD = 0;
      
      for (const pos of positions) {
        if (pos.supply.balance > 0 && pos.supply.isCollateral) {
          totalCollateralUSD += pos.supply.valueUSD;
        }
        if (pos.debt.balance > 0) {
          totalDebtUSD += pos.debt.valueUSD;
        }
      }
      
      // Calculate health factor
      const healthFactor = totalDebtUSD > 0 
        ? totalCollateralUSD / totalDebtUSD 
        : 999999;
      
      // Save to database
      await this.db.collection('userPositions').updateOne(
        { user: userAddress },
        {
          $set: {
            user: userAddress,
            positions: positions,
            totalCollateralUSD,
            totalDebtUSD,
            healthFactor,
            updatedAt: new Date(),
            lastUpdateTimestamp: Math.floor(Date.now() / 1000)
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Updated ${userAddress}: ${positions.length} positions, HF: ${healthFactor.toFixed(4)}`);
      
    } catch (error) {
      console.error(`❌ Error updating user ${userAddress}:`, error.message);
    }
  }

  async getUserPosition(userAddress, assetAddress) {
    try {
      // Normalize addresses to checksum format (convert to lowercase first)
      const normalizedUser = ethers.getAddress(userAddress.toLowerCase());
      const normalizedAsset = ethers.getAddress(assetAddress.toLowerCase());
      
      // Get user reserve data
      const userReserve = await this.pool.userReserves(normalizedUser, normalizedAsset);
      const reserve = await this.pool.reserves(normalizedAsset);
      
      // Get current balances (with interest)
      const currentSupply = await this.pool.getCurrentSupplyBalance(normalizedUser, normalizedAsset);
      const currentDebt = await this.pool.getCurrentDebtBalance(normalizedUser, normalizedAsset);
      
      // Get asset price (try contract first, then database)
      const price = await this.getAssetPrice(normalizedAsset);
      
      // Calculate supply position
      const supplyBalance = BigInt(currentSupply.toString());
      const supplyValueUSD = Number(supplyBalance) / 1e18 * price;
      const supplyInterest = supplyBalance - BigInt(userReserve.supply.principal.toString());
      
      // Calculate debt position
      const debtBalance = BigInt(currentDebt.toString());
      const debtValueUSD = Number(debtBalance) / 1e18 * price;
      const debtInterest = debtBalance - BigInt(userReserve.borrow.principal.toString());
      
      // Calculate interest rates
      const supplyRateAPY = this.rateToAPY(reserve.liquidityRateRayPerSec);
      const borrowRateAPY = this.rateToAPY(reserve.variableBorrowRateRayPerSec);
      
      return {
        asset: normalizedAsset,
        supply: {
          principal: userReserve.supply.principal.toString(),
          snapshotIndex: userReserve.supply.index.toString(),
          currentIndex: reserve.liquidityIndex.toString(),
          balance: supplyBalance.toString(),
          balanceWithInterest: supplyBalance.toString(),
          interest: supplyInterest.toString(),
          rateAPY: supplyRateAPY,
          rateRayPerSec: reserve.liquidityRateRayPerSec.toString(),
          valueUSD: supplyValueUSD,
          isCollateral: userReserve.useAsCollateral
        },
        debt: {
          principal: userReserve.borrow.principal.toString(),
          snapshotIndex: userReserve.borrow.index.toString(),
          currentIndex: reserve.variableBorrowIndex.toString(),
          balance: debtBalance.toString(),
          balanceWithInterest: debtBalance.toString(),
          interest: debtInterest.toString(),
          rateAPY: borrowRateAPY,
          rateRayPerSec: reserve.variableBorrowRateRayPerSec.toString(),
          valueUSD: debtValueUSD
        },
        reserve: {
          liquidityIndex: reserve.liquidityIndex.toString(),
          borrowIndex: reserve.variableBorrowIndex.toString(),
          lastUpdate: reserve.lastUpdate.toString(),
          utilization: reserve.totalDebtPrincipal > 0
            ? Number(reserve.totalDebtPrincipal) / (Number(reserve.reserveCash) + Number(reserve.totalDebtPrincipal))
            : 0
        }
      };
      
    } catch (error) {
      console.error(`❌ Error getting position for ${userAddress}/${assetAddress}:`, error.message);
      return null;
    }
  }

  async getAssetPrice(assetAddress) {
    try {
      // Normalize asset address first
      const normalizedAsset = ethers.getAddress(assetAddress.toLowerCase());
      
      // Try to get from contract oracle
      const oracleABI = ['function getAssetPrice1e18(address token) external view returns (uint256)'];
      const oracleAddress = process.env.ORACLE_ADDRESS;
      
      if (oracleAddress) {
        const oracle = new ethers.Contract(oracleAddress, oracleABI, this.provider);
        const priceWei = await oracle.getAssetPrice1e18(normalizedAsset);
        return parseFloat(ethers.formatEther(priceWei));
      }
    } catch (error) {
      // Fallback to database
    }
    
    try {
      // Try both normalized and original address for DB lookup
      const normalizedAsset = ethers.getAddress(assetAddress.toLowerCase());
      const asset = await this.db.collection('assets').findOne({ 
        $or: [
          { address: normalizedAsset },
          { address: assetAddress.toLowerCase() },
          { address: assetAddress }
        ]
      });
      if (asset && asset.currentPrice) {
        return asset.currentPrice;
      }
    } catch (error) {
      // Use default price
    }
    
    // Default prices if all else fails (use normalized address)
    // Convert to lowercase first to avoid checksum errors
    const normalizedAsset = ethers.getAddress(assetAddress.toLowerCase());
    const defaultPrices = {
      [ethers.getAddress('0xf7087e183958b9292a6a2deda6d4bb8feea50472')]: 1.0,  // USDC
      [ethers.getAddress('0x92c2dc1fc29b180de2da0fdb217823d939b6e0a5')]: 2500, // WETH
      [ethers.getAddress('0x7e1600e50472a5850a295cb8eeeb5c323c1f6254')]: 1.0   // DAI
    };
    
    return defaultPrices[normalizedAsset] || 0;
  }

  rateToAPY(rateRayPerSec) {
    const rate = Number(rateRayPerSec) / 1e27;
    const apy = rate * 365 * 24 * 3600 * 100;
    return apy;
  }

  async getUserPositions(userAddress) {
    try {
      const doc = await this.db.collection('userPositions').findOne({ user: userAddress });
      return doc || null;
    } catch (error) {
      console.error('❌ Error getting user positions:', error);
      return null;
    }
  }
}

// Main execution
if (require.main === module) {
  const tracker = new InterestTracker();
  
  tracker.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Interest Tracker...');
    await tracker.stop();
    process.exit(0);
  });
}

module.exports = InterestTracker;

