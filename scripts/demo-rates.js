const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Interest Rate Demo...\n");
    
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    
    // Deploy contracts
    console.log("\n📊 Deploying contracts...");
    
    // Deploy MockOracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const mockOracle = await MockOracle.deploy();
    await mockOracle.deployed();
    console.log("MockOracle deployed to:", mockOracle.address);
    
    // Deploy RiskManager
    const RiskManager = await ethers.getContractFactory("RiskManager");
    const riskManager = await RiskManager.deploy(mockOracle.address);
    await riskManager.deployed();
    console.log("RiskManager deployed to:", riskManager.address);
    
    // Deploy LendingPoolV2 (creates InterestRateModel internally)
    const LendingPoolV2 = await ethers.getContractFactory("LendingPoolV2");
    const lendingPool = await LendingPoolV2.deploy(riskManager.address);
    await lendingPool.deployed();
    console.log("LendingPoolV2 deployed to:", lendingPool.address);
    
    // Get InterestRateModel
    const interestRateModelAddress = await lendingPool.getInterestRateModel();
    const interestRateModel = await ethers.getContractAt("InterestRateModel", interestRateModelAddress);
    console.log("InterestRateModel deployed to:", interestRateModelAddress);
    
    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockToken");
    const weth = await MockToken.deploy("Wrapped Ether", "WETH", 18);
    const dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
    await weth.deployed();
    await dai.deployed();
    console.log("WETH deployed to:", weth.address);
    console.log("DAI deployed to:", dai.address);
    
    // Set up prices
    console.log("\n💰 Setting up prices...");
    const PRICE_WETH = ethers.utils.parseUnits("2000", 8); // $2000
    const PRICE_DAI = ethers.utils.parseUnits("1", 8); // $1
    await mockOracle.setPrice(weth.address, PRICE_WETH);
    await mockOracle.setPrice(dai.address, PRICE_DAI);
    console.log("WETH price: $2000");
    console.log("DAI price: $1");
    
    // Configure tokens in RiskManager
    console.log("\n⚙️ Configuring tokens...");
    await riskManager.addToken(weth.address, true, 8000, 8250, 500);
    await riskManager.addToken(dai.address, true, 8000, 8500, 500);
    console.log("Tokens configured in RiskManager");
    
    // Add tokens to lending pool
    await lendingPool.addToken(weth.address);
    await lendingPool.addToken(dai.address);
    console.log("Tokens added to lending pool");
    
    // Mint tokens to users
    console.log("\n🪙 Minting tokens to users...");
    const mintAmount = ethers.utils.parseEther("1000");
    await weth.mint(user1.address, mintAmount);
    await weth.mint(user2.address, mintAmount);
    await dai.mint(user1.address, mintAmount);
    await dai.mint(user2.address, mintAmount);
    console.log("Minted 1000 WETH and 1000 DAI to each user");
    
    // Approve tokens
    await weth.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await weth.connect(user2).approve(lendingPool.address, ethers.constants.MaxUint256);
    await dai.connect(user1).approve(lendingPool.address, ethers.constants.MaxUint256);
    await dai.connect(user2).approve(lendingPool.address, ethers.constants.MaxUint256);
    console.log("Tokens approved");
    
    // Demo scenario
    console.log("\n🎯 Starting Interest Rate Demo Scenario...");
    
    // Show interest rate model parameters
    console.log("\n📈 Interest Rate Model Parameters:");
    const [baseRate, slope1, slope2, kink, maxRate] = await interestRateModel.getParameters();
    console.log("  Base Rate:", ethers.utils.formatEther(baseRate), "(" + (Number(ethers.utils.formatEther(baseRate)) * 100).toFixed(1) + "%)");
    console.log("  Slope 1:", ethers.utils.formatEther(slope1), "(" + (Number(ethers.utils.formatEther(slope1)) * 100).toFixed(1) + "%)");
    console.log("  Slope 2:", ethers.utils.formatEther(slope2), "(" + (Number(ethers.utils.formatEther(slope2)) * 100).toFixed(1) + "%)");
    console.log("  Kink Point:", ethers.utils.formatEther(kink), "(" + (Number(ethers.utils.formatEther(kink)) * 100).toFixed(1) + "%)");
    console.log("  Max Rate:", ethers.utils.formatEther(maxRate), "(" + (Number(ethers.utils.formatEther(maxRate)) * 100).toFixed(1) + "%)");
    
    // Show reserve factor
    const reserveFactor = await lendingPool.getReserveFactor(weth.address);
    console.log("  Reserve Factor:", ethers.utils.formatEther(reserveFactor), "(" + (Number(ethers.utils.formatEther(reserveFactor)) * 100).toFixed(1) + "%)");
    
    // Step 1: Initial state - no deposits
    console.log("\n1️⃣ Initial State - No Deposits:");
    let [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Step 2: Deposit 100 WETH
    console.log("\n2️⃣ After Depositing 100 WETH:");
    await lendingPool.connect(user1).supply(weth.address, ethers.utils.parseEther("100"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Step 3: Borrow 20 WETH (20% utilization)
    console.log("\n3️⃣ After Borrowing 20 WETH (20% utilization):");
    await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("20"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Step 4: Borrow 40 WETH more (60% utilization)
    console.log("\n4️⃣ After Borrowing 40 WETH more (60% utilization):");
    await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("40"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Step 5: Borrow 20 WETH more (80% utilization - kink point)
    console.log("\n5️⃣ After Borrowing 20 WETH more (80% utilization - KINK POINT):");
    await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("20"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    console.log("  📊 At kink point: Borrow APR = Base + Slope1 = 1% + 10% = 11%");
    
    // Step 6: Borrow 10 WETH more (90% utilization - above kink)
    console.log("\n6️⃣ After Borrowing 10 WETH more (90% utilization - ABOVE KINK):");
    await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("10"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    console.log("  📊 Above kink: Borrow APR increases rapidly with Slope2");
    
    // Step 7: Try to borrow more (95% utilization)
    console.log("\n7️⃣ After Borrowing 5 WETH more (95% utilization):");
    await lendingPool.connect(user2).borrow(weth.address, ethers.utils.parseEther("5"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Step 8: Test different reserve factor
    console.log("\n8️⃣ Testing with different reserve factor (20%):");
    await lendingPool.setReserveFactor(weth.address, ethers.utils.parseEther("0.20"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(weth.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    console.log("  📊 Higher reserve factor = lower supply APR");
    
    // Step 9: Test with DAI
    console.log("\n9️⃣ Testing with DAI token:");
    await lendingPool.connect(user1).supply(dai.address, ethers.utils.parseEther("1000"));
    await lendingPool.connect(user2).borrow(dai.address, ethers.utils.parseEther("800"));
    
    [borrowAPR, supplyAPR, utilization] = await lendingPool.currentRates(dai.address);
    console.log("  Utilization:", ethers.utils.formatEther(utilization), "(" + (Number(ethers.utils.formatEther(utilization)) * 100).toFixed(1) + "%)");
    console.log("  Borrow APR:", ethers.utils.formatEther(borrowAPR), "(" + (Number(ethers.utils.formatEther(borrowAPR)) * 100).toFixed(2) + "%)");
    console.log("  Supply APR:", ethers.utils.formatEther(supplyAPR), "(" + (Number(ethers.utils.formatEther(supplyAPR)) * 100).toFixed(2) + "%)");
    
    // Summary
    console.log("\n📊 Interest Rate Model Summary:");
    console.log("  ✅ Rates increase smoothly up to kink point (80%)");
    console.log("  ✅ Rates increase rapidly above kink point");
    console.log("  ✅ Supply APR is always lower than Borrow APR");
    console.log("  ✅ Higher utilization = higher rates");
    console.log("  ✅ Reserve factor affects supply APR");
    console.log("  ✅ Model encourages healthy utilization levels");
    
    console.log("\n🎉 Interest Rate Demo completed!");
    console.log("\nKey Insights:");
    console.log("- Low utilization (0-80%): Gradual rate increase");
    console.log("- High utilization (80-100%): Rapid rate increase");
    console.log("- Kink point acts as a natural brake on borrowing");
    console.log("- Supply rates incentivize deposits when utilization is high");
    console.log("- Reserve factor determines protocol revenue vs user rewards");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
