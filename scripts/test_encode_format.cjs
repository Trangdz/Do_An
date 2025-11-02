// Test script to understand correct format
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Testing ABI encoding format...\n");
  
  // Test 1: Single int256 parameter
  const value = ethers.parseUnits("3895.31", 8); // 389531000000
  console.log("Value to encode:", value.toString());
  
  // Method 1: Using ethers ABI encoding
  const iface = new ethers.Interface([
    "function updateAnswer(int256 answer)"
  ]);
  
  const encoded1 = iface.encodeFunctionData("updateAnswer", [value]);
  console.log("\nMethod 1 (named parameter):");
  console.log("ABI: updateAnswer(int256 answer)");
  console.log("Encoded:", encoded1);
  
  // Method 2: Without function name
  const iface2 = new ethers.Interface([
    "function (int256)"
  ]);
  
  try {
    // Can't do this - need function name
    console.log("\nMethod 2: Not possible without function name");
  } catch (e) {
    console.log("Error:", e.message);
  }
  
  // Method 3: Just the parameter types
  const encoded3 = ethers.AbiCoder.defaultAbiCoder().encode(
    ["int256"],
    [value]
  );
  console.log("\nMethod 3 (just types):");
  console.log("Types: [int256]");
  console.log("Encoded (without selector):", encoded3);
  
  console.log("\n💡 Conclusion:");
  console.log("Chainlink ethabiencode needs:");
  console.log("  - Function signature: updateAnswer(int256)");
  console.log("  - Data as object: {answer: value} OR array [value]");
  console.log("  - But 'expected map' error suggests it needs object");
}

main().catch(console.error);



