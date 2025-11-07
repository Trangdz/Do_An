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
  isApproval?: boolean; // Flag to indicate if this was an approval transaction
}

// Optional toast callback for UI notifications
export type ToastCallback = (toast: { type: 'success' | 'error' | 'pending'; title: string; message: string; hash?: string }) => void;

/**
 * Send transaction with toast notifications
 */
export async function sendWithToast(
  txPromise: Promise<ethers.TransactionResponse>,
  config: ToastConfig,
  toastCallback?: ToastCallback
): Promise<TxResult> {
  try {
    // Show pending toast
    console.log('⏳', config.pending);
    if (toastCallback) {
      toastCallback({ type: 'pending', title: config.pending, message: 'Waiting for transaction...' });
    }
    
    // Send transaction
    const tx = await txPromise;
    console.log('📤 Transaction sent:', tx.hash);
    
    // Show pending with hash
    console.log('⏳', `${config.pending} - Hash: ${tx.hash}`);
    if (toastCallback) {
      toastCallback({ type: 'pending', title: config.pending, message: `Transaction sent: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`, hash: tx.hash });
    }
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('✅', config.success);
    console.log('📋 Receipt:', {
      hash: tx.hash,
      gasUsed: receipt?.gasUsed?.toString(),
      status: receipt?.status
    });
    
    // Show success toast
    if (toastCallback) {
      toastCallback({ type: 'success', title: config.success, message: `Transaction confirmed: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`, hash: tx.hash });
    }
    
    return {
      hash: tx.hash,
      receipt: receipt!
    };
    
  } catch (error: any) {
    console.error('❌', config.error);
    console.error('Error details:', error);
    // Detect user rejection consistently across providers
    const rawMsg =
      error?.reason ||
      error?.shortMessage ||
      error?.info?.error?.message ||
      error?.error?.message ||
      error?.data?.message ||
      error?.message ||
      '';
    const code = error?.code ?? error?.info?.error?.code;
    const isUserRejected = /denied|user denied|ACTION_REJECTED|rejected/i.test(String(rawMsg)) || code === 4001;
    if (isUserRejected) {
      // Normalize to a stable, catchable message
      if (toastCallback) {
        toastCallback({ type: 'error', title: 'Transaction Cancelled', message: 'You cancelled the transaction' });
      }
      throw new Error('USER_CANCELLED');
    }
    const clean = String(rawMsg || 'Transaction failed').replace(/\n.*/, '');
    if (toastCallback) {
      toastCallback({ type: 'error', title: config.error, message: clean });
    }
    throw new Error(clean);
  }
}

/**
 * Approve ERC20 token if needed
 */
export async function approveIfNeeded(
  signer: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  toastCallback?: ToastCallback
): Promise<TxResult | null> {
  // Disallow native ETH approvals
  if (!tokenAddress || tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()) {
    throw new Error('Cannot approve native ETH. Select an ERC20 token.');
  }

  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const userAddress = await signer.getAddress();

  // Check current allowance with defensive guards: non-contract / BAD_DATA → treat as 0
  let currentAllowance: bigint = BigInt(0);
  try {
    const provider = signer.provider as ethers.Provider;
    const code = provider && await provider.getCode(tokenAddress);
    if (!code || code === '0x') {
      console.warn('[approveIfNeeded] tokenAddress has no code, treating allowance as 0');
    } else {
      currentAllowance = await tokenContract.allowance(userAddress, spender);
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/could not decode result|BAD_DATA|missing revert data/i.test(msg)) {
      console.warn('[approveIfNeeded] allowance decode failed, treating as 0');
      currentAllowance = BigInt(0);
    } else {
      throw e;
    }
  }
  
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
  
  const result = await sendWithToast(txPromise, {
    pending: 'Approving token...',
    success: 'Token approved successfully!',
    error: 'Approval failed'
  }, toastCallback);
  
  return { ...result, isApproval: true };
}

/**
 * Lend tokens to the pool
 */
