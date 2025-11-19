/**
 * Test script for interest calculation logic
 * Tests the Aave formula: actualBalance = principal * (currentIndex / snapshotIndex)
 */

import { ethers } from 'ethers';

const RAY = BigInt('1000000000000000000000000000'); // 1e27
const WAD = BigInt('1000000000000000000'); // 1e18
const SECONDS_PER_YEAR = 31536000;

interface TestCase {
  name: string;
  principal: bigint;
  snapshotIndex: bigint;
  liquidityIndex: bigint;
  rateRayPerSec: bigint;
  timeElapsed: number; // seconds
  expectedInterest?: number; // optional, for validation
}

/**
 * Calculate balance using Aave formula
 */
function calculateBalance(
  principal: bigint,
  snapshotIndex: bigint,
  currentIndex: bigint
): number {
  const actualWad = (principal * currentIndex) / snapshotIndex;
  return Number(ethers.formatUnits(actualWad, 18));
}

/**
 * Calculate new index after time elapsed
 */
function calculateNewIndex(
  oldIndex: bigint,
  rateRayPerSec: bigint,
  timeElapsed: number
): bigint {
  const increment = (oldIndex * rateRayPerSec * BigInt(timeElapsed)) / RAY;
  return oldIndex + increment;
}

/**
 * Run a test case
 */
function runTest(testCase: TestCase): boolean {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('Input:', {
    principal: ethers.formatUnits(testCase.principal, 18),
    snapshotIndex: testCase.snapshotIndex.toString(),
    liquidityIndex: testCase.liquidityIndex.toString(),
    rateRayPerSec: testCase.rateRayPerSec.toString(),
    timeElapsed: testCase.timeElapsed
  });

  // Calculate new index after time
  const newIndex = calculateNewIndex(
    testCase.liquidityIndex,
    testCase.rateRayPerSec,
    testCase.timeElapsed
  );

  // Calculate balance
  const balance = calculateBalance(
    testCase.principal,
    testCase.snapshotIndex,
    newIndex
  );

  const principalNum = Number(ethers.formatUnits(testCase.principal, 18));
  const interest = balance - principalNum;

  console.log('Output:', {
    newIndex: newIndex.toString(),
    balance: balance.toFixed(18),
    principal: principalNum.toFixed(18),
    interest: interest.toFixed(18),
    interestPercent: ((interest / principalNum) * 100).toFixed(6) + '%'
  });

  // Validate if expected interest provided
  if (testCase.expectedInterest !== undefined) {
    const diff = Math.abs(interest - testCase.expectedInterest);
    const tolerance = 0.000001; // 0.000001 tokens
    const passed = diff < tolerance;
    console.log(`✅ ${passed ? 'PASSED' : 'FAILED'}: Expected interest: ${testCase.expectedInterest}, Got: ${interest}, Diff: ${diff}`);
    return passed;
  }

  return true;
}

/**
 * Test suite
 */
