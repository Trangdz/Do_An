const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
// Load environment variables
const path = require('path');
const envPath = path.join(__dirname, 'config.env');
console.log(`🔧 Loading environment from: ${envPath}`);
require('dotenv').config({ path: envPath });

class LendHubIndexer {
  constructor() {
    // Validate required environment variables
    const mongodbUri = process.env.MONGODB_URI;
    const rpcUrl = process.env.RPC_URL;
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    const oracleAddress = process.env.ORACLE_ADDRESS;
    
    if (!mongodbUri) {
      throw new Error('MONGODB_URI environment variable is not set. Please check your config.env file.');
    }
    if (!rpcUrl) {
      throw new Error('RPC_URL environment variable is not set. Please check your config.env file.');
    }
    if (!poolAddress) {
      throw new Error('LENDING_POOL_ADDRESS environment variable is not set. Please check your config.env file.');
    }
    
    console.log('🔧 Environment variables loaded:');
    console.log(`   MongoDB URI: ${mongodbUri ? 'Set' : 'Not set'}`);
    console.log(`   RPC URL: ${rpcUrl ? 'Set' : 'Not set'}`);
    // console.log(`   Pool Address: ${poolAddress ? 'Set' : 'Not set'}`);
    // console.log(`   Oracle Address: ${oracleAddress ? 'Set' : 'Not set'}`);
    
    this.client = new MongoClient(mongodbUri);
    this.db = null;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.poolAddress = poolAddress;
    this.oracleAddress = oracleAddress;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;
  }

