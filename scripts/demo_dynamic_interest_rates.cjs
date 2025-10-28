// Demo: Lãi suất BIẾN ĐỘNG dựa trên số tiền supply/borrow
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🎯 DEMO: LÃI SUẤT BIẾN ĐỘNG DỰA TRÊN SUPPLY/BORROW");
  console.log("=" .repeat(70));
  
  // Use realistic Aave-like parameters
  const SECONDS_PER_YEAR = 31536000;
  
  // Parameters (RAY per second)
  const baseRate = 0;  // 0% APR base
  const slope1 = BigInt(Math.floor((0.04 * 1e27) / SECONDS_PER_YEAR));  // 4% APR at optimal
  const slope2 = BigInt(Math.floor((0.30 * 1e27) / SECONDS_PER_YEAR)); // 30% APR at max
  const optimalU = 0.80;  // 80%
  const reserveFactor = 1000; // 10% (in bps)

  // Helper function to calculate rate from IRM
  function calculateRates(cash, debt) {
    // Utilization
    const utilization = debt > 0 ? (debt / (cash + debt)) : 0;
    const U = utilization; // 0-1
    
    let borrowRate;
    const Ustar = optimalU; // optimal utilization
    
    if (U <= Ustar) {
      // Slope 1: Base + Slope1 * (U / Ustar)
      const ratio = Ustar > 0 ? U / Ustar : 0;
      const borrowRateRay = Number(slope1) * ratio;
      borrowRate = borrowRateRay;
    } else {
      // Slope 2: Base + Slope1 + Slope2 * ((U - Ustar) / (1 - Ustar))
      const excessRatio = (1 - Ustar) > 0 ? (U - Ustar) / (1 - Ustar) : 0;
      const borrowRateRay = Number(slope1) + (Number(slope2) * excessRatio);
      borrowRate = borrowRateRay;
    }
    
    // Supply rate = Borrow rate * utilization * (1 - reserveFactor)
    const supplyRate = borrowRate * utilization * (10000 - reserveFactor) / 10000;
    
    // Convert to APR
    const borrowAPR = borrowRate * SECONDS_PER_YEAR / 1e27 * 100;
    const supplyAPR = supplyRate * SECONDS_PER_YEAR / 1e27 * 100;
    
    return { utilization: utilization * 100, borrowAPR, supplyAPR };
  }

  console.log("\n📊 SCENARIO 1: Ban đầu - Không có gì");
  console.log("-".repeat(50));
  console.log(`   Supplied: 0 USDC`);
  console.log(`   Borrowed: 0 USDC`);
  console.log(`   Utilization: 0%`);
  console.log(`   📈 Supply APR: 0.00%`);
  console.log(`   📉 Borrow APR: 0.00%`);

  console.log("\n📊 SCENARIO 2: User 1 Supply 10,000 USDC");
  console.log("-".repeat(50));
  console.log("   (Tưởng tượng user 1 đã supply 10,000 USDC...)");
  
  // Simulate: 10,000 USDC supplied, 0 borrowed
  const scenario2 = calculateRates(10000, 0);
  console.log(`   Supplied: 10,000 USDC`);
  console.log(`   Borrowed: 0 USDC`);
  console.log(`   Utilization: ${scenario2.utilization.toFixed(2)}%`);
  console.log(`   📈 Supply APR: ${scenario2.supplyAPR.toFixed(4)}% (0% vì không ai vay)`);
  console.log(`   📉 Borrow APR: ${scenario2.borrowAPR.toFixed(4)}%`);

  console.log("\n📊 SCENARIO 3: User 2 Borrow 5,000 USDC");
  console.log("-".repeat(50));
  console.log("   (Giờ có người borrow 33% tổng supply...)");
  const scenario3 = calculateRates(10000, 5000);
  console.log(`   Supplied: 10,000 USDC`);
  console.log(`   Borrowed: 5,000 USDC`);
  console.log(`   Utilization: ${scenario3.utilization.toFixed(2)}%`);
  console.log(`   📈 Supply APR: ${scenario3.supplyAPR.toFixed(4)}% ✅`);
  console.log(`   📉 Borrow APR: ${scenario3.borrowAPR.toFixed(4)}%`);

  console.log("\n📊 SCENARIO 4: User 2 Borrow thêm 3,000 USDC (tổng 8,000)");
  console.log("-".repeat(50));
  console.log("   (Bây giờ borrow ~44% - lãi suất đang tăng...)");
  const scenario4 = calculateRates(10000, 8000);
  console.log(`   Supplied: 10,000 USDC`);
  console.log(`   Borrowed: 8,000 USDC`);
  console.log(`   Utilization: ${scenario4.utilization.toFixed(2)}%`);
  console.log(`   📈 Supply APR: ${scenario4.supplyAPR.toFixed(4)}% 🚀`);
  console.log(`   📉 Borrow APR: ${scenario4.borrowAPR.toFixed(4)}% 🚀`);

  console.log("\n📊 SCENARIO 5: Borrow gần hết - 9,500 USDC");
  console.log("-".repeat(50));
  console.log("   (95% utilization - Lãi suất tăng MẠNH!)");
  const scenario5 = calculateRates(10000, 9500);
  console.log(`   Supplied: 10,000 USDC`);
  console.log(`   Borrowed: 9,500 USDC`);
  console.log(`   Utilization: ${scenario5.utilization.toFixed(2)}%`);
  console.log(`   📈 Supply APR: ${scenario5.supplyAPR.toFixed(2)}% 🔥🔥🔥`);
  console.log(`   📉 Borrow APR: ${scenario5.borrowAPR.toFixed(2)}% 🔥🔥🔥`);

  console.log("\n🎯 KẾT LUẬN:");
  console.log("-".repeat(50));
  console.log("✅ Lãi suất TỰ ĐỘNG THAY ĐỔI dựa trên:");
  console.log("   1. Tổng tiền đã SUPPLY");
  console.log("   2. Tổng tiền đã BORROW");
  console.log("   3. Utilization (U) = Borrowed / (Supplied + Borrowed)");
  console.log("\n📊 Công thức:");
  console.log("   - Nếu U ≤ 80%: Rate tăng từ từ");
  console.log("   - Nếu U > 80%: Rate tăng MẠNH lên cao");
  console.log("   - Supply APR = Borrow APR × U × (1 - ReserveFactor)");
  console.log("\n💡 Vì vậy:");
  console.log("   - Càng nhiều người BORROW → Lãi suất tăng");
  console.log("   - Càng nhiều người SUPPLY → Lãi suất giảm");
  console.log("   - Điều này tạo động cơ cân bằng cung/cầu!");
}

main().catch(console.error);

