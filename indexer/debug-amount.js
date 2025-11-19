const { ethers } = require('ethers');

// Test amount formatting
console.log('🧪 Testing amount formatting...\n');

// Simulate: User supplies 33 USDC (6 decimals)
// Contract receives: 33 * 10^6 = 33000000
// Contract normalizes to 1e18: 33000000 * 10^12 = 33000000000000000000
const amountFromEvent = ethers.parseUnits('33', 18); // This is what contract emits
console.log('Amount from event (1e18):', amountFromEvent.toString());

// Test different formatting approaches
console.log('\n1️⃣ Format with 18 decimals (correct for 1e18):');
const formatted18 = ethers.formatUnits(amountFromEvent, 18);
console.log('   Result:', formatted18);
console.log('   parseFloat:', parseFloat(formatted18));
console.log('   toFixed(6):', parseFloat(formatted18).toFixed(6));

console.log('\n2️⃣ Format with 6 decimals (WRONG - token decimals):');
const formatted6 = ethers.formatUnits(amountFromEvent, 6);
console.log('   Result:', formatted6);
console.log('   parseFloat:', parseFloat(formatted6));
console.log('   toFixed(6):', parseFloat(formatted6).toFixed(6));

console.log('\n3️⃣ What if amount is already in token decimals?');
const amountInTokenDecimals = ethers.parseUnits('33', 6); // 33 USDC in 6 decimals
console.log('Amount in token decimals:', amountInTokenDecimals.toString());
console.log('Format with 6 decimals:', ethers.formatUnits(amountInTokenDecimals, 6));
console.log('Format with 18 decimals (WRONG):', ethers.formatUnits(amountInTokenDecimals, 18));

console.log('\n✅ Conclusion:');
console.log('Contract emits amount in 1e18 format, so we MUST format with 18 decimals');
console.log('Then we can format the display number to 6 decimal places for readability');























