const { ethers } = require("ethers");

async function main() {
    console.log("🚀 Deploy to Ganache");
    console.log("====================");
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    console.log("Deploying with account:", deployer.address);
    console.log("Network:", await provider.getNetwork());
    
    try {
        // Deploy InterestRateModel first
        console.log("\n📦 Deploying InterestRateModel...");
        const InterestRateModelABI = [
            'constructor()',
            'function getBorrowRate(uint256 cash, uint256 borrows, uint256 reserves) external view returns (uint256)',
            'function getSupplyRate(uint256 cash, uint256 borrows, uint256 reserves, uint256 reserveFactorMantissa) external view returns (uint256)'
        ];
        
        const InterestRateModelBytecode = "0x608060405234801561001057600080fd5b50600436106100365760003560e01c806315f240531461003b5780636c540baf1461006f575b600080fd5b61004d6100493660046100d4565b610083565b6040516100669190610100565b60405180910390f35b61007761007d565b6040516100669190610100565b6000919050565b6000546001600160a01b0316331461009b57600080fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080fd5b600080fd5b600080fd5b60008083601f8401126100d157600080fd5b50813567ffffffffffffffff8111156100e957600080fd5b6020830191508360208285010111156100ff57600080fd5b9250929050565b600060208083528351808285015260005b8181101561012d57858101830151858201604001528201610111565b8181111561013f576000604083870101525b50601f01601f191692909201604001939250505056fea2646970667358221220...";
        
        const InterestRateModelFactory = new ethers.ContractFactory(InterestRateModelABI, InterestRateModelBytecode, deployer);
        const interestRateModel = await InterestRateModelFactory.deploy();
        await interestRateModel.waitForDeployment();
        const interestRateModelAddress = await interestRateModel.getAddress();
        console.log("✅ InterestRateModel deployed:", interestRateModelAddress);
        
        // Deploy PriceOracle
        console.log("\n📦 Deploying PriceOracle...");
        const PriceOracleABI = [
            'constructor()',
            'function setAssetPrice(address asset, uint256 price) external',
            'function getAssetPrice(address asset) external view returns (uint256)'
        ];
        
        const PriceOracleBytecode = "0x608060405234801561001057600080fd5b50600436106100365760003560e01c806315f240531461003b5780636c540baf1461006f575b600080fd5b61004d6100493660046100d4565b610083565b6040516100669190610100565b60405180910390f35b61007761007d565b6040516100669190610100565b6000919050565b6000546001600160a01b0316331461009b57600080fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080fd5b600080fd5b600080fd5b60008083601f8401126100d157600080fd5b50813567ffffffffffffffff8111156100e957600080fd5b6020830191508360208285010111156100ff57600080fd5b9250929050565b600060208083528351808285015260005b8181101561012d57858101830151858201604001528201610111565b8181111561013f576000604083870101525b50601f01601f191692909201604001939250505056fea2646970667358221220...";
        
        const PriceOracleFactory = new ethers.ContractFactory(PriceOracleABI, PriceOracleBytecode, deployer);
        const priceOracle = await PriceOracleFactory.deploy();
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        console.log("✅ PriceOracle deployed:", priceOracleAddress);
        
        // Deploy ERC20 tokens
        console.log("\n📦 Deploying ERC20 Tokens...");
        
        const ERC20ABI = [
            'constructor(string name, string symbol, uint8 decimals, uint256 initialSupply)',
            'function balanceOf(address) view returns (uint256)',
            'function totalSupply() view returns (uint256)',
            'function mint(address to, uint256 amount) external',
            'function approve(address spender, uint256 amount) returns (bool)'
        ];
        
        const ERC20Bytecode = "0x608060405234801561001057600080fd5b50600436106100365760003560e01c806315f240531461003b5780636c540baf1461006f575b600080fd5b61004d6100493660046100d4565b610083565b6040516100669190610100565b60405180910390f35b61007761007d565b6040516100669190610100565b6000919050565b6000546001600160a01b0316331461009b57600080fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080fd5b600080fd5b600080fd5b60008083601f8401126100d157600080fd5b50813567ffffffffffffffff8111156100e957600080fd5b6020830191508360208285010111156100ff57600080fd5b9250929050565b600060208083528351808285015260005b8181101561012d57858101830151858201604001528201610111565b8181111561013f576000604083870101525b50601f01601f191692909201604001939250505056fea2646970667358221220...";
        
        // Deploy WETH
        const WETHFactory = new ethers.ContractFactory(ERC20ABI, ERC20Bytecode, deployer);
        const weth = await WETHFactory.deploy("Wrapped Ether", "WETH", 18, ethers.parseEther("1000000"));
        await weth.waitForDeployment();
        const wethAddress = await weth.getAddress();
        console.log("✅ WETH deployed:", wethAddress);
        
        // Deploy DAI
        const dai = await WETHFactory.deploy("Dai Stablecoin", "DAI", 18, ethers.parseEther("1000000"));
        await dai.waitForDeployment();
        const daiAddress = await dai.getAddress();
        console.log("✅ DAI deployed:", daiAddress);
        
        // Deploy USDC
        const usdc = await WETHFactory.deploy("USD Coin", "USDC", 6, ethers.parseUnits("1000000", 6));
        await usdc.waitForDeployment();
        const usdcAddress = await usdc.getAddress();
        console.log("✅ USDC deployed:", usdcAddress);
        
        // Deploy LINK
        const link = await WETHFactory.deploy("Chainlink Token", "LINK", 18, ethers.parseEther("1000000"));
        await link.waitForDeployment();
        const linkAddress = await link.getAddress();
        console.log("✅ LINK deployed:", linkAddress);
        
        // Deploy LendingPool
        console.log("\n📦 Deploying LendingPool...");
        const LendingPoolABI = [
            'constructor(address irm, address oracle, address weth, address dai)',
            'function initReserve(address asset, uint8 decimals, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps) external',
            'function lend(address asset, uint256 amount) external',
            'function withdraw(address asset, uint256 amount) external returns (uint256)',
            'function borrow(address asset, uint256 amount) external',
            'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
            'function userReserves(address user, address asset) view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
            'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
            'function reserves(address asset) view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)'
        ];
        
        const LendingPoolBytecode = "0x608060405234801561001057600080fd5b50600436106100365760003560e01c806315f240531461003b5780636c540baf1461006f575b600080fd5b61004d6100493660046100d4565b610083565b6040516100669190610100565b60405180910390f35b61007761007d565b6040516100669190610100565b6000919050565b6000546001600160a01b0316331461009b57600080fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080fd5b600080fd5b600080fd5b60008083601f8401126100d157600080fd5b50813567ffffffffffffffff8111156100e957600080fd5b6020830191508360208285010111156100ff57600080fd5b9250929050565b600060208083528351808285015260005b8181101561012d57858101830151858201604001528201610111565b8181111561013f576000604083870101525b50601f01601f191692909201604001939250505056fea2646970667358221220...";
        
        const LendingPoolFactory = new ethers.ContractFactory(LendingPoolABI, LendingPoolBytecode, deployer);
        const lendingPool = await LendingPoolFactory.deploy(interestRateModelAddress, priceOracleAddress, wethAddress, daiAddress);
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
        await lendingPool.initReserve(wethAddress, 18, 1000, 5000, 5000, 1000); // 50% LTV
        await lendingPool.initReserve(daiAddress, 18, 1000, 5000, 5000, 1000); // 50% LTV
        await lendingPool.initReserve(usdcAddress, 6, 1000, 5000, 5000, 1000); // 50% LTV
        await lendingPool.initReserve(linkAddress, 18, 1000, 5000, 5000, 1000); // 50% LTV
        console.log("✅ Reserves initialized");
        
        // Mint tokens to deployer
        console.log("\n💰 Minting tokens to deployer...");
        await weth.mint(deployer.address, ethers.parseEther("1000000"));
        await dai.mint(deployer.address, ethers.parseEther("1000000"));
        await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await link.mint(deployer.address, ethers.parseEther("1000000"));
        console.log("✅ Tokens minted");
        
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
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
    }
}

main().catch(console.error);

