# 📚 ETHERS.JS LÀ GÌ?

## 🎯 KHÁI NIỆM:

**Ethers.js** = Thư viện JavaScript để tương tác với Ethereum Blockchain

```
Ethers.js = Cầu nối giữa JavaScript ↔️ Ethereum Blockchain
```

---

## 🔍 CHỨC NĂNG CHÍNH:

### 1. **Kết nối với Blockchain**
```javascript
// Kết nối tới blockchain
const provider = new ethers.JsonRpcProvider('http://localhost:7545');
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io');
```

### 2. **Tạo Wallet**
```javascript
const wallet = new ethers.Wallet(privateKey, provider);
```

### 3. **Load Smart Contract**
```javascript
const contract = new ethers.Contract(address, ABI, signer);
```

### 4. **Gọi Contract Functions**
```javascript
// Read
const data = await contract.reserves(address);

// Write
await contract.updateInterestRateParams(...);
```

---

## 📊 SO SÁNH VỚI WEB3.JS:

| Feature | Ethers.js | Web3.js |
|---------|-----------|---------|
| **Kích thước** | Nhỏ hơn (~300KB) | Lớn hơn (~1MB) |
| **TypeScript** | Built-in support | Cần install riêng |
| **API** | Đơn giản hơn | Phức tạp hơn |
| **Community** | Đang phát triển | Đã lâu, stable |
| **Performance** | Nhanh hơn | Chậm hơn |

**→ Ethers.js = Modern, lighter, better for developers!**

---

## 💡 VÍ DỤ TRONG DỰ ÁN BẠN:

### 1. **Load Contract**

```javascript
// scripts/deploy_ganache_simple.cjs

const { ethers } = require("hardhat");  // ← Ethers.js được bundle trong Hardhat

// Khi dùng Hardhat:
const pool = await ethers.getContractFactory("LendingPool");
//            ↑
//        Ethers.js function!

const instance = await pool.deploy();
//               ↑
//         Ethers.js deploy!
```

### 2. **Gọi Functions**

```javascript
// Read data
const reserve = await pool.reserves(usdcAddress);
//              ↑
//         Ethers.js read!

// Write data
await pool.initReserve(
    usdcAddress,
    decimals,
    reserveFactorBps,
    ltvBps,
    liqThresholdBps,
    liqBonusBps,
    closeFactorBps,
    isBorrowable,
    optimalUBps,     // Set ở đây
    base,            // Set ở đây
    s1,              // Set ở đây
    s2               // Set ở đây
);
// ↑
// Ethers.js write transaction!
```

---

## 🎯 CẤU TRÚC ETHERS.JS:

### Các module chính:

```javascript
const ethers = require('ethers');

// 1. Providers (kết nối blockchain)
ethers.JsonRpcProvider       // Kết nối RPC
ethers.InfuraProvider        // Kết nối qua Infura
ethers.AlchemyProvider       // Kết nối qua Alchemy

// 2. Signers (sign transactions)
ethers.Wallet                // Local wallet
ethers.VoidSigner            // Read-only

// 3. Contract (load & interact)
ethers.Contract              // Load smart contract

// 4. Utils (utilities)
ethers.utils.formatEther()  // Chuyển đổi đơn vị
ethers.utils.parseEther()   // Chuyển đổi đơn vị
```

---

## 📖 VÍ DỤ ĐẦY ĐỦ:

### Example 1: Đọc reserve data

```javascript
const { ethers } = require('ethers');

async function readReserveData() {
    // Step 1: Tạo provider
    const provider = new ethers.JsonRpcProvider('http://localhost:7545');
    
    // Step 2: Load contract
    const poolAddress = '0x56328671A331a3563e86C4CC53b5E1945733A3E3';
    const poolABI = [/* ... */]; // ABI của LendingPool
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Step 3: Gọi function
    const data = await pool.reserves(USDC_ADDRESS);
    
    // Step 4: Xử lý data
    console.log('Slope1:', data.slope1RayPerSec.toString());
    
    // ✅ Ethers.js đã giúp đọc được data từ blockchain!
}

readReserveData();
```

### Example 2: Update parameters

```javascript
const { ethers } = require('ethers');

async function updateParameters() {
    // Step 1: Tạo provider
    const provider = new ethers.JsonRpcProvider('http://localhost:7545');
    
    // Step 2: Load wallet
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Step 3: Load contract với signer
    const pool = new ethers.Contract(poolAddress, poolABI, wallet);
    
    // Step 4: Gọi function write
    const tx = await pool.updateInterestRateParams(
        USDC_ADDRESS,
        9000,
        newBase,
        newSlope1,
        newSlope2
    );
    
    console.log('Transaction:', tx.hash);
    
    // Step 5: Đợi confirmation
    await tx.wait();
    
    console.log('✅ Updated!');
    // ✅ Ethers.js đã giúp write vào blockchain!
}

updateParameters();
```

---

## 🔧 INSTALLATION:

### Trong dự án của bạn:

```bash
# package.json
{
  "dependencies": {
    "ethers": "^6.0.0"  // ← Ethers.js
  }
}
```

### Install:
```bash
npm install ethers
```

---

## 🎯 TÓM TẮT:

### Ethers.js là gì?

**Ethers.js** = Thư viện JavaScript giúp:
- ✅ Kết nối với Ethereum blockchain
- ✅ Đọc data từ smart contracts
- ✅ Gửi transactions
- ✅ Quản lý wallets
- ✅ Chuyển đổi đơn vị
- ✅ Tương tác với DeFi protocols

### Tại sao dùng Ethers.js?

1. **Đơn giản**: API dễ dùng
2. **TypeScript**: Built-in type support
3. **Nhẹ**: ~300KB vs Web3.js ~1MB
4. **Hiện đại**: Đang active development
5. **Documentation**: Tốt

### Được dùng ở đâu trong dự án?

- ✅ **Deploy scripts**: `scripts/deploy_*.cjs`
- ✅ **Frontend**: `lendhub-frontend-nextjs/` (Next.js dùng Ethers.js)
- ✅ **Hardhat**: Built-in Ethers.js
- ✅ **Indexer**: Đọc contracts
- ✅ **All JavaScript tương tác với contracts**

---

## 📚 TÀI LIỆU:

### Official Docs:
```
https://docs.ethers.org/
```

### Quick Start:
```javascript
// 1. Import
const { ethers } = require('ethers');

// 2. Kết nối
const provider = new ethers.JsonRpcProvider('http://localhost:7545');

// 3. Load contract
const contract = new ethers.Contract(address, abi, provider);

// 4. Sử dụng
const data = await contract.reserves(tokenAddress);
```

---

**Ethers.js = Công cụ chính để tương tác với Blockchain từ JavaScript!**




