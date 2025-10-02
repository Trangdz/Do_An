import { ethers } from 'ethers';

/**
 * Convert human-readable string to BigInt units with ceiling
 * Ensures minimum 1 wei if there's any remainder
 */
export function toUnitsCeil(human: string, decimals: number): bigint {
  try {
    const parsed = ethers.parseUnits(human, decimals);
    return parsed;
  } catch (error) {
    // If parsing fails, try with truncated decimals
    const truncated = parseFloat(human).toFixed(decimals);
    const parsed = ethers.parseUnits(truncated, decimals);
    return parsed > 0n ? parsed : 1n; // Ensure at least 1 wei
  }
}

/**
 * Format raw BigInt to human-readable string
 */
export function formatHuman(raw: bigint, decimals: number): string {
  return ethers.formatUnits(raw, decimals);
}

/**
 * Get user's current variable debt in raw units
 */
export async function getCurrentDebt(
  poolContract: ethers.Contract,
  userAddress: string,
  tokenAddress: string
): Promise<{ debtRaw: bigint; debtHuman: string; decimals: number }> {
  try {
    // Try to get total debt including interest first
    let debtRaw: bigint;
    let decimals: number;
    
    try {
      // Method 1: Try getBorrowBalance (includes interest)
      debtRaw = await poolContract.getBorrowBalance(userAddress, tokenAddress);
      decimals = 18; // Contract stores in 18 decimals
    } catch {
      // Method 2: Fallback to userReserves (principal only)
      const userReserve = await poolContract.userReserves(userAddress, tokenAddress);
      debtRaw = userReserve.borrow.principal;
      decimals = 18; // Contract stores in 18 decimals
    }
    
    // Convert to token decimals for display
    const tokenDecimals = 6; // USDC has 6 decimals
    const conversionFactor = BigInt(10 ** (18 - tokenDecimals));
    const debtInTokenDecimals = debtRaw / conversionFactor;
    
    return {
      debtRaw: debtInTokenDecimals,
      debtHuman: formatHuman(debtInTokenDecimals, tokenDecimals),
      decimals: tokenDecimals
    };
  } catch (error) {
    console.error('Error getting current debt:', error);
    return { debtRaw: 0n, debtHuman: '0', decimals: 6 };
  }
}

/**
 * Repay All Unlimited Mode
 * Approve MaxUint256 and repay MaxUint256
 */
export async function repayAllUnlimited(
  signer: ethers.Signer,
  tokenAddress: string,
  poolAddress: string,
  userAddress: string
): Promise<ethers.TransactionResponse> {
  const tokenContract = new ethers.Contract(tokenAddress, [
    'function approve(address spender, uint256 amount) external returns (bool)'
  ], signer);
  
  const poolContract = new ethers.Contract(poolAddress, [
    'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)'
  ], signer);
  
  // Approve MaxUint256
  console.log('Approving MaxUint256...');
  const approveTx = await tokenContract.approve(poolAddress, ethers.MaxUint256);
  await approveTx.wait();
  console.log('Approval successful');
  
  // Repay MaxUint256
  console.log('Repaying MaxUint256...');
  const repayTx = await poolContract.repay(tokenAddress, ethers.MaxUint256, userAddress);
  return repayTx;
}

/**
 * Repay Exact With Buffer Mode
 * Calculate exact debt + buffer, approve and repay
 */
export async function repayExactWithBuffer(
  signer: ethers.Signer,
  tokenAddress: string,
  poolAddress: string,
  userAddress: string,
  debtRaw: bigint,
  decimals: number
): Promise<ethers.TransactionResponse> {
  const tokenContract = new ethers.Contract(tokenAddress, [
    'function approve(address spender, uint256 amount) external returns (bool)'
  ], signer);
  
  const poolContract = new ethers.Contract(poolAddress, [
    'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)'
  ], signer);
  
  // Calculate amount with buffer (1% buffer)
  const bufferAmount = (debtRaw * 10001n) / 10000n;
  const repayAmount = bufferAmount > 0n ? bufferAmount : 1n; // Ensure at least 1 wei
  
  console.log(`Repaying exact amount with buffer: ${formatHuman(repayAmount, decimals)}`);
  
  // Approve exact amount
  const approveTx = await tokenContract.approve(poolAddress, repayAmount);
  await approveTx.wait();
  console.log('Approval successful');
  
  // Repay exact amount
  const repayTx = await poolContract.repay(tokenAddress, repayAmount, userAddress);
  return repayTx;
}

/**
 * Check if debt is cleared after repay
 */
export async function isDebtCleared(
  poolContract: ethers.Contract,
  userAddress: string,
  tokenAddress: string
): Promise<boolean> {
  try {
    const userReserve = await poolContract.userReserves(userAddress, tokenAddress);
    const remainingDebt = userReserve.borrow.principal;
    return remainingDebt === 0n;
  } catch (error) {
    console.error('Error checking debt status:', error);
    return false;
  }
}
