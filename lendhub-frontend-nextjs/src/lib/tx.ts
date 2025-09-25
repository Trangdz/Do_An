// Transaction service with toast notifications
import { ethers } from 'ethers';
import { ERC20_ABI, POOL_ABI } from '../config/abis';
import { CONFIG } from '../config/contracts';
import { formatUnits, parseUnits } from 'ethers';

// Toast notification types
export interface ToastConfig {
  pending: string;
  success: string;
  error: string;
}

// Transaction result
export interface TxResult {
  hash: string;
  receipt: ethers.TransactionReceipt;
}

/**
 * Send transaction with toast notifications
 */
export async function sendWithToast(
  txPromise: Promise<ethers.TransactionResponse>,
  config: ToastConfig
): Promise<TxResult> {
  try {
    // Show pending toast
    console.log('⏳', config.pending);
    
    // Send transaction
    const tx = await txPromise;
    console.log('📤 Transaction sent:', tx.hash);
    
    // Show pending with hash
    console.log('⏳', `${config.pending} - Hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('✅', config.success);
    console.log('📋 Receipt:', {
      hash: tx.hash,
      gasUsed: receipt?.gasUsed?.toString(),
      status: receipt?.status
    });
    
    return {
      hash: tx.hash,
      receipt: receipt!
    };
    
  } catch (error: any) {
    console.error('❌', config.error);
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Approve ERC20 token if needed
 */
export async function approveIfNeeded(
  signer: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint
): Promise<TxResult | null> {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const userAddress = await signer.getAddress();
  
  // Check current allowance
  const currentAllowance = await tokenContract.allowance(userAddress, spender);
  
  if (currentAllowance >= amount) {
    console.log('✅ Allowance sufficient, skipping approval');
    return null;
  }
  
  console.log('📝 Approval needed:', {
    current: currentAllowance.toString(),
    required: amount.toString()
  });
  
  // Send approval transaction
  const txPromise = tokenContract.approve(spender, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Approving token...',
    success: 'Token approved successfully!',
    error: 'Approval failed'
  });
}

/**
 * Lend tokens to the pool
 */
export async function lend(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
): Promise<TxResult> {
  const provider = signer.provider as ethers.Provider;
  if (!provider) throw new Error('No provider');

  // Disallow native ETH here. To supply ETH, wrap to WETH first using wrapEth().
  if (!tokenAddress || tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()) {
    throw new Error('Cannot supply native ETH via LendingPool. Wrap to WETH first.');
  }

  // Preflight: verify addresses are real contracts
  const poolCode = await provider.getCode(CONFIG.LENDING_POOL);
  if (!poolCode || poolCode === '0x') {
    throw new Error('LendingPool address is not a contract on this network. Check CONFIG.LENDING_POOL and network.');
  }
  const tokenCode = await provider.getCode(tokenAddress);
  if (!tokenCode || tokenCode === '0x') {
    throw new Error('Token address is not a contract on this network.');
  }

  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  // Approve if needed
  await approveIfNeeded(signer, tokenAddress, CONFIG.LENDING_POOL, amount);
  
  // Send lend transaction
  const txPromise = poolContract.lend(tokenAddress, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  });
}

/**
 * Withdraw tokens from the pool
 */
export async function withdraw(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
): Promise<TxResult> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  const txPromise = poolContract.withdraw(tokenAddress, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Withdrawing tokens...',
    success: 'Tokens withdrawn successfully!',
    error: 'Withdraw failed'
  });
}

/**
 * Borrow tokens from the pool
 */
export async function borrow(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
): Promise<TxResult> {
  // Block invalid asset: native ETH cannot be borrowed
  if (!tokenAddress || tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()) {
    throw new Error('Cannot borrow native ETH. Select an ERC20 asset (e.g., DAI).');
  }
  
  // Block WETH borrowing (not allowed in this protocol)
  if (tokenAddress.toLowerCase() === CONFIG.WETH.toLowerCase()) {
    throw new Error('Cannot borrow WETH. Borrow DAI/USDC instead.');
  }
  
  // Preflight: verify addresses point to real contracts on current network
  const provider = signer.provider as ethers.Provider;
  if (!provider) throw new Error('No provider');
  
  const poolCode = await provider.getCode(CONFIG.LENDING_POOL);
  if (!poolCode || poolCode === '0x') {
    throw new Error('LendingPool address is not a contract on this network. Check CONFIG.LENDING_POOL and network.');
  }
  
  const tokenCode = await provider.getCode(tokenAddress);
  if (!tokenCode || tokenCode === '0x') {
    throw new Error('Token address is not a contract on this network.');
  }

  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  // Enhanced validation before borrowing
  try {
    const reserve = await poolContract.reserves(tokenAddress);
    const isBorrowable = Boolean(reserve.isBorrowable);
    const reserveDecimals = Number(reserve.decimals ?? 18);
    const reserveCash = Number(ethers.formatUnits(reserve.reserveCash, reserveDecimals));
    
    if (!isBorrowable) {
      throw new Error('This asset is not borrowable. Please select a borrowable asset.');
    }
    
    if (reserveCash <= 0) {
      throw new Error('Pool has no liquidity for this asset. Please try another asset or add liquidity first.');
    }
    
    // Check if amount is reasonable (not exceeding available liquidity)
    const availableLiquidity = ethers.parseUnits(reserveCash.toString(), reserveDecimals);
    if (amount > availableLiquidity) {
      throw new Error(`Amount exceeds available liquidity. Max: ${ethers.formatUnits(availableLiquidity, reserveDecimals)}`);
    }
    
    // Check user account data for health factor
    const userAddress = await signer.getAddress();
    const accountData = await poolContract.getAccountData(userAddress);
    const collateralUSD = parseFloat(ethers.formatEther(accountData.collateralValue1e18));
    const debtUSD = parseFloat(ethers.formatEther(accountData.debtValue1e18));
    const healthFactor = parseFloat(ethers.formatEther(accountData.healthFactor1e18));
    
    if (collateralUSD <= 0) {
      throw new Error('No collateral provided. Please supply assets first to use as collateral.');
    }
    
    if (healthFactor < 1.1) { // Allow some buffer
      throw new Error(`Health factor too low (${healthFactor.toFixed(2)}). Please supply more collateral or reduce borrow amount.`);
    }
    
    console.log('✅ Borrow validation passed:', {
      isBorrowable,
      reserveCash: ethers.formatUnits(reserve.reserveCash, reserveDecimals),
      collateralUSD,
      debtUSD,
      healthFactor
    });
    
  } catch (error: any) {
    if (error.message.includes('not borrowable') || 
        error.message.includes('no liquidity') || 
        error.message.includes('exceeds available') ||
        error.message.includes('No collateral') ||
        error.message.includes('Health factor')) {
      throw error; // Re-throw validation errors
    }
    console.warn('[borrow] Could not validate reserve data:', error.message);
  }

  // Gas estimate with safe headroom
  let overrides: any = {};
  try {
    const gas = await poolContract.borrow.estimateGas(tokenAddress, amount);
    const gasBig = BigInt(gas.toString());
    overrides = { gasLimit: (gasBig * BigInt(12)) / BigInt(10) };
  } catch {
    // Fallback fixed gasLimit to bypass provider estimateGas issues
    overrides = { gasLimit: BigInt(1200000) };
  }

  // Ensure we're calling the correct function with proper encoding
  console.log('🔍 Borrow transaction details:');
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Amount: ${amount.toString()}`);
  console.log(`   Pool: ${CONFIG.LENDING_POOL}`);
  
  const txPromise = poolContract.borrow(tokenAddress, amount, overrides);

  return await sendWithToast(txPromise, {
    pending: 'Borrowing tokens...',
    success: 'Tokens borrowed successfully!',
    error: 'Borrow failed'
  }).catch((e) => {
    const raw = (e?.shortMessage || e?.message || '').toString();
    // Surface revert reason if present from provider
    throw new Error(raw.replace(/\n.*/, ''));
  });
}

/**
 * Repay borrowed tokens
 */
export async function repay(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  userAddress?: string
): Promise<TxResult> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  const borrower = userAddress || await signer.getAddress();
  
  // Approve if needed
  await approveIfNeeded(signer, tokenAddress, CONFIG.LENDING_POOL, amount);
  
  const txPromise = poolContract.repay(tokenAddress, amount, borrower);
  
  return await sendWithToast(txPromise, {
    pending: 'Repaying tokens...',
    success: 'Tokens repaid successfully!',
    error: 'Repay failed'
  });
}

