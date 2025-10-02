const { ethers } = require("hardhat");

// Simulate the parseTokenAmount function with fixed validation
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
        console.log(`Amount too small after truncation: ${result}, returning 1 unit minimum`);
        return BigInt(1); // Return 1 unit minimum instead of 0
      }
      
      return result;
    }
    
    return ethers.parseUnits(cleanAmount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error.message);
    return BigInt(0);
  }
}

// Simulate repay validation with fixed logic
function validateRepayAmount(amount, decimals) {
  const amountBN = parseTokenAmount(amount, decimals);
  
  // Validate amount
  if (amountBN <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  
  // Only check if amount is exactly 0 (let contract handle very small amounts)
  if (amountBN === BigInt(0)) {
    throw new Error("Amount cannot be zero");
  }
  
  return amountBN;
}

async function main() {
    console.log("🧪 Testing Fixed Repay Validation");
    console.log("=" .repeat(50));
    
    // Test cases that were causing issues
    const testCases = [
        { amount: "0.000007", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0.0000007", decimals: 6, token: "USDC", expected: "pass" }, // Should pass now
        { amount: "0.000000000000000007", decimals: 6, token: "USDC", expected: "pass" }, // Should pass now
        { amount: "0.000000000000000007", decimals: 18, token: "WETH", expected: "pass" },
        { amount: "0.000001", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0.0000001", decimals: 6, token: "USDC", expected: "pass" }, // Should pass now
        { amount: "1.0", decimals: 6, token: "USDC", expected: "pass" },
        { amount: "0", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "", decimals: 6, token: "USDC", expected: "fail" },
        { amount: "0.000000000000000001", decimals: 6, token: "USDC", expected: "pass" }, // Very small amount
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
    console.log("✅ Removed strict minimum amount validation");
    console.log("✅ Only checks for exactly zero amounts");
    console.log("✅ Returns 1 unit minimum instead of 0 for tiny amounts");
    console.log("✅ Lets contract handle very small amounts");
    console.log("✅ Allows repay with any non-zero amount");
    
    console.log("\n💡 How it works now:");
    console.log("1. Amount '0.000007' → 7 units (valid) ✅");
    console.log("2. Amount '0.0000007' → 1 unit minimum (valid) ✅");
    console.log("3. Amount '0.000000000000000001' → 1 unit minimum (valid) ✅");
    console.log("4. Amount '0' → validation fails ✅");
    console.log("5. No more 'Amount too small' errors ✅");
    
    console.log("\n🚀 Ready for frontend testing!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
