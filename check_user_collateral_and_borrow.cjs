const { ethers } = require("ethers");

async function main() {
    console.log("🔍 KIỂM TRA COLLATERAL VÀ TÍNH TOÁN VAY USDC");
    console.log("=============================================");

    // Ganache connection
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    
    // Contract addresses (update these with your deployed addresses)
    const LendingPoolAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update this
    const PriceOracleAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Update this
    
    // Contract ABIs
    const LendingPoolABI = [
        "function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)",
        "function getMaxBorrowable(address user, address asset) view returns (uint256)",
        "function getUserCollateral(address user) view returns (address[])",
        "function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)",
        "function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint40 lastUpdate, uint16 ltvBps, uint16 liquidationThresholdBps, uint16 liquidationBonusBps, uint16 closeFactorBps, bool isBorrowable, uint16 optimalUBps, uint8 decimals, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 reserveFactorBps))",
        "function getAllAssets() view returns (address[])",
        "function canUseAsCollateral(address asset) view returns (bool)"
    ];

    const PriceOracleABI = [
        "function getAssetPrice1e18(address asset) view returns (uint256)"
    ];

    // Token addresses (update these with your deployed addresses)
    const TOKENS = {
        WETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Update this
        DAI: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Update this
        USDC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Update this
        LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" // Update this
    };

    const TOKEN_SYMBOLS = {
        [TOKENS.WETH]: "WETH",
        [TOKENS.DAI]: "DAI", 
        [TOKENS.USDC]: "USDC",
        [TOKENS.LINK]: "LINK"
    };

    try {
        // Get user address (first account from Ganache)
        const accounts = await provider.listAccounts();
        const userAddress = accounts[0]; // Change this to your address
        console.log("👤 User Address:", userAddress);

        const pool = new ethers.Contract(LendingPoolAddress, LendingPoolABI, provider);
        const oracle = new ethers.Contract(PriceOracleAddress, PriceOracleABI, provider);

        console.log("\n📊 1. KIỂM TRA TÀI KHOẢN TỔNG QUAN");
        console.log("==================================");

        // Get account data
        const [collateralUSD, debtUSD, healthFactor] = await pool.getAccountData(userAddress);
        console.log("💰 Collateral USD:", ethers.formatEther(collateralUSD));
        console.log("💸 Debt USD:", ethers.formatEther(debtUSD));
        console.log("🏥 Health Factor:", ethers.formatEther(healthFactor));

        console.log("\n📋 2. KIỂM TRA TỪNG TÀI SẢN");
        console.log("=============================");

        // Get all assets
        const allAssets = await pool.getAllAssets();
        console.log("📝 All Assets:", allAssets.map(addr => TOKEN_SYMBOLS[addr] || addr.slice(0,6) + "..."));

        let totalCollateralValue = 0;
        let totalDebtValue = 0;
        let collateralAssets = [];

        for (const assetAddress of allAssets) {
            const symbol = TOKEN_SYMBOLS[assetAddress] || "UNKNOWN";
            console.log(`\n🔍 Checking ${symbol} (${assetAddress}):`);

            try {
                // Get user reserve data
                const userReserve = await pool.userReserves(userAddress, assetAddress);
                const reserveData = await pool.reserves(assetAddress);
                const price = await oracle.getAssetPrice1e18(assetAddress);

                console.log(`  📈 Price: $${ethers.formatEther(price)}`);
                console.log(`  💰 Supply: ${ethers.formatEther(userReserve.supply.principal)} ${symbol}`);
                console.log(`  💸 Borrow: ${ethers.formatEther(userReserve.borrow.principal)} ${symbol}`);
                console.log(`  🔐 Use as Collateral: ${userReserve.useAsCollateral ? "✅ YES" : "❌ NO"}`);
                console.log(`  📊 LTV: ${reserveData.ltvBps / 100}%`);
                console.log(`  🏦 Liquidation Threshold: ${reserveData.liquidationThresholdBps / 100}%`);
                console.log(`  💳 Is Borrowable: ${reserveData.isBorrowable ? "✅ YES" : "❌ NO"}`);

                // Calculate collateral value if used as collateral
                if (userReserve.useAsCollateral && userReserve.supply.principal > 0) {
                    const supplyValueUSD = parseFloat(ethers.formatEther(userReserve.supply.principal)) * parseFloat(ethers.formatEther(price));
                    const weightedCollateral = supplyValueUSD * (reserveData.ltvBps / 10000);
                    
                    console.log(`  💎 Supply Value USD: $${supplyValueUSD.toFixed(2)}`);
                    console.log(`  🎯 Weighted Collateral: $${weightedCollateral.toFixed(2)}`);
                    
                    totalCollateralValue += weightedCollateral;
                    collateralAssets.push({
                        symbol,
                        address: assetAddress,
                        supply: parseFloat(ethers.formatEther(userReserve.supply.principal)),
                        price: parseFloat(ethers.formatEther(price)),
                        ltv: reserveData.ltvBps / 100,
                        weightedCollateral
                    });
                }

                // Calculate debt value
                if (userReserve.borrow.principal > 0) {
                    const debtValueUSD = parseFloat(ethers.formatEther(userReserve.borrow.principal)) * parseFloat(ethers.formatEther(price));
                    totalDebtValue += debtValueUSD;
                    console.log(`  💸 Debt Value USD: $${debtValueUSD.toFixed(2)}`);
                }

            } catch (error) {
                console.log(`  ❌ Error checking ${symbol}:`, error.message);
            }
        }

        console.log("\n💰 3. TỔNG KẾT COLLATERAL");
        console.log("========================");
        console.log(`📊 Total Collateral Value: $${totalCollateralValue.toFixed(2)}`);
        console.log(`💸 Total Debt Value: $${totalDebtValue.toFixed(2)}`);
        console.log(`🎯 Available Collateral: $${(totalCollateralValue - totalDebtValue).toFixed(2)}`);

        console.log("\n🔐 4. COLLATERAL ASSETS CHI TIẾT");
        console.log("===============================");
        collateralAssets.forEach((asset, index) => {
            console.log(`${index + 1}. ${asset.symbol}:`);
            console.log(`   - Supply: ${asset.supply.toFixed(6)} ${asset.symbol}`);
            console.log(`   - Price: $${asset.price.toFixed(2)}`);
            console.log(`   - LTV: ${asset.ltv}%`);
            console.log(`   - Weighted Value: $${asset.weightedCollateral.toFixed(2)}`);
        });

        console.log("\n💳 5. TÍNH TOÁN VAY USDC");
        console.log("========================");

        if (totalCollateralValue <= totalDebtValue) {
            console.log("❌ KHÔNG THỂ VAY: Collateral <= Debt");
            console.log("💡 Cần thêm collateral hoặc trả nợ trước");
            return;
        }

        const availableCollateral = totalCollateralValue - totalDebtValue;
        console.log(`💰 Available Collateral: $${availableCollateral.toFixed(2)}`);

        // Check USDC reserve data
        const usdcReserve = await pool.reserves(TOKENS.USDC);
        const usdcPrice = await oracle.getAssetPrice1e18(TOKENS.USDC);
        const usdcLTV = usdcReserve.ltvBps / 100;

        console.log(`💵 USDC Price: $${ethers.formatEther(usdcPrice)}`);
        console.log(`📊 USDC LTV: ${usdcLTV}%`);
        console.log(`🏦 USDC Is Borrowable: ${usdcReserve.isBorrowable ? "✅ YES" : "❌ NO"}`);

        if (!usdcReserve.isBorrowable) {
            console.log("❌ KHÔNG THỂ VAY USDC: Asset không được phép borrow");
            return;
        }

        // Calculate max USDC borrow
        const maxBorrowValueUSD = availableCollateral * (usdcLTV / 100);
        const maxBorrowUSDC = maxBorrowValueUSD / parseFloat(ethers.formatEther(usdcPrice));

        console.log(`🎯 Max Borrow Value: $${maxBorrowValueUSD.toFixed(2)}`);
        console.log(`💵 Max Borrow USDC: ${maxBorrowUSDC.toFixed(6)} USDC`);

        // Get actual max borrowable from contract
        try {
            const contractMaxBorrow = await pool.getMaxBorrowable(userAddress, TOKENS.USDC);
            console.log(`📋 Contract Max Borrow: ${ethers.formatEther(contractMaxBorrow)} USDC`);
            
            if (parseFloat(ethers.formatEther(contractMaxBorrow)) > 0) {
                console.log("✅ CÓ THỂ VAY USDC!");
            } else {
                console.log("❌ KHÔNG THỂ VAY USDC!");
            }
        } catch (error) {
            console.log("❌ Error getting max borrowable:", error.message);
        }

        console.log("\n🏥 6. KIỂM TRA HEALTH FACTOR");
        console.log("===========================");
        
        const currentHF = parseFloat(ethers.formatEther(healthFactor));
        if (currentHF === Number.MAX_SAFE_INTEGER || currentHF > 1e18) {
            console.log("✅ Health Factor: ∞ (No debt)");
        } else {
            console.log(`🏥 Health Factor: ${currentHF.toFixed(4)}`);
            if (currentHF < 1) {
                console.log("⚠️ WARNING: Health Factor < 1 - Risk of liquidation!");
            } else if (currentHF < 1.5) {
                console.log("⚠️ WARNING: Health Factor < 1.5 - High risk!");
            } else {
                console.log("✅ Health Factor is safe");
            }
        }

        console.log("\n💡 7. KHUYẾN NGHỊ");
        console.log("==================");
        
        if (collateralAssets.length === 0) {
            console.log("❌ Không có tài sản nào được dùng làm collateral");
            console.log("💡 Cần enable collateral cho các tài sản đã supply");
        } else if (totalCollateralValue <= totalDebtValue) {
            console.log("❌ Collateral không đủ để vay");
            console.log("💡 Cần thêm collateral hoặc trả nợ");
        } else if (maxBorrowUSDC > 0) {
            console.log("✅ Có thể vay USDC");
            console.log(`💡 Khuyến nghị vay tối đa: ${Math.min(maxBorrowUSDC * 0.8, 1000).toFixed(2)} USDC (80% max để an toàn)`);
        } else {
            console.log("❌ Không thể vay USDC");
            console.log("💡 Kiểm tra lại cấu hình USDC reserve");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main().catch(console.error);
