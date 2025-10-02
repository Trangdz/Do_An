import { ethers } from 'ethers';

export interface GasResult {
  success: boolean;
  gasEstimate?: bigint;
  error?: string;
  retryCount: number;
  steps: DebugStep[];
}

export interface DebugStep {
  step: number;
  action: string;
  success: boolean;
  details: string;
  data?: any;
}

export interface RepayParams {
  poolContract: ethers.Contract;
  tokenContract: ethers.Contract;
  userAddress: string;
  tokenAddress: string;
  amount: bigint;
  decimals: number;
}

/**
 * 5-Step Debug Helper for Missing Revert Data (estimateGas)
 * 
 * Step 1: Run callStatic.repay(amount) to catch exact revert point
 * Step 2: Log debtRaw, allowanceRaw, balanceRaw, amountRaw before sending
 * Step 3: If amountRaw > allowanceRaw: auto-approve and retry
 * Step 4: If amountRaw > balanceRaw: cap to balanceRaw or show UX error
 * Step 5: If using MaxUint256, retry with debtRaw + 1 wei
 */
export async function safeEstimate(
  txBuilder: () => Promise<ethers.ContractTransactionResponse>,
  repayParams: RepayParams
): Promise<GasResult> {
  const steps: DebugStep[] = [];
  let retryCount = 0;
  const maxRetries = 3;

  const { poolContract, tokenContract, userAddress, tokenAddress, amount, decimals } = repayParams;

  try {
    // Step 1: Run callStatic.repay(amount) to catch exact revert point
    steps.push({
      step: 1,
      action: "callStatic.repay() - Catch exact revert point",
      success: false,
      details: "Attempting to simulate repay transaction"
    });

    try {
      await poolContract.callStatic.repay(tokenAddress, amount, userAddress);
      steps[0].success = true;
      steps[0].details = "callStatic.repay() succeeded - no revert detected";
    } catch (callStaticError: any) {
      steps[0].success = false;
      steps[0].details = `callStatic.repay() failed: ${callStaticError.message}`;
      steps[0].data = { error: callStaticError.message };
      
      // Log the exact revert reason
      console.error("🔍 Step 1 - callStatic.repay() failed:", callStaticError.message);
    }

    // Step 2: Log debtRaw, allowanceRaw, balanceRaw, amountRaw before sending
    steps.push({
      step: 2,
      action: "Log all raw values before sending",
      success: false,
      details: "Fetching and logging debt, allowance, balance, and amount"
    });

    const [debtRaw, allowanceRaw, balanceRaw] = await Promise.all([
      getCurrentDebtRaw(poolContract, userAddress, tokenAddress),
      getAllowanceRaw(tokenContract, userAddress, await poolContract.getAddress()),
      getBalanceRaw(tokenContract, userAddress)
    ]);

    const logData = {
      debtRaw: debtRaw.toString(),
      allowanceRaw: allowanceRaw.toString(),
      balanceRaw: balanceRaw.toString(),
      amountRaw: amount.toString(),
      debtHuman: ethers.formatUnits(debtRaw, decimals),
      allowanceHuman: ethers.formatUnits(allowanceRaw, decimals),
      balanceHuman: ethers.formatUnits(balanceRaw, decimals),
      amountHuman: ethers.formatUnits(amount, decimals)
    };

    steps[1].success = true;
    steps[1].details = "All raw values logged successfully";
    steps[1].data = logData;

    console.log("🔍 Step 2 - Raw values:", logData);

    // Step 3: If amountRaw > allowanceRaw: auto-approve and retry
    if (amount > allowanceRaw) {
      steps.push({
        step: 3,
        action: "Auto-approve - amount > allowance",
        success: false,
        details: `Amount (${amount.toString()}) > Allowance (${allowanceRaw.toString()})`
      });

      try {
        console.log("🔍 Step 3 - Auto-approving...");
        const approveTx = await tokenContract.approve(await poolContract.getAddress(), amount);
        await approveTx.wait();
        
        steps[2].success = true;
        steps[2].details = `Successfully approved ${amount.toString()} tokens`;
        
        // Update allowance after approval
        const newAllowance = await getAllowanceRaw(tokenContract, userAddress, await poolContract.getAddress());
        steps[2].data = { newAllowance: newAllowance.toString() };
        
        console.log("✅ Step 3 - Auto-approval successful");
      } catch (approveError: any) {
        steps[2].success = false;
        steps[2].details = `Auto-approval failed: ${approveError.message}`;
        steps[2].data = { error: approveError.message };
        
        console.error("❌ Step 3 - Auto-approval failed:", approveError.message);
        return {
          success: false,
          error: `Auto-approval failed: ${approveError.message}`,
          retryCount,
          steps
        };
      }
    } else {
      steps.push({
        step: 3,
        action: "Auto-approve - amount <= allowance",
        success: true,
        details: `Amount (${amount.toString()}) <= Allowance (${allowanceRaw.toString()}) - no approval needed`
      });
    }

    // Step 4: If amountRaw > balanceRaw: cap to balanceRaw or show UX error
    if (amount > balanceRaw) {
      steps.push({
        step: 4,
        action: "Balance check - amount > balance",
        success: false,
        details: `Amount (${amount.toString()}) > Balance (${balanceRaw.toString()})`
      });

      // Cap amount to balance
      const cappedAmount = balanceRaw;
      steps[3].success = true;
      steps[3].details = `Amount capped to balance: ${cappedAmount.toString()}`;
      steps[3].data = { 
        originalAmount: amount.toString(),
        cappedAmount: cappedAmount.toString()
      };

      console.log("🔍 Step 4 - Amount capped to balance:", {
        original: amount.toString(),
        capped: cappedAmount.toString()
      });

      // Update amount for retry
      amount = cappedAmount;
    } else {
      steps.push({
        step: 4,
        action: "Balance check - amount <= balance",
        success: true,
        details: `Amount (${amount.toString()}) <= Balance (${balanceRaw.toString()}) - no capping needed`
      });
    }

    // Step 5: If using MaxUint256, retry with debtRaw + 1 wei
    if (amount === ethers.MaxUint256) {
      steps.push({
        step: 5,
        action: "MaxUint256 fallback - retry with debtRaw + 1 wei",
        success: false,
        details: `MaxUint256 detected, retrying with ${debtRaw + 1n}`
      });

      const fallbackAmount = debtRaw + 1n;
      steps[4].success = true;
      steps[4].details = `Retrying with debtRaw + 1 wei: ${fallbackAmount.toString()}`;
      steps[4].data = { 
        originalAmount: amount.toString(),
        fallbackAmount: fallbackAmount.toString()
      };

      console.log("🔍 Step 5 - MaxUint256 fallback:", {
        original: amount.toString(),
        fallback: fallbackAmount.toString()
      });

      // Update amount for retry
      amount = fallbackAmount;
    } else {
      steps.push({
        step: 5,
        action: "MaxUint256 check - not using MaxUint256",
        success: true,
        details: `Amount (${amount.toString()}) is not MaxUint256 - no fallback needed`
      });
    }

    // Final gas estimation attempt
    console.log("🔍 Final gas estimation attempt with amount:", amount.toString());
    
    const gasEstimate = await poolContract.repay.estimateGas(tokenAddress, amount, userAddress);
    
    steps.push({
      step: 6,
      action: "Final gas estimation",
      success: true,
      details: `Gas estimation successful: ${gasEstimate.toString()} gas`
    });

    console.log("✅ Gas estimation successful:", gasEstimate.toString());

    return {
      success: true,
      gasEstimate,
      retryCount,
      steps
    };

  } catch (error: any) {
    console.error("❌ safeEstimate failed:", error);
    
    steps.push({
      step: steps.length + 1,
      action: "Final gas estimation",
      success: false,
      details: `Gas estimation failed: ${error.message}`,
      data: { error: error.message }
    });

    return {
      success: false,
      error: error.message,
      retryCount,
      steps
    };
  }
}

