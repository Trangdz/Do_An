const ethers = require('ethers');

console.log('🔍 PHÂN TÍCH CHI TIẾT:\n');

const repayAmount = BigInt('1099500000000');
console.log('1️⃣ Số tiền repay (từ error):');
console.log('   Raw:', repayAmount.toString());
console.log('   As USDC (6 decimals):', ethers.formatUnits(repayAmount, 6));
console.log('   As 1e18:', ethers.formatUnits(repayAmount, 18));

console.log('\n2️⃣ Reverse calculation (assuming 20% buffer):');
const original = (repayAmount * BigInt(100)) / BigInt(120);
console.log('   Original debt:', original.toString());
console.log('   As USDC (6 decimals):', ethers.formatUnits(original, 6));
console.log('   As 1e18:', ethers.formatUnits(original, 18));

console.log('\n3️⃣ If this was converted wrong from 1e18:');
const converted = original / BigInt(10 ** 12);
console.log('   Converted (÷ 10^12):', converted.toString());
console.log('   As USDC:', ethers.formatUnits(converted, 6));

console.log('\n4️⃣ Your actual debt (from UI):');
console.log('   < 0.0001 USDC');
console.log('   In raw (6 decimals): < 100');

console.log('\n5️⃣ Check if getBorrowBalance returns correct format:');
const possibleDebt1e18 = BigInt('916250000000000000'); // If it's 916250 in 1e18
console.log('   If debt is:', ethers.formatUnits(possibleDebt1e18, 18));
console.log('   Convert to USDC:', ethers.formatUnits(possibleDebt1e18 / BigInt(10**12), 6));
console.log('   With buffer:', ethers.formatUnits((possibleDebt1e18 / BigInt(10**12)) * BigInt(120) / BigInt(100), 6));

console.log('\n💡 CONCLUSION:');
console.log('   Error shows:', ethers.formatUnits(repayAmount, 6), 'USDC');
console.log('   You have: 500 USDC');
console.log('   Actual debt: < 0.0001 USDC');
console.log('   ❌ getBorrowBalance is returning CORRUPTED value!');
console.log('\n🔧 SOLUTION: Use userReserves.borrow.principal instead');


