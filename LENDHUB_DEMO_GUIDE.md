# LendHub v2 - Demo Guide

## 🎯 Tổng quan

Hướng dẫn chạy demo LendHub v2 với event listener để monitor lãi suất động.

## 🚀 Cách chạy

### Option 1: Chạy từng bước

```bash
# Bước 1: Deploy mock tokens & oracle feeds
npx hardhat run scripts/00_deploy_mocks_fixed.cjs --network ganache

# Bước 2: Deploy oracle & set prices
npx hardhat run scripts/01_deploy_oracle_fixed.cjs --network ganache

# Bước 3: Deploy LendingPool
npx hardhat run scripts/02_deploy_lendingpool_fixed.cjs --network ganache

# Bước 4: Chạy event listener (trong terminal khác)
npx hardhat run scripts/03_show_rates_fixed.cjs --network ganache
```

### Option 2: Chạy tất cả cùng lúc

```bash
# Chạy demo hoàn chỉnh với event listener
npx hardhat run scripts/run_all_demo.cjs --network ganache
```

## 📋 Contract Addresses (từ demo cuối)

```
InterestRateModel: 0xc5332b4A3cBF40c1cc8DF10a11D5af01aff3f037
PriceOracle: 0x7a8d8250Bf8CD262c61dbfA2a8Be4E8ef45F72C8
LendingPool: 0xD898096173C48c8bFef6677DBCC87343c4fEaD19
DAI: 0x78608d72b50ebC71089C30bdf6bACe5265AA9aa3
USDC: 0x695c9dF29c5a800a3e311A2C9f3f5818703aA899
```

## 🎧 Event Listener

Script `03_show_rates_fixed.cjs` sẽ lắng nghe event `ReserveDataUpdated` và hiển thị:

```
-----------------------------------------------------
Asset: 0x78608d72b50ebC71089C30bdf6bACe5265AA9aa3
Utilization:  45.00 %
Borrow APR:   7.25 %
Supply APR:   3.62 %
LiquidityIndex: 1000000000000000000000000000
BorrowIndex:    1000000000000000000000000000
```

## ⚠️ Lưu ý quan trọng

**Event `ReserveDataUpdated` chỉ được emit khi:**
- Function `_accrue()` được gọi trong LendingPool
- `_accrue()` là internal function, chỉ được gọi từ các public functions khác
- Hiện tại LendingPool chưa có các public functions như `supply()`, `borrow()`, `repay()`

## 🔧 Để trigger events

Bạn cần implement các functions sau trong LendingPool:

```solidity
function supply(address asset, uint256 amount) external {
    _accrue(asset); // Gọi _accrue trước khi xử lý
    // Logic supply...
}

function borrow(address asset, uint256 amount) external {
    _accrue(asset); // Gọi _accrue trước khi xử lý
    // Logic borrow...
}

function repay(address asset, uint256 amount) external {
    _accrue(asset); // Gọi _accrue trước khi xử lý
    // Logic repay...
}
```

## 📊 Test Results

✅ **Mock Tokens**: Deploy và mint thành công
✅ **Oracle Feeds**: Deploy và hoạt động
✅ **Core Contracts**: Deploy và hoạt động
✅ **Price Oracle**: Set và get prices thành công
✅ **Interest Rate Model**: Tính toán rates thành công
✅ **Event Listener**: Sẵn sàng lắng nghe events

## 🎉 Kết luận

LendHub v2 đã sẵn sàng để phát triển! Khi bạn implement các functions chính trong LendingPool, event listener sẽ tự động hiển thị bảng lãi suất động mỗi khi có giao dịch.
