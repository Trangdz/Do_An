# 5-Step Debug Helper for Missing Revert Data (estimateGas)

## Overview

This debug helper addresses the persistent "missing revert data" error during gas estimation by implementing a systematic 5-step approach to identify and resolve the root cause.

## The 5 Steps

### **Step 1: Run callStatic.repay(amount) and catch exact revert point**
```typescript
try {
  await poolContract.callStatic.repay(tokenAddress, amount, userAddress);
  console.log("✅ callStatic.repay() succeeded - no revert detected");
} catch (callStaticError) {
  console.log("❌ callStatic.repay() failed:", callStaticError.message);
  // This gives us the exact revert reason
}
```

**Purpose**: `callStatic` simulates the transaction without sending it, revealing the exact revert reason that would cause gas estimation to fail.

### **Step 2: Log debtRaw, allowanceRaw, balanceRaw, amountRaw before sending**
```typescript
const [debtRaw, allowanceRaw, balanceRaw] = await Promise.all([
  getCurrentDebtRaw(poolContract, userAddress, tokenAddress),
  getAllowanceRaw(tokenContract, userAddress, poolAddress),
  getBalanceRaw(tokenContract, userAddress)
]);

const logData = {
  debtRaw: debtRaw.toString(),
  allowanceRaw: allowanceRaw.toString(),
  balanceRaw: balanceRaw.toString(),
  amountRaw: amount.toString(),
  // ... human-readable versions
};
```

**Purpose**: Provides complete visibility into all relevant values before attempting the transaction.

### **Step 3: If amountRaw > allowanceRaw: auto-approve and retry**
```typescript
if (amount > allowanceRaw) {
  console.log("Auto-approving...");
  const approveTx = await tokenContract.approve(poolAddress, amount);
  await approveTx.wait();
  console.log("✅ Auto-approval successful");
}
```

**Purpose**: Automatically resolves insufficient allowance issues that would cause reverts.

### **Step 4: If amountRaw > balanceRaw: cap to balanceRaw or show UX error**
```typescript
if (amount > balanceRaw) {
  const cappedAmount = balanceRaw;
  console.log(`Amount capped to balance: ${cappedAmount.toString()}`);
  // Update amount for retry
  amount = cappedAmount;
}
```

**Purpose**: Prevents reverts due to insufficient balance by capping the amount.

### **Step 5: If using MaxUint256, retry with debtRaw + 1 wei**
```typescript
if (amount === ethers.MaxUint256) {
  const fallbackAmount = debtRaw + 1n;
  console.log(`Retrying with debtRaw + 1 wei: ${fallbackAmount.toString()}`);
  // Update amount for retry
  amount = fallbackAmount;
}
```

**Purpose**: `MaxUint256` often causes gas estimation failures; this provides a more reasonable fallback.

## Implementation

### **Core Helper Function**
```typescript
export async function safeEstimate(
  txBuilder: () => Promise<ethers.ContractTransactionResponse>,
  repayParams: RepayParams
): Promise<GasResult>
```

### **Enhanced Repay Function**
```typescript
export async function repayWithDebug(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  decimals: number
): Promise<ethers.TransactionResponse>
```

### **React Hook Integration**
```typescript
export function useRepayDebug(): UseRepayDebugReturn {
  // Provides debugging state and functions
  // Integrates with React components
}
```

## Usage Examples

### **Basic Usage**
```typescript
import { repayWithDebug } from '../lib/debugHelpers';

// Instead of direct contract call
const tx = await repayWithDebug(signer, tokenAddress, amount, decimals);
```

### **React Component Integration**
```tsx
import { useRepayDebug } from '../hooks/useRepayDebug';

function RepayModal() {
  const { executeRepayWithDebug, debugSteps, isDebugging } = useRepayDebug();
  
  const handleRepay = async () => {
    try {
      const tx = await executeRepayWithDebug(signer, tokenAddress, amount, decimals);
      // Handle success
    } catch (error) {
      // Debug steps are automatically populated
      console.log('Debug steps:', debugSteps);
    }
  };
}
```

