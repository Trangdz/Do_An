# LendHub v2 - Ganache Setup Guide

## 🎯 Tổng quan

Project LendHub v2 đã được cấu hình để hoạt động với Ganache local blockchain. Tất cả các dependencies đã được cài đặt và test đã chạy thành công.

## 🚀 Cài đặt và Chạy

### 1. Cài đặt Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Khởi động Ganache
- Mở Ganache GUI
- Tạo workspace mới với cấu hình:
  - Hostname: 127.0.0.1
  - Port: 7545
  - Chain ID: 1337
  - Mnemonic: `say post later service honey shiver cave title actual blue mention scan`

### 3. Chạy Tests
```bash
# Test cơ bản
npx hardhat test test/SimpleTest.cjs --network ganache

# Test toàn diện
npx hardhat test test/FullTest.cjs --network ganache
```

### 4. Deploy Contracts
```bash
# Deploy mock tokens và oracles
npx hardhat run scripts/deploy_mocks.cjs --network ganache

# Test Counter contract
npx hardhat run scripts/test_counter.cjs --network ganache

# Test LendHub contracts
npx hardhat run scripts/test_lendhub.cjs --network ganache
```

### 5. Kiểm tra kết nối
```bash
npx hardhat run scripts/check_ganache.cjs --network ganache
```

## 📁 Cấu trúc Project

```
lendhub_v2/
├── contracts/
│   ├── core/                    # Smart contracts chính (chưa có)
│   ├── interfaces/              # Interface definitions
│   ├── libraries/               # Thư viện toán học
│   ├── models/                  # Data structures
│   └── mocks/                   # Mock contracts
├── test/
│   ├── SimpleTest.cjs          # Test cơ bản
│   └── FullTest.cjs            # Test toàn diện
├── scripts/
│   ├── deploy_mocks.cjs        # Deploy mock contracts
│   ├── test_counter.cjs        # Test Counter contract
│   ├── test_lendhub.cjs        # Test LendHub contracts
│   └── check_ganache.cjs       # Kiểm tra kết nối
└── hardhat.config.cjs          # Cấu hình Hardhat
```

## 🔧 Cấu hình

### Hardhat Config
- Network: `ganache`
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337`
- Solidity: `^0.8.20`

### Dependencies
- Hardhat: `^2.26.0`
- Ethers.js: `^6.15.0`
- OpenZeppelin: `^5.0.0`
- Chai: `^4.5.0`

## 🧪 Test Results

✅ **Counter Contract**: Deploy và test thành công
✅ **Mock Tokens**: DAI, USDC deploy và hoạt động
✅ **Price Oracles**: ETH/USD, DAI/USD, USDC/USD
✅ **Token Transfers**: Chuyển token giữa accounts
✅ **Price Updates**: Cập nhật giá từ oracles
✅ **Ganache Connection**: Kết nối ổn định

## 🚨 Lưu ý

1. **ESM/CJS**: Project sử dụng CommonJS (.cjs) để tương thích với Hardhat
2. **Dependencies**: Sử dụng `--legacy-peer-deps` để tránh conflict
3. **Ganache**: Phải chạy trước khi test/deploy
4. **Network**: Luôn chỉ định `--network ganache`

## 🎉 Kết luận

Project LendHub v2 đã sẵn sàng để phát triển trên Ganache local blockchain. Tất cả các thành phần cơ bản đã được test và hoạt động tốt.

**Bước tiếp theo**: Phát triển các core contracts trong thư mục `contracts/core/` để hoàn thiện lending protocol.
