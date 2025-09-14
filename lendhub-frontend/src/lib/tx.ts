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
      hash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status
    });
    
    return {
      hash: receipt.transactionHash,
      receipt
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
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  const txPromise = poolContract.borrow(tokenAddress, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Borrowing tokens...',
    success: 'Tokens borrowed successfully!',
    error: 'Borrow failed'
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
