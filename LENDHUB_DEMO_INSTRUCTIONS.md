# LendHub v2 - Demo Instructions

## 🎯 Tổng quan

Hướng dẫn chạy demo LendHub v2 với event listener để monitor lãi suất động.

## 🚀 Cách chạy

### Option 1: Chạy từng bước (như yêu cầu)

```bash
# Bước 1: Deploy mock tokens & oracle feeds
npx hardhat run scripts/00_deploy_mocks_fixed.cjs --network ganache

# Bước 2: Deploy oracle & set prices
npx hardhat run scripts/01_deploy_oracle_fixed.cjs --network ganache

# Bước 3: Deploy LendingPool
npx hardhat run scripts/02_deploy_lendingpool_fixed.cjs --network ganache

# Bước 4: Chạy event listener (trong terminal khác)
npx hardhat run scripts/run_event_listener.cjs --network ganache
```

### Option 2: Chạy tất cả cùng lúc

```bash
# Chạy demo hoàn chỉnh với event listener
npx hardhat run scripts/complete_demo.cjs --network ganache
```

## 📋 Contract Addresses (từ demo cuối)

```
InterestRateModel: 0x21Bf5E9ca5AeC6BC9e53Ce30F7101d6750e08da8
PriceOracle: 0x722b595C3D804b47E0F24b4C3486ecfD21A34da6
LendingPool: 0xCA06292bec157877D20B424fDB88f742cd3D0946
DAI: 0xf877004dC804Bd501a2627bB3b1379247B1D4950
USDC: 0x8fAcF8BAb86D86C5E30CA90ba25B7E0e13342FF2
```

## 🎧 Event Listener

Script `run_event_listener.cjs` sẽ lắng nghe event `ReserveDataUpdated` và hiển thị:

```
-----------------------------------------------------
Asset: 0xf877004dC804Bd501a2627bB3b1379247B1D4950
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

## 🎉 Kết quả mong đợi

Khi bạn implement các functions chính trong LendingPool và thực hiện giao dịch, event listener sẽ tự động hiển thị bảng lãi suất động như yêu cầu:

```
-----------------------------------------------------
Asset: 0xf877004dC804Bd501a2627bB3b1379247B1D4950
Utilization:  45.00 %
Borrow APR:   7.25 %
Supply APR:   3.62 %
LiquidityIndex: 1000000000000000000000000000
BorrowIndex:    1000000000000000000000000000
```

## 🚀 Kết luận

LendHub v2 đã sẵn sàng để phát triển! Khi bạn implement các functions chính trong LendingPool, event listener sẽ tự động hiển thị bảng lãi suất động mỗi khi có giao dịch.
