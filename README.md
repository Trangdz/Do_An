# LendHub v2 (Aave-Lite, Ganache + MetaMask)

## 1. Prerequisites
- Node 18+
- Ganache (RPC: http://127.0.0.1:7545, ChainId: 1337/5777)
- MetaMask (đã add network Ganache)

## 2. Install
```bash
npm install
```

## 3. Networks

`hardhat.config.cjs` đã có cấu hình ganache.

Đảm bảo GANACHE_MNEMONIC trong .env (hoặc dán mnemonic trực tiếp).

## 4. Deploy mocks & oracle
```bash
npx hardhat run scripts/00_deploy_mocks.ts --network ganache
# Ghi lại địa chỉ DAI, USDC, (WETH nếu bạn thêm), ETH/USD, DAI/USD, USDC/USD
npx hardhat run scripts/01_deploy_oracle.ts --network ganache
# Paste địa chỉ đã deploy vào 01_deploy_oracle.ts trước khi chạy
```

## 5. Deploy pool & init reserves
```bash
npx hardhat run scripts/02_deploy_pool_enhanced.cjs --network ganache
# Lệnh này in ra địa chỉ LendingPool. Paste địa chỉ này vào các script Day 4-7.
```

## 6. Bảng lãi suất động (nghe event)
```bash
npx hardhat run scripts/03_show_rates_fixed.cjs --network ganache
```

## 7. Demo E2E
```bash
npx hardhat run scripts/07_scenario_e2e.cjs --network ganache
```

## 8. Giá oracle

Tăng/giảm giá ETH để mô phỏng rủi ro:

```bash
npx hardhat run scripts/07b_update_eth_price.cjs --network ganache
```

## 9. Tham số gợi ý

- optimalU = 80%
- baseAPR ≈ 0.1%/y, slope1 ≈ 0.2%/y, slope2 ≈ 1%/y
- reserveFactor = 10%, LTV = 75%, Threshold = 80%, Bonus = 5%, closeFactor = 50%
- Giá mock: ETH=1600$, DAI=1$, USDC=1$

## 10. Công thức (chuẩn Aave)

- U = debt / (cash + debt)
- 2-slope borrow rate:
  - U ≤ U*: base + slope1 * (U/U*)
  - U > U*: base + slope1 + slope2 * ((U-U*)/(1-U*))
- Supply ≈ Borrow * U * (1 - reserveFactor)
- Index(t+dt) = Index(t) * (1 + rate/sec * dt)
- HF = Σ(supply*price*threshold) / Σ(debt*price)
- Withdraw limit x_max theo HF

## 11. Ghi chú

- HF, withdraw-limit, liquidation dùng market price từ oracle (giống Aave).
- Event ReserveDataUpdated phát sau mỗi accrue/giao dịch → script 03_show_rates_fixed.cjs hiển thị bảng lãi suất động.
- Guardrails: ReentrancyGuard, SafeERC20 (FoT-aware), Pausable, oracle price=0/stale guard.

## 12. Contract Addresses (Latest Deployment)

```
LendingPool: 0x773d2D3f945fD63b1997EF0E22D98dBad952eC7c
InterestRateModel: 0xE53d1DC0051077B7658c2466432190DEc7De826a
PriceOracle: 0xDD0635A53fdAeb1AdE00E627f791d2AB128F016f

DAI: 0x273a58F2D2D00DfAdB0eD8C71c7286fa0b4A740c
USDC: 0x256863b3473280f88e9B93488BB5964350b216a2
WETH: 0x84f07E0FC4883Aa96101c41af8c197E794434FfF

DAI/USD Feed: 0xD15E79143F29549feea97E46922a8ad7E6A10781
USDC/USD Feed: 0x5a2D2759F370ad5181416D002B98c44cF10594a5
ETH/USD Feed: 0x991f6635F152445Bbf97E3694a5306BC89Cc402b
```

## 13. Features

### ✅ Core Functions
- **Supply/Lend**: Deposit assets as collateral
- **Withdraw**: Withdraw supplied assets (with health factor checks)
- **Borrow**: Borrow assets against collateral
- **Repay**: Repay borrowed assets
- **Liquidation**: Liquidate undercollateralized positions

### ✅ Security Features
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **SafeERC20**: Fee-on-transfer token support
- **Health Factor**: Collateralization ratio monitoring

### ✅ Interest Rate Model
- **2-slope curve**: Base rate + slope1 + slope2
- **Dynamic rates**: Based on utilization
- **High precision**: RAY (1e27) precision for rates

### ✅ Multi-Asset Support
- **DAI**: 18 decimals, borrowable
- **USDC**: 6 decimals, borrowable  
- **WETH**: 18 decimals, collateral only

## 14. Quick Start

1. **Start Ganache**
2. **Deploy everything:**
   ```bash
   npx hardhat run scripts/02_deploy_pool_enhanced.cjs --network ganache
   ```
3. **Start event listener:**
   ```bash
   npx hardhat run scripts/03_show_rates_fixed.cjs --network ganache
   ```
4. **Run E2E demo:**
   ```bash
   npx hardhat run scripts/07_scenario_e2e.cjs --network ganache
   ```

## 15. Troubleshooting

- **"AssetNotInitialized"**: Run deployment script first
- **"Insufficient liquidity"**: Check if assets are supplied to pool
- **"Health factor too low"**: Reduce borrow amount or add more collateral
- **"FeedNotSet"**: Ensure price feeds are set in oracle

---

**🎉 LendHub v2 - A complete DeFi lending protocol!**