/**
 * Get current debt in raw units (18 decimals)
 */
async function getCurrentDebtRaw(
  poolContract: ethers.Contract,
  userAddress: string,
  tokenAddress: string
): Promise<bigint> {
  try {
    // Try getBorrowBalance first (if available)
    const totalDebt = await poolContract.getBorrowBalance(userAddress, tokenAddress);
    return totalDebt;
  } catch (error) {
    // Fallback to userReserves
    const userReserve = await poolContract.userReserves(userAddress, tokenAddress);
    return userReserve.borrow.principal;
  }
}

/**
 * Get allowance in raw units
 */
async function getAllowanceRaw(
  tokenContract: ethers.Contract,
  owner: string,
  spender: string
): Promise<bigint> {
  return await tokenContract.allowance(owner, spender);
}

/**
 * Get balance in raw units
 */
async function getBalanceRaw(
  tokenContract: ethers.Contract,
  account: string
): Promise<bigint> {
  return await tokenContract.balanceOf(account);
}

/**
 * Enhanced repay function with debug helper
 */
export async function repayWithDebug(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  decimals: number
): Promise<ethers.TransactionResponse> {
  const userAddress = await signer.getAddress();
  const poolAddress = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '';
  
  const poolContract = new ethers.Contract(
    poolAddress,
    [
      'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
      'function getBorrowBalance(address user, address asset) external view returns (uint256)',
      'function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
    ],
    signer
  );

  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)'
    ],
    signer
  );

  const repayParams: RepayParams = {
    poolContract,
    tokenContract,
    userAddress,
    tokenAddress,
    amount,
    decimals
  };

  // Use safeEstimate to debug and fix issues
  const gasResult = await safeEstimate(
    () => poolContract.repay(tokenAddress, amount, userAddress),
    repayParams
  );

  if (!gasResult.success) {
    throw new Error(`Gas estimation failed: ${gasResult.error}`);
  }

  // Execute the transaction with estimated gas
  const tx = await poolContract.repay(tokenAddress, amount, userAddress, {
    gasLimit: gasResult.gasEstimate
  });

  return tx;
}

/**
 * Debug helper for specific error scenarios
 */
export async function debugRepayError(
  error: any,
  repayParams: RepayParams
): Promise<DebugStep[]> {
  const steps: DebugStep[] = [];
  
  try {
    // Analyze the error
    steps.push({
      step: 1,
      action: "Error Analysis",
      success: false,
      details: `Analyzing error: ${error.message}`,
      data: { error: error.message }
    });

    // Check if it's a gas estimation error
    if (error.message?.includes('missing revert data') || error.message?.includes('estimateGas')) {
      steps.push({
        step: 2,
        action: "Gas Estimation Error Detected",
        success: true,
        details: "This is a gas estimation error, likely due to revert in simulation"
      });

      // Try callStatic to get exact revert reason
      try {
        await repayParams.poolContract.callStatic.repay(
          repayParams.tokenAddress, 
          repayParams.amount, 
          repayParams.userAddress
        );
      } catch (callStaticError: any) {
        steps.push({
          step: 3,
          action: "callStatic.repay() Analysis",
          success: false,
          details: `callStatic failed: ${callStaticError.message}`,
          data: { callStaticError: callStaticError.message }
        });
      }
    }

    return steps;
  } catch (debugError: any) {
    steps.push({
      step: steps.length + 1,
      action: "Debug Error",
      success: false,
      details: `Debug failed: ${debugError.message}`,
      data: { debugError: debugError.message }
    });
    
    return steps;
  }
}
