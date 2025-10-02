# Debt Formatting Improvements

## Overview

This document outlines the improvements made to token amount formatting for debts, dust detection, and repay functionality.

## Key Improvements

### 1. **Dust Detection and Display**

#### **Threshold-Based Display**
```typescript
function formatDebtWithDust(debtRaw: bigint, decimals: number, symbol: string): {
  display: string;
  isDust: boolean;
  tooltip?: string;
} {
  const humanAmount = parseFloat(formatHuman(debtRaw, decimals));
  const displayThreshold = 0.0001;
  
  if (debtRaw === 0n) {
    return { display: `0 ${symbol}`, isDust: false };
  }
  
  if (humanAmount < displayThreshold) {
    return {
      display: `< ${displayThreshold} ${symbol}`,
      isDust: true,
      tooltip: `Raw: ${debtRaw.toString()} wei`
    };
  }
  
  return {
    display: `${formatCurrency(humanAmount, 4)} ${symbol}`,
    isDust: false
  };
}
```

#### **Visual Indicators**
- **Badge**: "Dust not zero" when `debtRaw > 0` but human amount is below threshold
- **Tooltip**: Shows raw wei amount for dust values
- **Warning**: Orange warning box when dust is detected

### 2. **Enhanced Repay All Button**

#### **Safe Flow Implementation**
```typescript
const handleRepayAll = async () => {
  try {
    // Try RepayAllUnlimited mode first
    const result = await repayAllUnlimited(signer, token.address, poolAddress, userAddress);
    // Success handling...
  } catch (unlimitedError) {
    // Fallback to RepayExactWithBuffer mode
    const result = await repayExactWithBuffer(signer, token.address, poolAddress, userAddress, currentDebt.debtRaw, currentDebt.decimals);
    // Success handling...
  }
};
```

#### **Features**
- **Unlimited Mode First**: Tries `MaxUint256` approach
- **Automatic Fallback**: Falls back to exact + buffer if unlimited fails
- **Debt Verification**: Checks if debt is actually cleared
- **User Feedback**: Clear success/error messages

### 3. **Improved Input Handling**

#### **Precise Step Calculation**
```typescript
// Calculate step based on token decimals
const step = 1 / (10 ** token.decimals);

// Input attributes
<Input
  type="number"
  step={step}
  min="0"
  // ... other props
/>
```

#### **Examples**
- **USDC (6 decimals)**: `step = 0.000001`
- **DAI/WETH (18 decimals)**: `step = 0.000000000000000001`

### 4. **Percentage Formatting**

#### **No K/M Abbreviations**
```typescript
function formatPercentage(value: number): string {
  if (value >= 100) {
    return `${value.toFixed(1)}%`;
  } else if (value >= 1) {
    return `${value.toFixed(2)}%`;
  } else {
    return `${value.toFixed(4)}%`;
  }
}
```

#### **Examples**
- `100.0%` (not `100%`)
- `99.99%` (not `100%`)
- `0.0001%` (not `0%`)

## React JSX Snippet

### **Key Components**

#### **1. Debt Display with Dust Detection**
```jsx
{/* Current Debt Info with Dust Detection */}
<div className="bg-red-50 p-3 rounded-lg">
  <div className="text-sm text-red-600 mb-1">Current Debt</div>
  <div className="text-lg font-bold text-red-600 flex items-center gap-2">
    {debtDisplay ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{debtDisplay.display}</span>
          </TooltipTrigger>
          {debtDisplay.tooltip && (
            <TooltipContent>
              <p>{debtDisplay.tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    ) : (
      `${formatCurrency(debtNum, 4)} ${token.symbol}`
    )}
  </div>
  <div className="text-xs text-red-600/70">
    ${formatCurrency(debtNum * price)}
  </div>
</div>
```

#### **2. Dust Badge in Header**
```jsx
<CardTitle className="flex items-center gap-2">
  Repay {token.symbol}
  {debtDisplay?.isDust && (
    <Badge variant="destructive" className="text-xs">
      Dust not zero
    </Badge>
  )}
</CardTitle>
```

#### **3. Enhanced Input with Proper Step**
```jsx
<Input
  id="amount"
  type="number"
  value={amount}
  onChange={(e) => handleAmountChange(e.target.value)}
  placeholder="0.00"
  step={step}
  min="0"
  disabled={isLoading}
  className="flex-1"
/>
```

#### **4. Dust Warning**
```jsx
{/* Dust Warning */}
{debtDisplay?.isDust && (
  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
    <div className="text-sm text-orange-800">
      ⚠️ Your debt contains dust amounts. Use "Repay All" to clear completely.
    </div>
  </div>
)}
```

## Unit Tests

### **Test Coverage**

#### **Foundry Tests** (`test/RepayDustTest.sol`)
- **Test A**: Repay exact human amount → should leave dust
- **Test B**: Repay MaxUint256 → should clear debt
- **Test C**: Repay debt + 1 wei → should clear debt
- **Test D**: Repay exact current debt → should clear debt
- **Test E**: Partial repay → should not clear debt
- **Test F**: Repay when no debt → should handle gracefully

#### **Hardhat Tests** (`test/RepayDustTest.js`)
- Same test cases as Foundry
- Uses ethers v6 syntax
- Includes event emission testing

### **Running Tests**

#### **Foundry**
```bash
forge test --match-contract RepayDustTest -vv
```

#### **Hardhat**
```bash
npx hardhat test test/RepayDustTest.js
```

## Benefits

1. **✅ Dust Visibility**: Users can see when they have dust amounts
2. **✅ Clear Guidance**: Tooltips and warnings help users understand
3. **✅ Robust Repay**: Safe flow ensures debt can always be cleared
4. **✅ Precise Input**: Step calculation prevents input errors
5. **✅ Better UX**: No confusing K/M abbreviations in percentages
6. **✅ Comprehensive Testing**: Full test coverage for edge cases

## Migration

1. **Replace RepayModal**: Use `RepayModalImproved.tsx`
2. **Add Dependencies**: Ensure Tooltip components are available
3. **Update Imports**: Import the new component
4. **Test Thoroughly**: Run both unit tests and manual testing
5. **Monitor**: Watch for dust detection accuracy in production

This implementation provides a complete solution for handling dust amounts and ensuring users can always clear their debt completely.
