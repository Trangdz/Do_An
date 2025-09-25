import { ethers } from 'ethers';

// Contract addresses (update these with your deployed addresses)
const CONFIG = {
  LENDING_POOL: '0x399664b80eb2706667a95418542109390cf5327e8',
  WETH: '0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B',
  DAI: '0xcc5d3852732a4c0e39bdf58955eed86d2eaa9934',
  USDC: '0x...', // Add your USDC address
};

// LendingPool ABI
const LENDING_POOL_ABI = [
  'function supply(address asset, uint256 amount) external',
  'function withdraw(address asset, uint256 amount) external',
  'function borrow(address asset, uint256 amount) external',
  'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
  'function reserves(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
  'function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
  'function isSupported(address asset) external view returns (bool)',
  
  // Events
  'event Supply(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  'event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  
  // Errors
  'error InsufficientBalance(uint256 balance, uint256 required)',
  'error InsufficientAllowance(uint256 allowance, uint256 required)',
  'error AssetNotSupported(address asset)',
  'error AmountTooSmall(uint256 amount)',
  'error Paused()',
  'error Unauthorized()'
];

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

interface SupplyParams {
  asset: string;
  amount: string; // Amount in human-readable format (e.g., "1.5")
  user: string;
  signer: ethers.Signer;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class SupplyValidator {
  private provider: ethers.Provider;
  private lendingPool: ethers.Contract;
  
  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.lendingPool = new ethers.Contract(CONFIG.LENDING_POOL, LENDING_POOL_ABI, provider);
  }

  /**
   * 1. CHECKLIST XÁC MINH
   */
  async validateSupply(params: SupplyParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 === SUPPLY VALIDATION CHECKLIST ===\n');

    // 1.1 Check if LendingPool is a contract
    console.log('1️⃣ Checking LendingPool contract...');
    try {
      const poolCode = await this.provider.getCode(CONFIG.LENDING_POOL);
      if (poolCode === '0x') {
        errors.push(`LendingPool address ${CONFIG.LENDING_POOL} is not a contract`);
        console.log('   ❌ LendingPool is not a contract');
      } else {
        console.log('   ✅ LendingPool is a valid contract');
      }
    } catch (error) {
      errors.push(`Failed to check LendingPool contract: ${error.message}`);
      console.log('   ❌ Failed to check LendingPool contract');
    }

    // 1.2 Check if asset is a valid ERC20 token
    console.log('\n2️⃣ Checking asset token...');
    try {
      const assetCode = await this.provider.getCode(params.asset);
      if (assetCode === '0x') {
        errors.push(`Asset address ${params.asset} is not a contract`);
        console.log('   ❌ Asset is not a contract');
      } else {
        console.log('   ✅ Asset is a valid contract');
        
        // Check if it's an ERC20 token by calling decimals()
        const token = new ethers.Contract(params.asset, ERC20_ABI, this.provider);
        try {
          const decimals = await token.decimals();
          const symbol = await token.symbol();
          console.log(`   ✅ Token decimals: ${decimals}, symbol: ${symbol}`);
        } catch (tokenError) {
          warnings.push(`Asset may not be a valid ERC20 token: ${tokenError.message}`);
          console.log('   ⚠️  Asset may not be a valid ERC20 token');
        }
      }
    } catch (error) {
      errors.push(`Failed to check asset contract: ${error.message}`);
      console.log('   ❌ Failed to check asset contract');
    }

    // 1.3 Check if asset is supported by LendingPool
    console.log('\n3️⃣ Checking if asset is supported...');
    try {
      const isSupported = await this.lendingPool.isSupported(params.asset);
      if (!isSupported) {
        errors.push(`Asset ${params.asset} is not supported by LendingPool`);
        console.log('   ❌ Asset is not supported');
      } else {
        console.log('   ✅ Asset is supported');
      }
    } catch (error) {
      warnings.push(`Could not check if asset is supported: ${error.message}`);
      console.log('   ⚠️  Could not check asset support');
    }

    // 1.4 Check user balance
    console.log('\n4️⃣ Checking user balance...');
    try {
      const token = new ethers.Contract(params.asset, ERC20_ABI, this.provider);
      const balance = await token.balanceOf(params.user);
      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);
      
      console.log(`   User balance: ${ethers.formatUnits(balance, decimals)}`);
      console.log(`   Required amount: ${params.amount}`);
      
      if (balance < amountWei) {
        errors.push(`Insufficient balance: ${ethers.formatUnits(balance, decimals)} < ${params.amount}`);
        console.log('   ❌ Insufficient balance');
      } else {
        console.log('   ✅ Sufficient balance');
      }
    } catch (error) {
      errors.push(`Failed to check user balance: ${error.message}`);
      console.log('   ❌ Failed to check balance');
    }

