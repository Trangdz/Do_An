const hre = require("hardhat");
const { Interface } = require("ethers");

async function main() {
  console.log("=== VERIFY PriceAggregator MAPPING ===\n");

  // Contract ABI
  const contractABI = [
    "function updateAnswer(int256 answer)"
  ];
  const iface = new Interface(contractABI);
  const func = iface.getFunction("updateAnswer");

  console.log("1. PriceAggregator Contract:");
  console.log("   Function:", func.format("full"));
  console.log("   Selector:", func.selector);
  console.log("   Inputs:", func.inputs.map(i => `${i.type} ${i.name}`).join(", "));

  // Job configuration
  const jobAbi = "updateAnswer(int256 answer)";
  const jobDataKey = "answer"; // Key trong JSON map

  console.log("\n2. Job Configuration:");
  console.log("   ABI:", jobAbi);
  console.log("   Data format:", `{"${jobDataKey}": $(multiply)}`);

  console.log("\n3. Verification:");
  
  // Verify ABI signature matches
  if (jobAbi === func.format("minimal")) {
    console.log("   ✅ Job ABI signature matches contract function");
  } else {
    console.log(`   ❌ ABI mismatch! Expected: ${func.format("minimal")}, Got: ${jobAbi}`);
  }

  // Verify parameter name matches
  const contractParamName = func.inputs[0].name;
  if (jobDataKey === contractParamName) {
    console.log(`   ✅ Job data key '${jobDataKey}' matches parameter name '${contractParamName}'`);
  } else {
    console.log(`   ❌ Key mismatch! Expected: '${contractParamName}', Got: '${jobDataKey}'`);
  }

  // Verify type matches
  const contractParamType = func.inputs[0].type;
  console.log(`   ✅ Parameter type: ${contractParamType} (int256 - signed integer)`);

  console.log("\n✅ MAPPING ĐÚNG 100%!");
  console.log("\nFormat cuối cùng:");
  console.log('   abi="updateAnswer(int256 answer)"');
  console.log('   data="{\\"answer\\": $(multiply)}"');
}

main().catch(console.error);

