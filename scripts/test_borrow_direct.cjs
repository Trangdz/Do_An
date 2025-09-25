const { ethers } = require('ethers');

// Contract addresses from deployment
const CONFIG = {
  LENDING_POOL: '0x39964b80eB2706667A95418542109390cf5327e8',
  WETH: '0xCC5d3852732A4c0E39bDF58955eed6d2eaA9934f',
  DAI: '0xE77be8336e186013748411FF700E06ECaCAbC89d',
  USDC: '0x3BbaD74725bb4c2B8c03f66e4FF4d70b7b1A0FCf'
};

const LENDING_POOL_ABI = [
  'function borrow(address asset, uint256 amount) external',
  'function lend(address asset, uint256 amount) external',
  'function reserves(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
];

const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function deposit() payable'
];

async function testBorrowDirect() {
  console.log('🧪 === DIRECT BORROW TEST ===\n');
  
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const [deployer, user1, user2] = await provider.listAccounts();
  const signer1 = await provider.getSigner(user1);
  const signer2 = await provider.getSigner(user2);
  
  console.log('👥 Accounts:');
  console.log(`   User1: ${user1}`);
  console.log(`   User2: ${user2}\n`);

  try {
    // 1. Check contracts exist
    console.log('1️⃣ Checking contracts...');
    const poolCode = await provider.getCode(CONFIG.LENDING_POOL);
    const wethCode = await provider.getCode(CONFIG.WETH);
    const daiCode = await provider.getCode(CONFIG.DAI);
    
    console.log(`   LendingPool: ${poolCode !== '0x' ? '✅' : '❌'}`);
    console.log(`   WETH: ${wethCode !== '0x' ? '✅' : '❌'}`);
    console.log(`   DAI: ${daiCode !== '0x' ? '✅' : '❌'}\n`);

    // 2. User1 wraps ETH to WETH
    console.log('2️⃣ User1 wrapping ETH...');
    const weth = new ethers.Contract(CONFIG.WETH, ERC20_ABI, signer1);
    const wrapTx = await weth.deposit({ value: ethers.parseEther('10') });
    await wrapTx.wait();
    console.log('   ✅ Wrapped 10 ETH to WETH\n');

    // 3. User1 supplies WETH as collateral
    console.log('3️⃣ User1 supplying WETH...');
    const pool = new ethers.Contract(CONFIG.LENDING_POOL, LENDING_POOL_ABI, signer1);
    const supplyAmount = ethers.parseEther('5');
    
    await weth.approve(CONFIG.LENDING_POOL, supplyAmount);
    await weth.approve(CONFIG.LENDING_POOL, supplyAmount).wait();
    
    const supplyTx = await pool.lend(CONFIG.WETH, supplyAmount);
    await supplyTx.wait();
    console.log('   ✅ Supplied 5 WETH\n');

    // 4. User2 supplies DAI for liquidity
    console.log('4️⃣ User2 supplying DAI...');
    const dai = new ethers.Contract(CONFIG.DAI, ERC20_ABI, signer2);
    const daiSupplyAmount = ethers.parseEther('1000');
    
    await dai.approve(CONFIG.LENDING_POOL, daiSupplyAmount);
    await dai.approve(CONFIG.LENDING_POOL, daiSupplyAmount).wait();
    
    const daiSupplyTx = await pool.lend(CONFIG.DAI, daiSupplyAmount);
    await daiSupplyTx.wait();
    console.log('   ✅ Supplied 1000 DAI\n');

    // 5. Check reserves
    console.log('5️⃣ Checking reserves...');
    const wethReserve = await pool.reserves(CONFIG.WETH);
    const daiReserve = await pool.reserves(CONFIG.DAI);
    
    console.log(`   WETH reserve: ${ethers.formatEther(wethReserve.reserveCash)} (borrowable: ${wethReserve.isBorrowable})`);
    console.log(`   DAI reserve: ${ethers.formatEther(daiReserve.reserveCash)} (borrowable: ${daiReserve.isBorrowable})\n`);

    // 6. Check User1 account
    console.log('6️⃣ Checking User1 account...');
    const accountData = await pool.getAccountData(user1);
    const collateralUSD = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
    const debtUSD = parseFloat(ethers.formatEther(accountData.debtValue1e18));
    const healthFactor = parseFloat(ethers.formatEther(accountData.healthFactor1e18));
    
    console.log(`   Collateral: $${collateralUSD.toFixed(2)}`);
    console.log(`   Debt: $${debtUSD.toFixed(2)}`);
    console.log(`   Health Factor: ${healthFactor.toFixed(2)}\n`);

    // 7. Try to borrow DAI
    console.log('7️⃣ User1 borrowing DAI...');
    const borrowAmount = ethers.parseEther('100');
    
    try {
      const borrowTx = await pool.borrow(CONFIG.DAI, borrowAmount);
      await borrowTx.wait();
      
      const daiBalance = await dai.balanceOf(user1);
      console.log(`   ✅ Successfully borrowed 100 DAI`);
      console.log(`   User1 DAI balance: ${ethers.formatEther(daiBalance)}\n`);
      
    } catch (borrowError) {
      console.log(`   ❌ Borrow failed: ${borrowError.message}\n`);
      
      // Detailed diagnosis
      console.log('🔍 Diagnosis:');
      console.log(`   DAI is borrowable: ${daiReserve.isBorrowable}`);
      console.log(`   DAI reserve cash: ${ethers.formatEther(daiReserve.reserveCash)}`);
      console.log(`   User1 collateral: $${collateralUSD.toFixed(2)}`);
      console.log(`   User1 health factor: ${healthFactor.toFixed(2)}`);
      
      if (!daiReserve.isBorrowable) {
        console.log('   → DAI is not marked as borrowable in reserve');
      }
      if (parseFloat(ethers.formatEther(daiReserve.reserveCash)) <= 0) {
        console.log('   → DAI reserve has no liquidity');
      }
      if (collateralUSD <= 0) {
        console.log('   → User1 has no collateral');
      }
      if (healthFactor < 1.1) {
        console.log('   → Health factor too low');
      }
    }

    console.log('🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBorrowDirect().catch(console.error);