export function runInterestCalculationTests() {
  console.log('🚀 Starting Interest Calculation Tests\n');
  console.log('='.repeat(60));

  const tests: TestCase[] = [
    {
      name: 'New deposit (no interest yet)',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY, // Same as liquidityIndex (new deposit)
      liquidityIndex: RAY,
      rateRayPerSec: BigInt('1000000000000000'), // ~3.15% APR
      timeElapsed: 0,
      expectedInterest: 0
    },
    {
      name: 'After 1 second with 0.35% APY',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY,
      liquidityIndex: RAY,
      rateRayPerSec: BigInt('110998000000000'), // 0.35% APY ≈ 0.35% APR (small rate)
      timeElapsed: 1
    },
    {
      name: 'After 1 hour with 0.35% APY',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY,
      liquidityIndex: RAY,
      rateRayPerSec: BigInt('110998000000000'), // 0.35% APY
      timeElapsed: 3600 // 1 hour
    },
    {
      name: 'After 1 day with 0.35% APY',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY,
      liquidityIndex: RAY,
      rateRayPerSec: BigInt('110998000000000'), // 0.35% APY
      timeElapsed: 86400 // 1 day
    },
    {
      name: 'After 1 year with 0.35% APY',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY,
      liquidityIndex: RAY,
      rateRayPerSec: BigInt('110998000000000'), // 0.35% APY
      timeElapsed: SECONDS_PER_YEAR
    },
    {
      name: 'With existing interest (index already increased)',
      principal: ethers.parseEther('1200'),
      snapshotIndex: RAY,
      liquidityIndex: BigInt('1001000000000000000000000000'), // 0.1% increase
      rateRayPerSec: BigInt('110998000000000'),
      timeElapsed: 3600
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, index) => {
    try {
      const result = runTest(test);
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error: any) {
      console.error(`❌ Test ${index + 1} threw error:`, error.message);
      failed++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  return failed === 0;
}

/**
 * Test APR to rate conversion
 */
export function testAPRToRateConversion() {
  console.log('\n🧪 Testing APR to Rate Conversion\n');
  console.log('='.repeat(60));

  const testAPRs = [0.35, 1.0, 5.0, 10.0, 50.0];

  testAPRs.forEach(apr => {
    const aprDecimal = apr / 100;
    const ratePerSecond = aprDecimal / SECONDS_PER_YEAR;
    const rateRayPerSec = BigInt(Math.floor(ratePerSecond * 1e27));

    console.log(`APR: ${apr}%`);
    console.log(`  Rate per second: ${ratePerSecond.toExponential()}`);
    console.log(`  Rate in RAY: ${rateRayPerSec.toString()}`);
    
    // Verify: convert back to APR
    const backToAPR = (Number(rateRayPerSec) / 1e27) * SECONDS_PER_YEAR * 100;
    const diff = Math.abs(backToAPR - apr);
    console.log(`  Converted back to APR: ${backToAPR.toFixed(6)}% (diff: ${diff.toFixed(6)}%)`);
    console.log('');
  });

  console.log('='.repeat(60));
}

/**
 * Test real-time update simulation
 */
export function testRealtimeUpdate() {
  console.log('\n🧪 Testing Real-time Update Simulation\n');
  console.log('='.repeat(60));

  const principal = ethers.parseEther('1200');
  const snapshotIndex = RAY;
  let currentIndex = RAY;
  const rateRayPerSec = BigInt('110998000000000'); // 0.35% APY
  const startTime = Date.now();

  console.log('Initial state:');
  console.log(`  Principal: ${ethers.formatEther(principal)}`);
  console.log(`  Snapshot Index: ${snapshotIndex.toString()}`);
  console.log(`  Current Index: ${currentIndex.toString()}`);
  console.log(`  Rate: ${rateRayPerSec.toString()}`);
  console.log('');

  // Simulate 10 seconds of updates
  for (let i = 1; i <= 10; i++) {
    const now = Date.now();
    const deltaMs = now - startTime;
    const deltaSec = Math.floor(deltaMs / 1000);

    if (deltaSec > 0) {
      const increment = (currentIndex * rateRayPerSec * BigInt(deltaSec)) / RAY;
      currentIndex = currentIndex + increment;
      
      const balance = calculateBalance(principal, snapshotIndex, currentIndex);
      const interest = balance - Number(ethers.formatEther(principal));

      console.log(`Second ${i}:`);
      console.log(`  Delta: ${deltaSec}s`);
      console.log(`  New Index: ${currentIndex.toString()}`);
      console.log(`  Balance: ${balance.toFixed(18)}`);
      console.log(`  Interest: ${interest.toFixed(18)}`);
      console.log('');
    }

    // Wait 1 second (in real scenario, this would be handled by setInterval)
    if (i < 10) {
      // In test, we just simulate
      const simulatedDelta = i;
      const increment = (RAY * rateRayPerSec * BigInt(simulatedDelta)) / RAY;
      currentIndex = RAY + increment;
    }
  }

  console.log('='.repeat(60));
}

// Export test runner
export function runAllTests() {
  const test1 = runInterestCalculationTests();
  testAPRToRateConversion();
  testRealtimeUpdate();
  return test1;
}


