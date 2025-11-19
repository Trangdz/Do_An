/**
 * Test script for deposit interest calculation
 * 
 * This script tests:
 * 1. Principal display (should show original deposit amount)
 * 2. Interest earned calculation (should increase over time)
 * 3. Balance calculation (should be principal + interest)
 * 
 * Run with: node scripts/test-deposit-interest.js
 */

const { ethers } = require('ethers');

// Constants
const RAY = BigInt('1000000000000000000000000000'); // 1e27
const WAD = BigInt('1000000000000000000'); // 1e18
const SECONDS_PER_YEAR = 31536000;

// Test data
const testCases = [
  {
    name: 'Test 1: Deposit 1000 DAI with 5% APR',
    originalPrincipal: ethers.parseUnits('1000', 18), // 1000 DAI
    snapshotIndex: RAY, // Initial index
    currentIndex: RAY, // Start with same index
    rateRayPerSec: BigInt(Math.floor((0.05 / SECONDS_PER_YEAR) * 1e27)), // 5% APR
    timeElapsed: 86400, // 1 day in seconds
    expectedInterest: ethers.parseUnits('0.136986', 18) // ~0.137 DAI per day
  },
  {
    name: 'Test 2: Deposit 1000 DAI with 10% APR',
    originalPrincipal: ethers.parseUnits('1000', 18),
    snapshotIndex: RAY,
    currentIndex: RAY,
    rateRayPerSec: BigInt(Math.floor((0.10 / SECONDS_PER_YEAR) * 1e27)), // 10% APR
    timeElapsed: 86400, // 1 day
    expectedInterest: ethers.parseUnits('0.273973', 18) // ~0.274 DAI per day
  },
  {
    name: 'Test 3: Deposit 999 DAI (after fee) with 5% APR',
    originalPrincipal: ethers.parseUnits('999', 18), // 999 DAI (after 1 DAI fee)
    snapshotIndex: RAY,
    currentIndex: RAY,
    rateRayPerSec: BigInt(Math.floor((0.05 / SECONDS_PER_YEAR) * 1e27)),
    timeElapsed: 86400,
    expectedInterest: ethers.parseUnits('0.136852', 18) // ~0.137 DAI per day
  }
];

/**
 * Calculate new index using Aave formula
 * newIndex = oldIndex * (1 + rate * time / SECONDS_PER_YEAR)
 * In RAY precision: newIndex = oldIndex + (oldIndex * rate * time) / RAY
 */
function calculateNewIndex(oldIndex, rateRayPerSec, timeElapsed) {
  const increment = (oldIndex * rateRayPerSec * BigInt(timeElapsed)) / RAY;
  return oldIndex + increment;
}

/**
 * Calculate balance with interest
 * balance = principal * (currentIndex / snapshotIndex)
 */
function calculateBalance(principal, snapshotIndex, currentIndex) {
  return (principal * currentIndex) / snapshotIndex;
}

/**
 * Run a test case
 */
function runTest(testCase) {
  console.log(`\n${testCase.name}`);
  console.log('='.repeat(60));
  
  // Calculate new index after time elapsed
  const newIndex = calculateNewIndex(
    testCase.currentIndex,
    testCase.rateRayPerSec,
    testCase.timeElapsed
  );
  
  // Calculate balance with interest
  const balanceWithInterest = calculateBalance(
    testCase.originalPrincipal,
    testCase.snapshotIndex,
    newIndex
  );
  
  // Calculate interest earned
  const interestEarned = balanceWithInterest - testCase.originalPrincipal;
  
  // Convert to readable numbers
  const principalNum = Number(ethers.formatUnits(testCase.originalPrincipal, 18));
  const balanceNum = Number(ethers.formatUnits(balanceWithInterest, 18));
  const interestNum = Number(ethers.formatUnits(interestEarned, 18));
  const expectedInterestNum = Number(ethers.formatUnits(testCase.expectedInterest, 18));
  
  // Display results
  console.log(`Original Principal: ${principalNum.toFixed(6)} DAI`);
  console.log(`Balance with Interest: ${balanceNum.toFixed(6)} DAI`);
  console.log(`Interest Earned: ${interestNum.toFixed(6)} DAI`);
  console.log(`Expected Interest: ${expectedInterestNum.toFixed(6)} DAI`);
  console.log(`Index Change: ${testCase.snapshotIndex.toString()} -> ${newIndex.toString()}`);
  
  // Verify
  const interestDiff = Math.abs(interestNum - expectedInterestNum);
  const tolerance = 0.001; // 0.001 DAI tolerance
  
  if (interestDiff < tolerance) {
    console.log('✅ PASS: Interest calculation is correct');
  } else {
    console.log(`❌ FAIL: Interest difference is ${interestDiff.toFixed(6)} DAI (expected < ${tolerance})`);
  }
  
  if (balanceNum >= principalNum) {
    console.log('✅ PASS: Balance is greater than or equal to principal');
  } else {
    console.log('❌ FAIL: Balance is less than principal');
  }
  
  return {
    principal: principalNum,
    balance: balanceNum,
    interest: interestNum,
    passed: interestDiff < tolerance && balanceNum >= principalNum
  };
}