  async start() {
    try {
      console.log('🚀 Starting LendHub Indexer...');
      console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
      console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
      console.log(`🏦 Pool Address: ${this.poolAddress}`);
      console.log(`💰 Oracle Address: ${this.oracleAddress || 'Not set'}`);
      
      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db('lendhub_local');
      console.log('✅ Connected to MongoDB Local');

      // Create indexes
      await this.createIndexes();
      console.log('✅ Created indexes');

      // Start indexing
      await this.indexFromLatestBlock();
      console.log('✅ Started indexing');

      this.isRunning = true;

      // Listen for new blocks
      let processingBlock = false;
      let lastLoggedBlock = 0;
      this.provider.on('block', async (blockNumber) => {
        if (this.isRunning && !processingBlock) {
          processingBlock = true;
          // Only log block number occasionally to reduce spam
          // Log every 10 blocks or if it's been more than 30 seconds since last log
          const shouldLogBlock = (blockNumber - lastLoggedBlock >= 10) || (blockNumber % 10 === 0);
          if (shouldLogBlock) {
            console.log(`📦 New block: ${blockNumber}`);
            lastLoggedBlock = blockNumber;
          }
          // Use setImmediate to avoid blocking
          setImmediate(async () => {
            try {
              await this.indexBlock(blockNumber, shouldLogBlock);
            } catch (err) {
              console.error(`❌ Error indexing block ${blockNumber}:`, err.message);
            } finally {
              processingBlock = false;
            }
          });
        }
      });

      // Keep alive heartbeat
      setInterval(() => {
        if (this.isRunning) {
          console.log('💓 Indexer heartbeat...');
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Indexer error:', error);
      await this.handleError(error);
    }
  }

  async createIndexes() {
    try {
      console.log('🔧 Creating database indexes...');
      
      // Transactions indexes
      await this.db.collection('transactions').createIndex({ hash: 1 }, { unique: true });
      await this.db.collection('transactions').createIndex({ user: 1, timestamp: -1 });
      await this.db.collection('transactions').createIndex({ type: 1, timestamp: -1 });
      await this.db.collection('transactions').createIndex({ 'asset.symbol': 1 });
      await this.db.collection('transactions').createIndex({ blockNumber: 1 });

      // Users indexes
      await this.db.collection('users').createIndex({ address: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ 'profile.name': 1 });

      // Assets indexes
      await this.db.collection('assets').createIndex({ address: 1 }, { unique: true });
      await this.db.collection('assets').createIndex({ symbol: 1 });

      // Metadata indexes
      await this.db.collection('metadata').createIndex({ key: 1 }, { unique: true });

      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  async indexFromLatestBlock() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const lastIndexed = await this.getLastIndexedBlock();
      const fromBlock = lastIndexed + 1;
      
      console.log(`🔍 Indexing blocks ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock + 1} blocks)`);
      
      // Check if we need to scan a large range
      if (fromBlock <= currentBlock) {
        const blockRange = currentBlock - fromBlock + 1;
        
        // For large ranges, scan in batches and show progress
        if (blockRange > 50) {
          console.log(`⚠️ Large block range detected (${blockRange} blocks). This may take a while...`);
          console.log(`💡 Consider using a smaller range or checking if blocks have already been indexed.`);
        }
        
        let eventsFound = 0;
        for (let block = fromBlock; block <= currentBlock; block++) {
          const eventsBefore = await this.db.collection('transactions').countDocuments();
          await this.indexBlock(block);
          const eventsAfter = await this.db.collection('transactions').countDocuments();
          const newEvents = eventsAfter - eventsBefore;
          if (newEvents > 0) {
            eventsFound += newEvents;
            console.log(`   ✅ Block ${block}: Added ${newEvents} new transaction(s)`);
          }
          // Small delay to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (eventsFound > 0) {
          console.log(`✅ Initial indexing completed: Found ${eventsFound} new transaction(s)`);
        } else {
          console.log(`✅ Initial indexing completed: No new transactions found in blocks ${fromBlock}-${currentBlock}`);
        }
      } else {
        console.log(`✅ Already up to date. Last indexed: ${lastIndexed}, Current: ${currentBlock}`);
      }
    } catch (error) {
      console.error('❌ Error indexing from latest block:', error);
      console.error('   Stack:', error.stack);
      throw error;
    }
  }

  async indexBlock(blockNumber, verboseLogging = false) {
    try {
      // Validate contract address
      if (!this.poolAddress) {
        console.error(`❌ Pool address not set!`);
        return;
      }

      const pool = new ethers.Contract(this.poolAddress, this.getPoolABI(), this.provider);
      
      // Verify contract is deployed at this address (only check once per block range)
      // Skip check for performance - we'll catch errors when querying events

      // Get all events from this block with error handling
      let suppliedEvents = [], withdrawnEvents = [], borrowedEvents = [], repaidEvents = [], liquidatedEvents = [];
      
      try {
        [suppliedEvents, withdrawnEvents, borrowedEvents, repaidEvents, liquidatedEvents] = await Promise.all([
          pool.queryFilter('Supplied', blockNumber, blockNumber).catch(err => {
            console.warn(`⚠️ Failed to fetch Supplied events for block ${blockNumber}:`, err.message);
            return [];
          }),
          pool.queryFilter('Withdrawn', blockNumber, blockNumber).catch(err => {
            console.warn(`⚠️ Failed to fetch Withdrawn events for block ${blockNumber}:`, err.message);
            return [];
          }),
          pool.queryFilter('Borrowed', blockNumber, blockNumber).catch(err => {
            console.warn(`⚠️ Failed to fetch Borrowed events for block ${blockNumber}:`, err.message);
            return [];
          }),
          pool.queryFilter('Repaid', blockNumber, blockNumber).catch(err => {
            console.warn(`⚠️ Failed to fetch Repaid events for block ${blockNumber}:`, err.message);
            return [];
          }),
          pool.queryFilter('Liquidated', blockNumber, blockNumber).catch(err => {
            console.warn(`⚠️ Failed to fetch Liquidated events for block ${blockNumber}:`, err.message);
            return [];
          }),
        ]);
      } catch (queryError) {
        console.error(`❌ Error querying events for block ${blockNumber}:`, queryError.message);
        console.error(`   Stack:`, queryError.stack);
        return;
      }

      const allEvents = [...suppliedEvents, ...withdrawnEvents, ...borrowedEvents, ...repaidEvents, ...liquidatedEvents];
      
      // Always log block processing, even if no events
      if (allEvents.length > 0) {
        console.log(`📈 Block ${blockNumber}: Found ${allEvents.length} events`);
        console.log(`   - Supplied: ${suppliedEvents.length}`);
        console.log(`   - Withdrawn: ${withdrawnEvents.length}`);
        console.log(`   - Borrowed: ${borrowedEvents.length}`);
        console.log(`   - Repaid: ${repaidEvents.length}`);
        console.log(`   - Liquidated: ${liquidatedEvents.length}`);
        
        for (let i = 0; i < allEvents.length; i++) {
          const event = allEvents[i];
          // Get event name for logging
          const eventName = event.event || event.fragment?.name || event.name || 'Unknown';
          console.log(`\n📝 Processing event ${i + 1}/${allEvents.length}: ${eventName}`);
          try {
            await this.processEvent(event);
          } catch (eventError) {
            console.error(`❌ Error processing event ${i + 1}: ${eventError.message}`);
            console.error(`   Stack:`, eventError.stack);
            // Continue with next event
          }
        }
      } else {
        // Only log if verbose logging is enabled or every 50 blocks
        if (verboseLogging && blockNumber % 50 === 0) {
          console.log(`   ℹ️ Block ${blockNumber}: No events found (last 50 blocks scanned)`);
        }
      }

      // Update last indexed block
      try {
        await this.updateLastIndexedBlock(blockNumber);
      } catch (updateError) {
        console.error(`❌ Error updating last indexed block: ${updateError.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Error indexing block ${blockNumber}:`, error.message);
      console.error(`   Stack:`, error.stack);
      await this.handleError(error);
    }
  }

  async processEvent(event) {
    try {
      // Get event name - handle both ethers v5 and v6 formats
      let eventName = event.event || event.fragment?.name || event.name;
      if (!eventName && event.topics && event.topics[0]) {
        // Try to parse from topics if available
        const pool = new ethers.Contract(this.poolAddress, this.getPoolABI(), this.provider);
        try {
          const parsed = pool.interface.parseLog(event);
          eventName = parsed?.name;
        } catch (parseError) {
          // Ignore parse error
        }
      }
      
      if (!eventName) {
        console.error(`❌ Cannot determine event name from event:`, event);
        return;
      }
      
      console.log(`🔍 Processing event: ${eventName} in block ${event.blockNumber}`);
      
      // Validate event structure
      if (!event.args) {
        console.error(`❌ Event ${eventName} has no args`);
        return;
      }

      // Get block timestamp
      let blockTimestamp = Date.now();
      try {
        const block = await this.provider.getBlock(event.blockNumber);
        if (block && block.timestamp) {
          blockTimestamp = block.timestamp * 1000; // Convert to milliseconds
        }
      } catch (blockError) {
        console.warn(`⚠️ Failed to get block timestamp: ${blockError.message}`);
      }

      // Handle different event types
      let user, asset, amount, decimals;
      
      try {
        if (eventName === 'Liquidated') {
          // Liquidated event has different structure
          if (!event.args.user || !event.args.debtAsset || !event.args.repayAmount1e18) {
            console.error(`❌ Liquidated event missing required args:`, event.args);
            return;
          }
          user = event.args.user;
          asset = event.args.debtAsset; // Use debtAsset as primary asset
          amount = event.args.repayAmount1e18;
        } else if (eventName === 'Repaid') {
          // Repaid event: user is the payer, onBehalfOf is the borrower
          if (!event.args.asset || !event.args.amount) {
            console.error(`❌ Repaid event missing required args:`, event.args);
            return;
          }
          user = event.args.onBehalfOf || event.args.user; // Use onBehalfOf as the actual user
          asset = event.args.asset;
          amount = event.args.amount;
        } else {
          // Supplied, Withdrawn, Borrowed events
          if (!event.args.user || !event.args.asset || !event.args.amount) {
            console.error(`❌ ${eventName} event missing required args:`, event.args);
            return;
          }
          user = event.args.user;
          asset = event.args.asset;
          amount = event.args.amount;
        }
        
        console.log(`   👤 User: ${user}, Asset: ${asset}, Amount (raw): ${amount.toString()}`);
      } catch (argsError) {
        console.error(`❌ Error extracting event args: ${argsError.message}`);
        return;
      }

      // Get asset info FIRST to know the correct decimals
      let assetSymbol, assetDecimals;
      try {
        assetSymbol = await this.getAssetSymbol(asset);
        assetDecimals = await this.getAssetDecimals(asset);
        console.log(`   💰 Asset: ${assetSymbol} (${assetDecimals} decimals)`);
      } catch (assetError) {
        console.error(`❌ Error getting asset info: ${assetError.message}`);
        // Use defaults but continue
        assetSymbol = 'UNKNOWN';
        assetDecimals = 18;
      }
      
      decimals = assetDecimals;
      
      // CRITICAL: Contract emits amount in 1e18 format (normalized)
      // Amount from event is ALWAYS in 1e18 format regardless of token decimals
      // We MUST format with 18 decimals, not token decimals
      const amountIn1e18 = ethers.formatUnits(amount, 18);
      // Format to reasonable decimal places (remove trailing zeros)
      const amountFloat = parseFloat(amountIn1e18);
      // Format with up to 6 decimal places, but remove trailing zeros
      let formattedAmount = amountFloat.toFixed(6);
      // Remove trailing zeros and unnecessary decimal point
      formattedAmount = formattedAmount.replace(/\.?0+$/, '');
      console.log(`   📊 Amount (1e18): ${amountIn1e18}`);
      console.log(`   📊 Formatted amount: ${formattedAmount} ${assetSymbol}`);

      // Calculate USD value
      // IMPORTANT: amount is in 1e18 format, so we need to use 18 decimals for calculation
      let amountUSD;
      try {
        amountUSD = await this.calculateUSD(amount, asset, 18); // Always use 18 decimals because amount is 1e18
      } catch (usdError) {
        console.warn(`⚠️ Error calculating USD: ${usdError.message}`);
        // Fallback: format with 18 decimals (amount is in 1e18 format)
        amountUSD = parseFloat(ethers.formatUnits(amount, 18)) * 1;
      }

      // Get gas info (optional, don't fail if it errors)
      let gasInfo = { used: '0', price: '0', fee: '0' };
      try {
        gasInfo = await this.getGasInfo(event.transactionHash);
      } catch (gasError) {
        console.warn(`⚠️ Error getting gas info: ${gasError.message}`);
      }

      const transaction = {
        hash: event.transactionHash,
        user: user,
        asset: {
          address: asset,
          symbol: assetSymbol,
          decimals: decimals
        },
        amount: formattedAmount,
        amountRaw: amount.toString(), // Keep raw amount for reference
        amountUSD: amountUSD,
        type: this.getEventType(eventName),
        timestamp: blockTimestamp,
        blockNumber: event.blockNumber,
        gas: gasInfo,
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Additional fields for Liquidated event
      if (eventName === 'Liquidated') {
        transaction.liquidator = event.args.liquidator;
        transaction.collateralAsset = event.args.collateralAsset;
        try {
          const collateralDecimals = await this.getAssetDecimals(event.args.collateralAsset);
          transaction.collateralSeized = ethers.formatUnits(event.args.collateralSeized1e18, collateralDecimals);
        } catch (err) {
          transaction.collateralSeized = ethers.formatUnits(event.args.collateralSeized1e18, 18);
        }
      }

      // Validate database connection
      if (!this.db) {
        console.error(`❌ Database connection not available! Reconnecting...`);
        try {
          await this.client.connect();
          this.db = this.client.db('lendhub_local');
          console.log(`✅ Reconnected to database`);
        } catch (reconnectError) {
          console.error(`❌ Failed to reconnect: ${reconnectError.message}`);
          return;
        }
      }

      // Use upsert to avoid duplicate errors
      console.log(`   💾 Đang ghi transaction vào database...`);
      try {
        const result = await this.db.collection('transactions').updateOne(
          { hash: transaction.hash },
          { $set: transaction },
          { upsert: true }
        );
        
        console.log(`   ✅ Ghi database thành công (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
      } catch (dbError) {
        console.error(`❌ Error writing to database: ${dbError.message}`);
        console.error(`   Stack: ${dbError.stack}`);
        throw dbError; // Re-throw to be caught by outer catch
      }
      
      console.log(`✅ Indexed ${transaction.type} transaction: ${transaction.hash.slice(0, 10)}...`);
      console.log(`   📊 Amount: ${transaction.amount} ${transaction.asset.symbol}`);
      console.log(`   💰 USD Value: $${transaction.amountUSD.toFixed(2)}`);
      console.log(`   👤 User: ${transaction.user}`);
      
      // Update user stats
      try {
        await this.updateUserStats(transaction.user, transaction);
      } catch (userStatsError) {
        console.warn(`⚠️ Error updating user stats: ${userStatsError.message}`);
      }
      
      // Update asset stats
      try {
        await this.updateAssetStats(transaction.asset.address, transaction);
      } catch (assetStatsError) {
        console.warn(`⚠️ Error updating asset stats: ${assetStatsError.message}`);
      }
      
      // For Liquidated events, also update collateral asset stats
      if (eventName === 'Liquidated' && event.args.collateralAsset) {
        const collateralDecimals = await this.getAssetDecimals(event.args.collateralAsset);
        const collateralSymbol = await this.getAssetSymbol(event.args.collateralAsset);
        const collateralAmount = ethers.formatUnits(event.args.collateralSeized1e18, collateralDecimals);
        const collateralTransaction = {
          ...transaction,
          asset: {
            address: event.args.collateralAsset,
            symbol: collateralSymbol,
            decimals: collateralDecimals
          },
          amount: collateralAmount,
          amountUSD: await this.calculateUSD(event.args.collateralSeized1e18, event.args.collateralAsset, 18) // Always 18 decimals for 1e18 format
        };
        await this.updateAssetStats(event.args.collateralAsset, collateralTransaction);
      }
      
    } catch (error) {
      // Check if it's a duplicate key error (shouldn't happen with upsert, but just in case)
      if (error.code === 11000) {
        console.log(`⚠️ Transaction ${event.transactionHash} already exists, skipping...`);
        return;
      }
      console.error(`❌ Error processing event ${eventName || 'unknown'}:`, error.message);
      console.error(`   Event args:`, event.args);
      console.error(`   Stack:`, error.stack);
      // Don't call handleError here to avoid stopping the indexer for individual event errors
      // But log the error so we can debug
    }
  }

  getPoolABI() {
    return [
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
      'event ReserveDataUpdated(address indexed asset, uint256 liquidityRate, uint256 borrowRate, uint256 timestamp)',
      'event CollateralEnabled(address indexed user, address indexed asset)',
      'event CollateralDisabled(address indexed user, address indexed asset)',
      'event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address collateralAsset, uint256 repayAmount1e18, uint256 collateralSeized1e18)',
      'event CollateralSet(address indexed user, address indexed asset, bool useAsCollateral)'
    ];
  }

  getEventType(eventName) {
    const eventMap = {
      'Supplied': 'Lend',
      'Withdrawn': 'Withdraw', 
      'Borrowed': 'Borrow',
      'Repaid': 'Repay',
      'Liquidated': 'Liquidate'
    };
    return eventMap[eventName] || 'Unknown';
  }

  async getAssetSymbol(assetAddress) {
    try {
      // Load known assets from deployment file if available
      let knownAssets = {};
      try {
        const fs = require('fs');
        const path = require('path');
        const deploymentPath = path.join(__dirname, '..', 'deployments', 'local-chainlink.json');
        if (fs.existsSync(deploymentPath)) {
          const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          if (deployment.tokens) {
            // Map addresses to symbols
            const tokenSymbols = {
              [deployment.tokens.weth?.toLowerCase()]: 'WETH',
              [deployment.tokens.usdc?.toLowerCase()]: 'USDC',
              [deployment.tokens.dai?.toLowerCase()]: 'DAI',
              [deployment.tokens.link?.toLowerCase()]: 'LINK',
              [deployment.tokens.pepe?.toLowerCase()]: 'PEPE'
            };
            knownAssets = tokenSymbols;
          }
        }
      } catch (deploymentError) {
        // Ignore if can't load deployment file
      }
      
      // Also include hardcoded fallback
      const hardcodedAssets = {
        '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': 'USDC',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'WETH',
        '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': 'DAI',
        '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': 'WETH',
        '0x85838D7351dD76F84D95b326C09D180927F234ED': 'WETH',
        '0x2ff21A2779eD10A44d88Fcf8AA535212E2b1Da56': 'USDC',
        '0x59Fb915d1B80A25C4949B01cd96455dB13b59B1B': 'DAI',
        '0xe7966E175785b0A9F40c3328a4c1cc69961Ef104': 'LINK'
      };
      
      // Merge known assets (deployment takes priority)
      knownAssets = { ...hardcodedAssets, ...knownAssets };
      
      // Check both lowercase and original case
      const assetLower = assetAddress.toLowerCase();
      if (knownAssets[assetAddress] || knownAssets[assetLower]) {
        return knownAssets[assetAddress] || knownAssets[assetLower];
      }
      
      // Try to get symbol from contract
      const tokenContract = new ethers.Contract(assetAddress, ['function symbol() view returns (string)'], this.provider);
      const symbol = await tokenContract.symbol();
      return symbol;
    } catch (error) {
      console.warn(`⚠️ Failed to get symbol for asset ${assetAddress}:`, error.message);
      return 'UNKNOWN';
    }
  }

  async getAssetDecimals(assetAddress) {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ['function decimals() view returns (uint8)'], this.provider);
      return await tokenContract.decimals();
    } catch (error) {
      console.warn(`⚠️ Failed to get decimals for asset ${assetAddress}:`, error.message);
      return 18;
    }
  }

  async calculateUSD(amount, assetAddress, decimals = 18) {
    try {
      // CRITICAL: Amount from event is ALWAYS in 1e18 format, regardless of token decimals
      // So we MUST always use 18 decimals for formatting, not the token decimals
      const amountDecimals = 18; // Always 18 because amount is in 1e18 format
      
      let price = null;
      
      // Try Oracle contract first
      try {
        if (this.oracleAddress) {
          const oracleABI = [
            'function getAssetPrice1e18(address token) external view returns (uint256)'
          ];
          const oracle = new ethers.Contract(this.oracleAddress, oracleABI, this.provider);
          const priceWei = await oracle.getAssetPrice1e18(assetAddress);
          price = parseFloat(ethers.formatEther(priceWei));
        }
      } catch (oracleError) {
        console.warn(`⚠️ Oracle contract failed for ${assetAddress}:`, oracleError.message);
      }
      
      // Fallback to database cache if available
      if (!price) {
        try {
          const asset = await this.db.collection('assets').findOne({ address: assetAddress });
          if (asset && asset.currentPrice) {
            price = asset.currentPrice;
          }
        } catch (dbError) {
          // Ignore database errors
        }
      }
      
      // Final fallback: use default estimation
      if (!price) {
        price = 1; // Default to $1 for simplicity
      }
      
      // IMPORTANT: Always format with 18 decimals because amount is in 1e18 format
      const amountFloat = parseFloat(ethers.formatUnits(amount, amountDecimals));
      const usdValue = amountFloat * price;
      
      return usdValue;
    } catch (error) {
      console.warn(`⚠️ Failed to calculate USD for asset ${assetAddress}:`, error.message);
      // Fallback: format with 18 decimals (amount is in 1e18 format)
      const amountFloat = parseFloat(ethers.formatUnits(amount, 18));
      return amountFloat * 1; // Default estimation
    }
  }

  async getGasInfo(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return {
        used: receipt.gasUsed.toString(),
        price: tx.gasPrice.toString(),
        fee: ethers.formatEther(receipt.gasUsed * tx.gasPrice)
      };
    } catch (error) {
      console.warn(`⚠️ Failed to get gas info for tx ${txHash}:`, error.message);
      return { used: '0', price: '0', fee: '0' };
    }
  }

  async updateUserStats(userAddress, transaction) {
    try {
      await this.db.collection('users').updateOne(
        { address: userAddress },
        {
          $set: {
            address: userAddress,
            lastActivity: new Date(),
            updatedAt: new Date()
          },
          $inc: {
            totalTransactions: 1,
            totalVolume: transaction.amountUSD
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
    }
  }

  async updateAssetStats(assetAddress, transaction) {
    try {
      await this.db.collection('assets').updateOne(
        { address: assetAddress },
        {
          $set: {
            address: assetAddress,
            symbol: transaction.asset.symbol,
            decimals: transaction.asset.decimals,
            updatedAt: new Date()
          },
          $inc: {
            totalTransactions: 1,
            totalVolume: transaction.amountUSD
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating asset stats:', error);
    }
  }

  async getLastIndexedBlock() {
    try {
      const result = await this.db.collection('metadata').findOne({ key: 'lastIndexedBlock' });
      if (result && result.value) {
        return result.value;
      }
      // If no last indexed block, try to find the first block with events
      // Or start from a reasonable block (e.g., block where contract was deployed)
      console.log('ℹ️ No last indexed block found. Starting from block 0 or contract deployment block...');
      return 0; // Start from block 0, or you can set a specific deployment block
    } catch (error) {
      console.warn('⚠️ Failed to get last indexed block:', error.message);
      return 0;
    }
  }

  async updateLastIndexedBlock(blockNumber) {
    try {
      await this.db.collection('metadata').updateOne(
        { key: 'lastIndexedBlock' },
        { 
          $set: { 
            value: blockNumber, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Error updating last indexed block:', error);
    }
  }

  async handleError(error) {
    this.retryCount++;
    console.error(`❌ Error occurred (${this.retryCount}/${this.maxRetries}):`, error.message);
    
    // Reset retry count after successful operations
    if (this.retryCount > 0 && this.isRunning) {
      // Reset after some time if indexer is running smoothly
      setTimeout(() => {
        if (this.isRunning) {
          this.retryCount = 0;
          this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;
        }
      }, 60000); // Reset after 1 minute
    }
    
    if (this.retryCount < this.maxRetries) {
      console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      this.retryDelay *= 2; // Exponential backoff
      // Cap max delay at 30 seconds
      if (this.retryDelay > 30000) {
        this.retryDelay = 30000;
      }
    } else {
      console.error('❌ Max retries exceeded. Indexer will continue but errors may persist.');
      // Don't exit, just log the error and continue
      this.retryCount = 0; // Reset to allow future retries
      this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;
    }
  }

  async stop() {
    this.isRunning = false;
    await this.client.close();
    console.log('🛑 Indexer stopped');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down indexer...');
  await indexer.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down indexer...');
  await indexer.stop();
  process.exit(0);
});

// Start indexer
const indexer = new LendHubIndexer();
indexer.start().catch(console.error);