/**
 * Liquidate a position
 */
export async function liquidate(
  signer: ethers.Signer,
  collateralAsset: string,
  debtAsset: string,
  debtAmount: bigint,
  userAddress: string
): Promise<TxResult> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  const txPromise = poolContract.liquidationCall(collateralAsset, debtAsset, debtAmount, userAddress);
  
  return await sendWithToast(txPromise, {
    pending: 'Liquidating position...',
    success: 'Position liquidated successfully!',
    error: 'Liquidation failed'
  });
}

/**
 * Accrue interest for all reserves
 */
export async function accruePublic(signer: ethers.Signer): Promise<TxResult> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  const txPromise = poolContract.accruePublic();
  
  return await sendWithToast(txPromise, {
    pending: 'Accruing interest...',
    success: 'Interest accrued successfully!',
    error: 'Accrue failed'
  });
}

/**
 * Get user's token balance
 */
export async function getTokenBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  userAddress: string,
  decimals: number = 18
): Promise<string> {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await tokenContract.balanceOf(userAddress);
  return formatUnits(balance, decimals);
}

/**
 * Get user's token allowance
 */
export async function getTokenAllowance(
  provider: ethers.Provider,
  tokenAddress: string,
  userAddress: string,
  spender: string,
  decimals: number = 18
): Promise<string> {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const allowance = await tokenContract.allowance(userAddress, spender);
  return formatUnits(allowance, decimals);
}

/**
 * Parse token amount to BigInt
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

/**
 * Format token amount from BigInt
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

/**
 * Wrap native ETH to WETH via deposit() payable
 */
export async function wrapEth(
  signer: ethers.Signer,
  wethAddress: string,
  amountEth: string
): Promise<TxResult> {
  const provider = signer.provider as ethers.Provider;
  if (!provider) throw new Error('No provider');
  const code = await provider.getCode(wethAddress);
  if (!code || code === '0x') {
    throw new Error('WETH address is not a contract on this network.');
  }

  const WETH_ABI = ['function deposit() payable', 'function balanceOf(address) view returns (uint256)'];
  const weth = new ethers.Contract(wethAddress, WETH_ABI, signer);

  const value = ethers.parseEther(amountEth);
  const txPromise = weth.deposit({ value });

  return await sendWithToast(txPromise, {
    pending: 'Wrapping ETH to WETH...',
    success: 'ETH wrapped to WETH successfully!',
    error: 'Wrap ETH failed'
  });
}