export async function lend(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  toastCallback?: ToastCallback
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
  
  // Approve if needed (with toast callback to show approval progress)
  const approvalResult = await approveIfNeeded(signer, tokenAddress, CONFIG.LENDING_POOL, amount, toastCallback);
  
  // If approval happened, wait a bit for state to be updated before proceeding
  if (approvalResult && approvalResult.isApproval) {
    console.log('⏳ Approval completed, waiting for state update before supplying...');
    // Small delay to ensure allowance state is updated on-chain
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Pre-flight simulate to get explicit revert reason instead of -32603
  try {
    await poolContract.getFunction("lend").staticCall(tokenAddress, amount);
  } catch (err: any) {
    const msg = String(err?.reason || err?.shortMessage || err?.message || 'Supply failed');
    throw new Error(msg);
  }

  // Send lend transaction
  const txPromise = poolContract.lend(tokenAddress, amount);
  
  return await sendWithToast(txPromise, {
    pending: 'Supplying tokens...',
    success: 'Tokens supplied successfully!',
    error: 'Supply failed'
  }, toastCallback);
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
  // Pre-flight static call to surface revert reasons (instead of generic -32603)
  try {
    // ethers v6: use getFunction(...).staticCall to simulate
    await poolContract.getFunction("withdraw").staticCall(tokenAddress, amount);
  } catch (err: any) {
    // Map common revert reasons to user-friendly messages
    const msg = String(err?.reason || err?.shortMessage || err?.message || "Withdraw failed");
    let friendly = msg;
    if (msg.includes("Health factor too low")) friendly = "Health Factor sẽ giảm dưới ngưỡng an toàn. Giảm số lượng rút hoặc trả bớt nợ.";
    else if (msg.includes("Insufficient liquidity")) friendly = "Thanh khoản pool không đủ để rút số lượng này.";
    else if (msg.includes("No collateral enabled")) friendly = "Bạn chưa bật tài sản làm tài sản thế chấp (collateral).";
    else if (msg.match(/insufficient funds|balance/gi)) friendly = "Số dư không đủ hoặc vượt quá số đã supply.";
    else if (amount === BigInt(0)) friendly = "Số lượng rút phải lớn hơn 0.";
    throw new Error(friendly);
  }

  // Try to estimate gas and add 20% buffer to avoid send-time -32603
  let overrides: any = {};
  try {
    const gas = await poolContract.withdraw.estimateGas(tokenAddress, amount);
    const gasBig = BigInt(gas.toString());
    overrides = { gasLimit: (gasBig * BigInt(12)) / BigInt(10) };
  } catch (e) {
    // fallback gas limit if provider couldn't estimate (still safe on L2/local)
    overrides = { gasLimit: BigInt(500000) };
  }

  const txPromise = poolContract.withdraw(tokenAddress, amount, overrides);

  const result = await sendWithToast(txPromise, {
    pending: 'Withdrawing tokens...',
    success: 'Tokens withdrawn successfully!',
    error: 'Withdraw failed'
  });

  // After successful withdraw, refresh APR/Available snapshot immediately
  try {
    const provider = signer.provider as ethers.Provider;
    const { triggerAPRRefresh } = await import('../hooks/useSharedAPR');
    await triggerAPRRefresh(provider, CONFIG.LENDING_POOL, tokenAddress);
  } catch (e) {
    console.warn('[withdraw] post-refresh failed:', (e as any)?.message || e);
  }

  // Clear realtime interest cache for this user/asset to avoid showing dust after withdraw
  try {
    const user = await signer.getAddress();
    const pool = CONFIG.LENDING_POOL;
    if (typeof window !== 'undefined') {
      const supplyKey = `ri:${pool}:${user}:${tokenAddress}:s`;
      const borrowKey = `ri:${pool}:${user}:${tokenAddress}:b`;
      localStorage.removeItem(supplyKey);
      // borrow unaffected, but clear just in case the UI shares keys
      localStorage.removeItem(borrowKey);
    }
  } catch {}

  return result;
}

/**
 * Simulate withdraw to determine the exact amount the contract will withdraw at this moment.
 * Returns the token-denominated amount that should be sent to match the static result, minus 1 wei.
 */
export async function dryRunWithdrawAmount(
  provider: ethers.Provider,
  userAddress: string,
  tokenAddress: string,
  requestedAmount: bigint
): Promise<bigint> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
  const reserve = await poolContract.reserves(tokenAddress);
  const decimals: number = Number(reserve.decimals ?? 18);
  // Static call to get the exact amount in 1e18 that would be withdrawn
  let wouldWithdraw1e18: bigint = BigInt(0);
  try {
    wouldWithdraw1e18 = await poolContract.getFunction('withdraw').staticCall(tokenAddress, requestedAmount, { from: userAddress });
  } catch (e) {
    // If static call fails (e.g., HF too low), just return 0
    return BigInt(0);
  }
  if (wouldWithdraw1e18 <= BigInt(0)) return BigInt(0);
  // Convert from 1e18 to token decimals and subtract 1 wei to avoid dust
  const scale = BigInt('1' + '0'.repeat(decimals));
  const amountToken = (wouldWithdraw1e18 * scale) / BigInt(1e18);
  return amountToken > BigInt(1) ? amountToken - BigInt(1) : amountToken;
}