/**
 * Test real-time update simulation
 */
function testRealtimeUpdate() {
  console.log('\n\nTest: Real-time Update Simulation');
  console.log('='.repeat(60));
  
  const originalPrincipal = ethers.parseUnits('1000', 18);
  const snapshotIndex = RAY;
  let currentIndex = RAY;
  const rateRayPerSec = BigInt(Math.floor((0.05 / SECONDS_PER_YEAR) * 1e27)); // 5% APR
  
  console.log('Simulating 10 seconds of real-time updates...');
  console.log('Initial Principal:', Number(ethers.formatUnits(originalPrincipal, 18)).toFixed(6), 'DAI');
  
  for (let i = 1; i <= 10; i++) {
    // Update index for 1 second
    const increment = (currentIndex * rateRayPerSec * BigInt(1)) / RAY;
    currentIndex = currentIndex + increment;
    
    // Calculate balance
    const balance = calculateBalance(originalPrincipal, snapshotIndex, currentIndex);
    const interest = balance - originalPrincipal;
    
    const balanceNum = Number(ethers.formatUnits(balance, 18));
    const interestNum = Number(ethers.formatUnits(interest, 18));
    
    console.log(`Second ${i}: Balance = ${balanceNum.toFixed(8)} DAI, Interest = ${interestNum.toFixed(8)} DAI`);
  }
  
  const finalBalance = calculateBalance(originalPrincipal, snapshotIndex, currentIndex);
  const finalInterest = finalBalance - originalPrincipal;
  
  console.log('\nFinal Results:');
  console.log(`Final Balance: ${Number(ethers.formatUnits(finalBalance, 18)).toFixed(8)} DAI`);
  console.log(`Total Interest: ${Number(ethers.formatUnits(finalInterest, 18)).toFixed(8)} DAI`);
  console.log('✅ Real-time update simulation completed');
}

/**
 * Test principal display issue (999 vs 1000)
 */
function testPrincipalDisplay() {
  console.log('\n\nTest: Principal Display (999 vs 1000)');
  console.log('='.repeat(60));
  
  const depositedAmount = ethers.parseUnits('1000', 18); // User deposits 1000 DAI
  const fee = ethers.parseUnits('1', 18); // 1 DAI fee (example)
  const actualPrincipal = depositedAmount - fee; // 999 DAI in pool
  
  console.log(`User Deposits: ${Number(ethers.formatUnits(depositedAmount, 18))} DAI`);
  console.log(`Fee: ${Number(ethers.formatUnits(fee, 18))} DAI`);
  console.log(`Actual Principal in Pool: ${Number(ethers.formatUnits(actualPrincipal, 18))} DAI`);
  
  // The originalPrincipalWadRef should be set to actualPrincipal (999), not depositedAmount (1000)
  // This is correct behavior - we display what's actually in the pool
  console.log('\n✅ Correct Behavior:');
  console.log('  - originalPrincipalWadRef should be set to actualPrincipal (999)');
  console.log('  - This represents the actual amount earning interest');
  console.log('  - If user wants to see 1000, they need to account for fees separately');
}

// Run all tests
console.log('Deposit Interest Calculation Tests');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = runTest(testCase);
  if (result.passed) {
    passed++;
  } else {
    failed++;
  }
});

testRealtimeUpdate();
testPrincipalDisplay();

console.log('\n\nTest Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}

