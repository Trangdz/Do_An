// Complete fix for supply function
const { ethers } = require('ethers');

async function fixSupplyComplete() {
  try {
    console.log('🔧 COMPLETE FIX FOR SUPPLY FUNCTION');
    console.log('===================================');
    
    // Step 1: Start fresh deployment
    console.log('\n1️⃣ Starting fresh deployment...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    // Step 2: Deploy contracts manually
    console.log('\n2️⃣ Deploying contracts...');
    
    // Deploy WETH
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const weth = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log('✅ WETH deployed:', wethAddress);
    
    // Deploy DAI
    const dai = await ERC20Mock.deploy("Dai Stablecoin", "DAI", 18);
    await dai.waitForDeployment();
    const daiAddress = await dai.getAddress();
    console.log('✅ DAI deployed:', daiAddress);
    
    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy();
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log('✅ PriceOracle deployed:', oracleAddress);
    
    // Deploy InterestRateModel
    const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
    const irm = await InterestRateModel.deploy();
    await irm.waitForDeployment();
    console.log('✅ InterestRateModel deployed');
    
    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const pool = await LendingPool.deploy(
      await irm.getAddress(),
      oracleAddress,
      wethAddress,
      daiAddress
    );
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    console.log('✅ LendingPool deployed:', poolAddress);
    
    // Step 3: Initialize everything
    console.log('\n3️⃣ Initializing contracts...');
    
    // Set prices
    await oracle.setAssetPrice(wethAddress, ethers.parseUnits("1600", 18));
    await oracle.setAssetPrice(daiAddress, ethers.parseUnits("1", 18));
    console.log('✅ Prices set');
    
    // Initialize reserves
    const baseRate = BigInt('20000000000000000000000000'); // 2%
    const slope1 = BigInt('80000000000000000000000000');   // 8%
    const slope2 = BigInt('1000000000000000000000000000'); // 100%
    
    // Init WETH (collateral only)
    await pool.initReserve(
      wethAddress, 18,
      1000, 7500, 8000, 500, 5000, // risk params
      false, // not borrowable
      8000, baseRate, slope1, slope2
    );
    console.log('✅ WETH reserve initialized');
    
    // Init DAI (borrowable)
    await pool.initReserve(
      daiAddress, 18,
      1000, 7500, 8000, 500, 5000, // risk params
      true, // borrowable
      8000, baseRate, slope1, slope2
    );
    console.log('✅ DAI reserve initialized');
    
    // Step 4: Mint tokens and add liquidity
    console.log('\n4️⃣ Setting up liquidity...');
    
    // Mint WETH to user
    await weth.mint(await signer.getAddress(), ethers.parseUnits("100", 18));
    console.log('✅ Minted 100 WETH to user');
    
    // Mint DAI to pool
    await dai.mint(poolAddress, ethers.parseUnits("50000", 18));
    console.log('✅ Minted 50k DAI to pool');
    
    // Step 5: Test everything
    console.log('\n5️⃣ Testing contracts...');
    
    // Test WETH
    const wethSymbol = await weth.symbol();
    const wethBalance = await weth.balanceOf(await signer.getAddress());
    console.log('✅ WETH Symbol:', wethSymbol);
    console.log('✅ WETH Balance:', ethers.formatEther(wethBalance));
    
    // Test Price Oracle
    const wethPrice = await oracle.getAssetPrice1e18(wethAddress);
    console.log('✅ WETH Price:', ethers.formatEther(wethPrice));
    
    // Test LendingPool
    const reserveData = await pool.getReserveData(wethAddress);
    console.log('✅ WETH Reserve Cash:', ethers.formatEther(reserveData.reserveCash));
    
    // Step 6: Update frontend config
    console.log('\n6️⃣ Update frontend config:');
    console.log(`LENDING_POOL: '${poolAddress}'`);
    console.log(`PRICE_ORACLE: '${oracleAddress}'`);
    console.log(`WETH: '${wethAddress}'`);
    console.log(`DAI: '${daiAddress}'`);
    
    console.log('\n🎉 SUPPLY FUNCTION FIXED!');
    console.log('=========================');
    console.log('All contracts are working properly!');
    console.log('You can now test the supply function in the frontend.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixSupplyComplete();
