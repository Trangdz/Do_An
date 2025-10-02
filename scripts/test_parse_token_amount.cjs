const { ethers } = require("hardhat");

// Simulate the parseTokenAmount function
function parseTokenAmount(amount, decimals) {
  try {
    // Clean the amount string
    const cleanAmount = amount.trim();
    
    // Check if amount is empty or invalid
    if (!cleanAmount || cleanAmount === '' || cleanAmount === '0') {
      return 0n;
    }
    
    // Count decimal places
    const decimalIndex = cleanAmount.indexOf('.');
    const decimalPlaces = decimalIndex === -1 ? 0 : cleanAmount.length - decimalIndex - 1;
    
    // If decimal places exceed token decimals, truncate
    if (decimalPlaces > decimals) {
      const truncatedAmount = cleanAmount.substring(0, decimalIndex + decimals + 1);
      console.log(`Truncating amount from ${cleanAmount} to ${truncatedAmount} (max ${decimals} decimals)`);
      return ethers.parseUnits(truncatedAmount, decimals);
    }
    
    return ethers.parseUnits(cleanAmount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error.message);
    console.error('Amount:', amount, 'Decimals:', decimals);
    
    // Fallback: try to parse with reduced precision
    try {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) return 0n;
      
      // Round to avoid precision issues
      const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
      return ethers.parseUnits(rounded.toString(), decimals);
    } catch (fallbackError) {
      console.error('Fallback parsing also failed:', fallbackError.message);
      return 0n;
    }
  }
}

async function main() {
    console.log("🧪 Testing parseTokenAmount with problematic values");
    console.log("=" .repeat(60));
    
    // Test cases that were causing issues
    const testCases = [
        { amount: "0.000007839868578115", decimals: 6, token: "USDC" },
        { amount: "0.000007839868578115", decimals: 18, token: "WETH" },
        { amount: "1.0", decimals: 6, token: "USDC" },
        { amount: "1000.0", decimals: 6, token: "USDC" },
        { amount: "0.000000000000000001", decimals: 18, token: "WETH" },
        { amount: "0.000000000000000001", decimals: 6, token: "USDC" },
        { amount: "0", decimals: 6, token: "USDC" },
        { amount: "", decimals: 6, token: "USDC" },
        { amount: "   ", decimals: 6, token: "USDC" },
    ];
    
    console.log("\n📊 Test Results:");
    console.log("-".repeat(40));
    
    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.amount} (${testCase.token}, ${testCase.decimals} decimals)`);
        
        try {
            const result = parseTokenAmount(testCase.amount, testCase.decimals);
            const formatted = ethers.formatUnits(result, testCase.decimals);
            console.log(`✅ Success: ${result.toString()} → ${formatted}`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    
    console.log("\n🎯 Key Improvements:");
    console.log("✅ Handles excessive decimal places by truncating");
    console.log("✅ Provides fallback parsing for edge cases");
    console.log("✅ Logs warnings for truncated amounts");
    console.log("✅ Handles empty/invalid inputs gracefully");
    console.log("✅ No more 'too many decimals' errors");
    
    console.log("\n💡 How it works:");
    console.log("1. Counts decimal places in input string");
    console.log("2. If > token decimals, truncates to max allowed");
    console.log("3. If parseUnits fails, uses fallback with rounding");
    console.log("4. Always returns a valid BigInt (0n on complete failure)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
