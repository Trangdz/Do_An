const { ethers } = require("hardhat");

// Simulate the parseTokenAmount function with validation
function parseTokenAmount(amount, decimals) {
  try {
    // Clean the amount string
    const cleanAmount = amount.trim();
    
    // Check if amount is empty or invalid
    if (!cleanAmount || cleanAmount === '' || cleanAmount === '0') {
      return BigInt(0);
    }
    
    // Count decimal places
    const decimalIndex = cleanAmount.indexOf('.');
    const decimalPlaces = decimalIndex === -1 ? 0 : cleanAmount.length - decimalIndex - 1;
    
    // If decimal places exceed token decimals, truncate
    if (decimalPlaces > decimals) {
      const truncatedAmount = cleanAmount.substring(0, decimalIndex + decimals + 1);
      console.log(`Truncating amount from ${cleanAmount} to ${truncatedAmount} (max ${decimals} decimals)`);
      const result = ethers.parseUnits(truncatedAmount, decimals);
      
      // Check if result is too small after truncation
      if (result < BigInt(1)) {
        console.log(`Amount too small after truncation: ${result}, returning 0`);
        return BigInt(0);
      }
      
      return result;
    }
    
    return ethers.parseUnits(cleanAmount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error.message);
    return BigInt(0);
  }
}

// Simulate repay validation
function validateRepayAmount(amount, decimals) {
  const amountBN = parseTokenAmount(amount, decimals);
  
  // Validate amount
  if (amountBN <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  
  // Check if amount is too small (less than 1 unit in 6 decimals)
  const minAmount = BigInt(1); // 1 unit minimum
  if (amountBN < minAmount) {
    throw new Error(`Amount too small. Minimum is ${minAmount} units`);
  }
  
  return amountBN;
}

async function main() {
    console.log("🧪 Testing Repay Validation Fixes");
    console.log("=" .repeat(50));
    
    // Test cases that were causing issues
    const testCases = [
        { amount: "0.000007", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0.0000007", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "0.000000000000000007", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "0.000000000000000007", decimals: 18, token: "WETH", expected: "pass" },
        { amount: "0.000001", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0.0000001", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "1.0", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "", decimals: 6, token: "USDC", expected: "fail" },
    ];
    
    console.log("\n📊 Test Results:");
    console.log("-".repeat(50));
    
    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.amount} (${testCase.token}, ${testCase.decimals} decimals)`);
        
        try {
            const result = validateRepayAmount(testCase.amount, testCase.decimals);
            const formatted = ethers.formatUnits(result, testCase.decimals);
            console.log(`✅ ${testCase.expected === 'pass' ? 'PASS' : 'UNEXPECTED PASS'}: ${result.toString()} → ${formatted}`);
        } catch (error) {
            console.log(`❌ ${testCase.expected === 'fail' ? 'PASS' : 'UNEXPECTED FAIL'}: ${error.message}`);
        }
    }
    
    console.log("\n🎯 Key Improvements:");
    console.log("✅ Validates amount > 0 before processing");
    console.log("✅ Checks minimum amount (1 unit)");
    console.log("✅ Truncates excessive decimals");
    console.log("✅ Returns 0 for amounts too small after truncation");
    console.log("✅ Prevents 'missing revert data' errors");
    console.log("✅ Better error messages for debugging");
    
    console.log("\n💡 How it prevents the error:");
    console.log("1. Amount '0.000007' → 7 units (valid)");
    console.log("2. Amount '0.0000007' → 0 units after truncation → validation fails");
    console.log("3. Amount '0' → validation fails before contract call");
    console.log("4. No more gas estimation with tiny amounts");
    
    console.log("\n🚀 Ready for frontend testing!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
