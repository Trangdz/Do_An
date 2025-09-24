const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploy to Ganache Network");
    console.log("============================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    try {
        // Deploy InterestRateModel
        console.log("\n📦 Deploying InterestRateModel...");
        const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
        const interestRateModel = await InterestRateModel.deploy();
        await interestRateModel.waitForDeployment();
        const interestRateModelAddress = await interestRateModel.getAddress();
        console.log("✅ InterestRateModel deployed:", interestRateModelAddress);
        
        // Deploy PriceOracle
        console.log("\n📦 Deploying PriceOracle...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy();
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        console.log("✅ PriceOracle deployed:", priceOracleAddress);
        
        // Deploy ERC20 tokens
        console.log("\n📦 Deploying ERC20 Tokens...");
        
        // Deploy WETH
        const WETH = await ethers.getContractFactory("TokenWithWithdraw");
        const weth = await WETH.deploy("Wrapped Ether", "WETH", 18, ethers.parseEther("1000000"));
        await weth.waitForDeployment();
        const wethAddress = await weth.getAddress();
        console.log("✅ WETH deployed:", wethAddress);
        
        // Deploy DAI
        const dai = await WETH.deploy("Dai Stablecoin", "DAI", 18, ethers.parseEther("1000000"));
        await dai.waitForDeployment();
        const daiAddress = await dai.getAddress();
        console.log("✅ DAI deployed:", daiAddress);
        
        // Deploy USDC
        const usdc = await WETH.deploy("USD Coin", "USDC", 6, ethers.parseUnits("1000000", 6));
        await usdc.waitForDeployment();
        const usdcAddress = await usdc.getAddress();
        console.log("✅ USDC deployed:", usdcAddress);
        
        // Deploy LINK
        const link = await WETH.deploy("Chainlink Token", "LINK", 18, ethers.parseEther("1000000"));
        await link.waitForDeployment();
        const linkAddress = await link.getAddress();
        console.log("✅ LINK deployed:", linkAddress);
        
        // Deploy LendingPool
        console.log("\n📦 Deploying LendingPool...");
        const LendingPool = await ethers.getContractFactory("LendingPool");
        const lendingPool = await LendingPool.deploy(interestRateModelAddress, priceOracleAddress, wethAddress, daiAddress);
        await lendingPool.waitForDeployment();
        const lendingPoolAddress = await lendingPool.getAddress();
        console.log("✅ LendingPool deployed:", lendingPoolAddress);
        
        // Set up reserves
        console.log("\n🔧 Setting up reserves...");
        
        // Set asset prices
        await priceOracle.setAssetPrice(wethAddress, ethers.parseEther("1600")); // $1600
        await priceOracle.setAssetPrice(daiAddress, ethers.parseEther("1")); // $1
        await priceOracle.setAssetPrice(usdcAddress, ethers.parseEther("1")); // $1
        await priceOracle.setAssetPrice(linkAddress, ethers.parseEther("10")); // $10
        console.log("✅ Asset prices set");
        
        // Initialize reserves
        await lendingPool.initReserve(wethAddress, 18, 1000, 5000, 5000, 1000, 5000, true, 8000, 0, 0, 0); // 50% LTV
        await lendingPool.initReserve(daiAddress, 18, 1000, 5000, 5000, 1000, 5000, true, 8000, 0, 0, 0); // 50% LTV
        await lendingPool.initReserve(usdcAddress, 6, 1000, 5000, 5000, 1000, 5000, true, 8000, 0, 0, 0); // 50% LTV
        await lendingPool.initReserve(linkAddress, 18, 1000, 5000, 5000, 1000, 5000, true, 8000, 0, 0, 0); // 50% LTV
        console.log("✅ Reserves initialized");
        
        // Mint additional tokens to deployer
        console.log("\n💰 Minting additional tokens...");
        await weth.mint(deployer.address, ethers.parseEther("1000000"));
        await dai.mint(deployer.address, ethers.parseEther("1000000"));
        await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await link.mint(deployer.address, ethers.parseEther("1000000"));
        console.log("✅ Additional tokens minted");
        
        // Output addresses
        console.log("\n📋 Contract Addresses:");
        console.log("=====================");
        console.log("LendingPool:", lendingPoolAddress);
        console.log("InterestRateModel:", interestRateModelAddress);
        console.log("PriceOracle:", priceOracleAddress);
        console.log("WETH:", wethAddress);
        console.log("DAI:", daiAddress);
        console.log("USDC:", usdcAddress);
        console.log("LINK:", linkAddress);
        
        console.log("\n✅ Deployment to Ganache completed!");
        console.log("🎉 All contracts are ready to use!");
        console.log("\n📱 Update your frontend with these addresses:");
        console.log("=============================================");
        console.log(`LENDING_POOL=${lendingPoolAddress}`);
        console.log(`WETH_ADDRESS=${wethAddress}`);
        console.log(`DAI_ADDRESS=${daiAddress}`);
        console.log(`USDC_ADDRESS=${usdcAddress}`);
        console.log(`LINK_ADDRESS=${linkAddress}`);
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