    // 1.5 Check allowance
    console.log('\n5️⃣ Checking allowance...');
    try {
      const token = new ethers.Contract(params.asset, ERC20_ABI, this.provider);
      const allowance = await token.allowance(params.user, CONFIG.LENDING_POOL);
      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);
      
      console.log(`   Current allowance: ${ethers.formatUnits(allowance, decimals)}`);
      console.log(`   Required amount: ${params.amount}`);
      
      if (allowance < amountWei) {
        warnings.push(`Insufficient allowance: ${ethers.formatUnits(allowance, decimals)} < ${params.amount}`);
        console.log('   ⚠️  Insufficient allowance (will need approval)');
      } else {
        console.log('   ✅ Sufficient allowance');
      }
    } catch (error) {
      errors.push(`Failed to check allowance: ${error.message}`);
      console.log('   ❌ Failed to check allowance');
    }

    // 1.6 Check amount > 0
    console.log('\n6️⃣ Checking amount validity...');
    if (parseFloat(params.amount) <= 0) {
      errors.push('Amount must be greater than 0');
      console.log('   ❌ Amount must be > 0');
    } else {
      console.log('   ✅ Amount is valid');
    }

    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 2. CODE ETHER V6 CHUẨN ĐỂ SUPPLY
   */
  async executeSupply(params: SupplyParams): Promise<ethers.TransactionResponse> {
    console.log('\n🚀 === EXECUTING SUPPLY ===\n');

    // 2.1 Get token contract and decimals
    console.log('1️⃣ Getting token info...');
    const token = new ethers.Contract(params.asset, ERC20_ABI, params.signer);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    const amountWei = ethers.parseUnits(params.amount, decimals);
    
    console.log(`   Token: ${symbol} (${decimals} decimals)`);
    console.log(`   Amount: ${params.amount} ${symbol} = ${amountWei.toString()} wei`);

    // 2.2 Check and handle allowance
    console.log('\n2️⃣ Checking allowance...');
    const currentAllowance = await token.allowance(params.user, CONFIG.LENDING_POOL);
    
    if (currentAllowance < amountWei) {
      console.log('   ⚠️  Insufficient allowance, requesting approval...');
      
      try {
        // Approve the exact amount needed
        const approveTx = await token.approve(CONFIG.LENDING_POOL, amountWei);
        console.log(`   📝 Approval transaction: ${approveTx.hash}`);
        
        // Wait for approval to be mined
        console.log('   ⏳ Waiting for approval to be mined...');
        const approveReceipt = await approveTx.wait();
        console.log(`   ✅ Approval confirmed in block ${approveReceipt.blockNumber}`);
        
      } catch (approveError) {
        throw new Error(`Approval failed: ${approveError.message}`);
      }
    } else {
      console.log('   ✅ Sufficient allowance already exists');
    }

    // 2.3 Execute supply transaction
    console.log('\n3️⃣ Executing supply transaction...');
    
    try {
      // Create LendingPool contract with signer
      const lendingPool = new ethers.Contract(CONFIG.LENDING_POOL, LENDING_POOL_ABI, params.signer);
      
      // Call supply function (no value needed, ethers will auto-estimate gas)
      const supplyTx = await lendingPool.supply(params.asset, amountWei);
      console.log(`   📝 Supply transaction: ${supplyTx.hash}`);
      
      // Wait for transaction to be mined
      console.log('   ⏳ Waiting for supply transaction to be mined...');
      const supplyReceipt = await supplyTx.wait();
      console.log(`   ✅ Supply confirmed in block ${supplyReceipt.blockNumber}`);
      
      // 2.4 Parse and log events
      console.log('\n4️⃣ Parsing events...');
      if (supplyReceipt.logs && supplyReceipt.logs.length > 0) {
        const iface = new ethers.Interface(LENDING_POOL_ABI);
        
        for (const log of supplyReceipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) {
              console.log(`   📋 Event: ${parsed.name}`);
              console.log(`   Args: ${JSON.stringify(parsed.args, null, 2)}`);
            }
          } catch (parseError) {
            // Log might be from token contract, try ERC20 interface
            try {
              const tokenIface = new ethers.Interface(ERC20_ABI);
              const parsed = tokenIface.parseLog(log);
              if (parsed) {
                console.log(`   📋 Token Event: ${parsed.name}`);
                console.log(`   Args: ${JSON.stringify(parsed.args, null, 2)}`);
              }
            } catch (tokenParseError) {
              console.log(`   📋 Raw log: ${log.topics} ${log.data}`);
            }
          }
        }
      } else {
        console.log('   📋 No events found in transaction');
      }
      
      return supplyTx;
      
    } catch (supplyError) {
      console.log(`   ❌ Supply transaction failed: ${supplyError.message}`);
      
      // Try to extract revert reason
      if (supplyError.data) {
        try {
          const iface = new ethers.Interface(LENDING_POOL_ABI);
          const error = iface.parseError(supplyError.data);
          console.log(`   🔍 Revert reason: ${error.name}`);
          console.log(`   Error args: ${JSON.stringify(error.args, null, 2)}`);
        } catch (parseError) {
          console.log(`   🔍 Raw revert data: ${supplyError.data}`);
        }
      }
      
      throw supplyError;
    }
  }

  /**
   * 3. NGUYÊN NHÂN REVERT VÀ CÁCH FIX
   */
  async diagnoseRevertReasons(params: SupplyParams): Promise<void> {
    console.log('\n🔍 === REVERT DIAGNOSIS ===\n');

    try {
      // Check amount > 0
      if (parseFloat(params.amount) <= 0) {
        console.log('❌ REVERT REASON: Amount must be greater than 0');
        console.log('   FIX: Ensure amount > 0');
        return;
      }

      // Check asset support
      try {
        const isSupported = await this.lendingPool.isSupported(params.asset);
        if (!isSupported) {
          console.log('❌ REVERT REASON: Asset not supported');
          console.log('   FIX: Use a supported asset or add support for this asset');
          return;
        }
      } catch (error) {
        console.log('⚠️  Could not check asset support');
      }

      // Check user balance
      const token = new ethers.Contract(params.asset, ERC20_ABI, this.provider);
      const balance = await token.balanceOf(params.user);
      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);
      
      if (balance < amountWei) {
        console.log('❌ REVERT REASON: Insufficient balance');
        console.log(`   Current: ${ethers.formatUnits(balance, decimals)}`);
        console.log(`   Required: ${params.amount}`);
        console.log('   FIX: Ensure user has sufficient token balance');
        return;
      }

      // Check allowance
      const allowance = await token.allowance(params.user, CONFIG.LENDING_POOL);
      if (allowance < amountWei) {
        console.log('❌ REVERT REASON: Insufficient allowance');
        console.log(`   Current: ${ethers.formatUnits(allowance, decimals)}`);
        console.log(`   Required: ${params.amount}`);
        console.log('   FIX: Call token.approve(lendingPool, amount) first');
        return;
      }

      // Check if contract is paused
      try {
        const isPaused = await this.lendingPool.paused();
        if (isPaused) {
          console.log('❌ REVERT REASON: Contract is paused');
          console.log('   FIX: Wait for contract to be unpaused or contact admin');
          return;
        }
      } catch (error) {
        console.log('⚠️  Could not check pause status');
      }

      // Check reserve data
      try {
        const reserveData = await this.lendingPool.reserves(params.asset);
        console.log('📊 Reserve data:');
        console.log(`   Reserve cash: ${ethers.formatEther(reserveData.reserveCash)}`);
        console.log(`   Total debt: ${ethers.formatEther(reserveData.totalDebt)}`);
        console.log(`   Utilization: ${ethers.formatUnits(reserveData.utilizationWad, 18)}`);
        console.log(`   Is borrowable: ${reserveData.isBorrowable}`);
        console.log(`   LTV: ${reserveData.ltv} bps`);
      } catch (error) {
        console.log('⚠️  Could not get reserve data');
      }

      console.log('✅ All checks passed - transaction should succeed');

    } catch (error) {
      console.log(`❌ Diagnosis failed: ${error.message}`);
    }
  }
}

// Main execution function
async function main() {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = await provider.getSigner(); // Use first account
  
  // Example parameters
  const params: SupplyParams = {
    asset: CONFIG.DAI, // Use DAI token
    amount: '1.0', // Supply 1 DAI
    user: await signer.getAddress(),
    signer: signer
  };

  console.log('🎯 Supply Parameters:');
  console.log(`   Asset: ${params.asset}`);
  console.log(`   Amount: ${params.amount}`);
  console.log(`   User: ${params.user}`);
  console.log(`   LendingPool: ${CONFIG.LENDING_POOL}\n`);

  const validator = new SupplyValidator(provider);

  try {
    // 1. Validate supply
    const validation = await validator.validateSupply(params);
    
    if (!validation.isValid) {
      console.log('\n❌ Validation failed - cannot proceed with supply');
      return;
    }

    // 2. Diagnose potential revert reasons
    await validator.diagnoseRevertReasons(params);

    // 3. Execute supply
    const tx = await validator.executeSupply(params);
    console.log(`\n🎉 Supply successful! Transaction: ${tx.hash}`);

  } catch (error) {
    console.log(`\n❌ Supply failed: ${error.message}`);
  }
}

// Export for use in other modules
export { SupplyValidator, SupplyParams, ValidationResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