/**
 * Compute maximum withdrawable amount for a user and asset, respecting:
 *  - User current aToken balance (principal × currentIndex / snapshotIndex)
 *  - Pool available liquidity (reserveCash)
 *  - Collateral constraint from LTV (ltvBps)
 * Returns bigint amount in token units (decimals from reserve.decimals)
 */
export async function computeMaxWithdraw(
  provider: ethers.Provider,
  userAddress: string,
  assetAddress: string,
  priceUSD: number // current token price in USD
): Promise<{ amount: bigint; decimals: number }> {
  const pool = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);

  const [reserve, userRes, account] = await Promise.all([
    pool.reserves(assetAddress),
    pool.userReserves(userAddress, assetAddress),
    pool.getAccountData(userAddress)
  ]);

  const decimals: number = Number(reserve.decimals ?? 18);

  // User supply position
  const principal = Number(userRes.supply?.principal ?? BigInt(0)) / 1e18;
  const snapshotIndex = Number(userRes.supply?.index ?? BigInt(0)) || 1;
  const currentIndex = Number(reserve.liquidityIndex ?? BigInt(0)) || snapshotIndex;
  const balance = principal * (currentIndex / snapshotIndex);

  // Liquidity available
  const availableLiquidity = Number(formatUnits(reserve.reserveCash, decimals));

  // Collateral limit based on LTV
  const collateralUSD = parseFloat(formatUnits(account.collateralValue1e18, 18));
  const debtUSD = parseFloat(formatUnits(account.debtValue1e18, 18));
  const ltvBps = Number(account.ltvBps ?? 0);
  const ltv = ltvBps / 10000;
  const withdrawableUSD = Math.max(0, collateralUSD * ltv - debtUSD);
  const maxByCollateral = priceUSD > 0 ? withdrawableUSD / priceUSD : balance;

  let max = Math.min(availableLiquidity, balance, maxByCollateral);
  if (!isFinite(max) || max < 0) max = 0;

  // Return as bigint with decimals, minus 1 wei to avoid dust rounding
  const scale = 10 ** decimals;
  const safeScaled = BigInt(Math.max(0, Math.floor(max * scale - 1)));
  return { amount: safeScaled, decimals };
}

/**
 * Withdraw maximum safe amount. Caller can pass priceUSD from pricing oracle/UI.
 */