### **Manual Debug Analysis**
```typescript
import { debugRepayError } from '../lib/debugHelpers';

try {
  // Some repay operation
} catch (error) {
  const debugSteps = await debugRepayError(error, repayParams);
  console.log('Debug analysis:', debugSteps);
}
```

## Debug Output

### **Step-by-Step Logging**
```
🔍 Step 1: callStatic.repay() - Catch exact revert point
❌ callStatic.repay() failed: Insufficient allowance

🔍 Step 2: Log all raw values before sending
Raw values: {
  debtRaw: "1000000000000000000",
  allowanceRaw: "0",
  balanceRaw: "5000000000000000000",
  amountRaw: "1000000000000000000"
}

🔍 Step 3: Auto-approve if amount > allowance
Amount (1000000000000000000) > Allowance (0)
Auto-approving...
✅ Auto-approval successful

🔍 Step 4: Balance check - cap if amount > balance
Amount (1000000000000000000) <= Balance (5000000000000000000) - no capping needed

🔍 Step 5: MaxUint256 fallback check
Amount (1000000000000000000) is not MaxUint256 - no fallback needed

🔍 Final gas estimation attempt
✅ Gas estimation successful: 150000
```

### **Debug Steps Array**
```typescript
interface DebugStep {
  step: number;
  action: string;
  success: boolean;
  details: string;
  data?: any;
}
```

## Error Scenarios Handled

### **1. Insufficient Allowance**
- **Detection**: `amount > allowanceRaw`
- **Resolution**: Auto-approve the required amount
- **Retry**: Yes, with updated allowance

### **2. Insufficient Balance**
- **Detection**: `amount > balanceRaw`
- **Resolution**: Cap amount to available balance
- **Retry**: Yes, with capped amount

### **3. MaxUint256 Issues**
- **Detection**: `amount === ethers.MaxUint256`
- **Resolution**: Use `debtRaw + 1n` instead
- **Retry**: Yes, with fallback amount

### **4. Contract Reverts**
- **Detection**: `callStatic.repay()` fails
- **Resolution**: Log exact revert reason
- **Retry**: Depends on revert reason

### **5. Gas Estimation Failures**
- **Detection**: `estimateGas()` throws
- **Resolution**: Try alternative amounts
- **Retry**: Yes, with different amounts

## Testing

### **Run Debug Helper Test**
```bash
npx hardhat run scripts/test_debug_helper.cjs --network localhost
```

### **Expected Output**
```
🔍 Testing 5-Step Debug Helper for Missing Revert Data
=====================================================
Deployer: 0x...
User: 0x...

🔍 Step 1: callStatic.repay() - Catch exact revert point
---------------------------------------------------
✅ callStatic.repay() succeeded - no revert detected

🔍 Step 2: Log all raw values before sending
---------------------------------------------
Raw values: { ... }

🔍 Step 3: Auto-approve if amount > allowance
----------------------------------------------
Amount (1000000) <= Allowance (1000000) - no approval needed

🔍 Step 4: Balance check - cap if amount > balance
--------------------------------------------------
Amount (1000000) <= Balance (5000000) - no capping needed

🔍 Step 5: MaxUint256 fallback check
------------------------------------
Amount (1000000) is not MaxUint256 - no fallback needed

🔍 Final gas estimation attempt
-------------------------------
✅ Gas estimation successful: 150000

🎉 Debug helper test completed!
```

## Benefits

1. **🔍 Complete Visibility**: See exactly what's happening at each step
2. **🛠️ Automatic Resolution**: Fixes common issues automatically
3. **🔄 Smart Retries**: Retries with corrected parameters
4. **📊 Detailed Logging**: Comprehensive debug information
5. **🎯 Targeted Fixes**: Addresses specific revert reasons
6. **⚡ Performance**: Minimal overhead when no issues exist
7. **🧪 Testable**: Easy to test and verify behavior

## Integration Checklist

- [ ] Import `repayWithDebug` instead of direct contract calls
- [ ] Use `useRepayDebug` hook in React components
- [ ] Add debug UI to show debug steps
- [ ] Test with various error scenarios
- [ ] Monitor debug output in production
- [ ] Update error handling to use debug information

This debug helper provides a robust solution for handling the persistent "missing revert data" error while maintaining excellent user experience and developer visibility.