export async function withdrawMax(
  signer: ethers.Signer,
  tokenAddress: string,
  priceUSD: number
): Promise<TxResult> {
  const provider = signer.provider as ethers.Provider;
  const user = await signer.getAddress();
  const { amount, decimals } = await computeMaxWithdraw(provider, user, tokenAddress, priceUSD);
  // If below 1 wei of token, treat as nothing to withdraw
  if (amount <= BigInt(0)) throw new Error('Nothing to withdraw');
  // Refine using a static call to match contract's clamp exactly at this block
  const refined = await dryRunWithdrawAmount(provider, user, tokenAddress, amount);
  const finalAmount = refined > BigInt(0) ? refined : (amount > BigInt(1) ? amount - BigInt(1) : amount);
  return await withdraw(signer, tokenAddress, finalAmount);
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
  
  // Pre-flight simulate to reveal revert reason (prevents generic -32603 in send)
  try {
    await poolContract.getFunction("borrow").staticCall(tokenAddress, amount);
  } catch (err: any) {
    // Map and surface the reason clearly
    const msg = String(err?.reason || err?.shortMessage || err?.message || 'Borrow failed');
    throw new Error(msg);
  }

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
  debtAsset: string,
  collateralAsset: string,
  debtAmount: bigint,
  userAddress: string
): Promise<TxResult> {
  const poolContract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
  
  // Contract signature: liquidationCall(debtAsset, collateralAsset, user, repayRequested)
  const txPromise = poolContract.liquidationCall(debtAsset, collateralAsset, userAddress, debtAmount);
  
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
  try {
    if (!provider || !tokenAddress || !userAddress) {
      console.warn('❌ [getTokenBalance] Missing parameters', { provider: !!provider, tokenAddress, userAddress });
      return "0";
    }
    
    // Check if contract has code before creating contract instance
    try {
      const code = await provider.getCode(tokenAddress);
      if (!code || code === '0x') {
        console.error(`❌ [getTokenBalance] Token contract has no code at ${tokenAddress}`);
        return "0";
      }
      console.log(`✅ [getTokenBalance] Contract code exists (${code.length} bytes) for ${tokenAddress}`);
    } catch (codeError: any) {
      console.error(`❌ [getTokenBalance] Error checking contract code:`, {
        tokenAddress,
        error: codeError.message,
        code: codeError.code
      });
      return "0";
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    console.log(`🔍 [getTokenBalance] Calling balanceOf(${userAddress}) for token ${tokenAddress}`);
    
    // Retry logic for circuit breaker errors
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const balance = await tokenContract.balanceOf(userAddress);
        const formatted = formatUnits(balance, decimals);
        if (attempt > 0) {
          console.log(`✅ [getTokenBalance] Balance fetched on attempt ${attempt + 1}: ${formatted}`);
        } else {
          console.log(`✅ [getTokenBalance] Balance: ${formatted} (decimals: ${decimals})`);
        }
        return formatted;
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a circuit breaker error
        const isCircuitBreaker = 
          error?.code === -32603 ||
          error?.cause?.isBrokenCircuitError ||
          error?.message?.includes('circuit breaker');
        
        if (isCircuitBreaker && attempt < 2) {
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`⚠️ [getTokenBalance] Circuit breaker open, retrying in ${waitTime}ms... (attempt ${attempt + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If not circuit breaker or max attempts reached, throw
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
    
  } catch (error: any) {
    // Only log non-circuit-breaker errors (circuit breaker is temporary)
    const isCircuitBreaker = 
      error?.code === -32603 ||
      error?.cause?.isBrokenCircuitError ||
      error?.message?.includes('circuit breaker');
    
    if (!isCircuitBreaker) {
      console.error('❌ [getTokenBalance] Error:', {
        tokenAddress,
        userAddress,
        decimals,
        error: error.message,
        code: error.code,
        reason: error.reason,
        shortMessage: error.shortMessage,
        stack: error.stack
      });
    }
    return "0";
  }
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
  try {
    // Native ETH or non-contract → no allowance
    if (!tokenAddress || tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()) {
      console.log(`ℹ️ [getTokenAllowance] Native ETH, no allowance needed`);
      return '0';
    }
    
    console.log(`🔍 [getTokenAllowance] Checking allowance for token ${tokenAddress}, user ${userAddress}, spender ${spender}`);
    
    const code = await provider.getCode(tokenAddress);
    if (!code || code === '0x') {
      console.error(`❌ [getTokenAllowance] Token contract has no code at ${tokenAddress}`);
      return '0';
    }
    console.log(`✅ [getTokenAllowance] Contract code exists (${code.length} bytes)`);
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    console.log(`📊 [getTokenAllowance] Calling allowance(${userAddress}, ${spender})`);
    const allowance = await tokenContract.allowance(userAddress, spender);
    const formatted = formatUnits(allowance, decimals);
    console.log(`✅ [getTokenAllowance] Allowance: ${formatted} (decimals: ${decimals})`);
    return formatted;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/could not decode result|BAD_DATA|missing revert data/i.test(msg)) {
      console.warn('⚠️ [getTokenAllowance] Decode failed:', { tokenAddress, userAddress, spender, error: msg });
      return '0';
    }
    console.error('❌ [getTokenAllowance] Error:', {
      tokenAddress,
      userAddress,
      spender,
      decimals,
      error: msg,
      code: e?.code,
      reason: e?.reason,
      shortMessage: e?.shortMessage
    });
    return '0';
  }
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
 * High-level helper for Withdraw modal.
 * - If isMax = true: uses withdrawMax() to avoid dust/rounding and LTV/liquidity issues
 * - Else: parses amount string and calls withdraw()
 * - Always refreshes APR/Available after success (handled inside withdraw())
 */
export async function withdrawFromUi(
  signer: ethers.Signer,
  tokenAddress: string,
  tokenDecimals: number,
  opts: { amountInput?: string; isMax?: boolean; priceUSD: number }
): Promise<TxResult> {
  const { isMax, amountInput, priceUSD } = opts;
  if (isMax) {
    return await withdrawMax(signer, tokenAddress, priceUSD);
  }
  if (!amountInput || Number(amountInput) <= 0) throw new Error('Amount must be greater than 0');
  const parsed = parseUnits(amountInput, tokenDecimals);
  return await withdraw(signer, tokenAddress, parsed);
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
