# Code Chainlink Node: Tạo Wallet và Ký Transactions

## 📋 Tổng Quan

Tài liệu này trình bày code của Chainlink node:
1. Tạo wallet address từ private key
2. Dùng address để ký transactions
3. Gửi transactions lên blockchain

## 🔑 1. Chainlink Node Tạo Wallet Address

### **Chainlink Node Configuration**

**File: `chainlink-data/config.toml`**

```toml
# Chainlink node configuration
[EVM]
Enabled = true
ChainID = 1337
NodeURL = "http://host.docker.internal:7545"

# Private key được lưu trong secrets.toml (không commit)
# Chainlink node tự động tạo wallet từ private key
```

**File: `chainlink-data/secrets.toml`** (không commit vào git)

```toml
# Private key của Chainlink node
[EVM.Keys]
Primary = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# Chainlink node tự động:
# 1. Đọc private key từ secrets.toml
# 2. Tạo wallet address từ private key
# 3. Lưu address để dùng cho transactions
```

### **Code Tương Đương (Pseudo-code)**

```javascript
// Chainlink node (internal code - không có trong repo)
const privateKey = process.env.CHAINLINK_PRIVATE_KEY;
// hoặc đọc từ secrets.toml

// Tạo wallet từ private key
const wallet = new ethers.Wallet(privateKey);

// Lấy địa chỉ wallet
const nodeAddress = wallet.address;
// → "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

console.log("Chainlink Node Address:", nodeAddress);
```

## ✍️ 2. Chainlink Node Ký Transactions

### **Chainlink Job Configuration**

**File: `chainlink-data/job-weth.toml`**

```toml
type = "cron"
schemaVersion = 1
name = "WETH/USD Price"
schedule = "@every 3m"

observationSource = """
fetch    [type="http" method="GET" url="https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"]
parse    [type="jsonparse" path="price" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="updatePrice(string symbol, int256 price)" data="{\\\"symbol\\\": \\\"WETH\\\", \\\"price\\\": $(multiply)}"]
submit   [type="ethtx" to="0xFF13881F1A48cEF04aC5c341aa9D3aFCAB60d4C3" data="$(encode)" gasLimit="500000"]
fetch->parse->multiply->encode->submit
"""
```

**Giải thích:**
- `fetch`: Fetch giá từ Binance API (OFF-CHAIN)
- `parse`: Parse JSON response
- `multiply`: Convert sang 8 decimals
- `encode`: Encode function call `updatePrice(symbol, price)`
- `submit`: **Ký và gửi transaction** (Chainlink node tự động ký bằng private key)

### **Code Tương Đương (Pseudo-code)**

```javascript
// Chainlink node (internal code - không có trong repo)
async function executeJob() {
  // 1. Fetch giá từ Binance API (OFF-CHAIN)
  const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
  const data = await response.json();
  const priceUSD = parseFloat(data.price);
  
  // 2. Convert sang 8 decimals
  const price8dec = Math.round(priceUSD * 1e8);
  
  // 3. Encode function call
  const iface = new ethers.Interface([
    'function updatePrice(string symbol, int256 price)'
  ]);
  const encodedData = iface.encodeFunctionData('updatePrice', ['WETH', price8dec]);
  
  // 4. Tạo transaction object
  const tx = {
    to: '0xFF13881F1A48cEF04aC5c341aa9D3aFCAB60d4C3', // MultiPriceAggregator
    data: encodedData,
    gasLimit: 500000,
    nonce: await provider.getTransactionCount(nodeAddress),
    gasPrice: await provider.getGasPrice(),
    chainId: 1337
  };
  
  // 5. Ký transaction bằng private key (OFF-CHAIN)
  const signedTx = await wallet.signTransaction(tx);
  // → Chainlink node tự động ký bằng private key
  // → Transaction.from = nodeAddress
  
  // 6. Gửi transaction qua RPC (OFF-CHAIN → ON-CHAIN)
  const txHash = await provider.sendTransaction(signedTx);
  
  console.log('Transaction sent:', txHash.hash);
}
```

## 📤 3. Script Mô Phỏng Chainlink Node

**File: `scripts/update_prices_from_binance.cjs`**

Script này mô phỏng cách Chainlink node hoạt động:

```javascript
const hre = require("hardhat");
const axios = require("axios");

async function main() {
  // 1. Đọc contract address
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  // 2. Lấy deployer (có private key)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  // → deployer.address = wallet address từ private key
  
  // 3. Tạo contract instance với signer
  const aggregator = await hre.ethers.getContractAt(
    "MultiPriceAggregator", 
    aggregatorAddress
  );
  
  // 4. Check writer (địa chỉ được authorize)
  const writer = await aggregator.writer();
  console.log("Current writer:", writer);
  // → writer = nodeAddress (địa chỉ Chainlink node)
  
  // 5. Fetch giá từ Binance API (OFF-CHAIN)
  const response = await axios.get(
    `https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT`
  );
  const priceUSD = parseFloat(response.data.price);
  
  // 6. Convert sang 8 decimals
  const price8dec = Math.round(priceUSD * 1e8);
  
  // 7. Gọi function với signer (tự động ký transaction)
  const tx = await aggregator.updatePrice("WETH", price8dec);
  // → deployer (có private key) tự động ký transaction
  // → Transaction.from = deployer.address
  
  console.log("Transaction:", tx.hash);
  await tx.wait();
  
  // 8. Verify update
  const [updatedPrice, roundId, updatedAt] = await aggregator.getPrice("WETH");
  console.log("✅ Updated:", updatedPrice);
}
```

## 🔍 4. Code Lấy Node Address

**File: `scripts/get_node_address.cjs`**

```javascript
const axios = require("axios");
const hre = require("hardhat");

const CL_API_URL = "http://localhost:6688"; // Chainlink node API

async function getAllNodeAddressesFromAPI() {
  // 1. Login vào Chainlink node API
  const loginRes = await axios.post(`${CL_API_URL}/sessions`, {
    email: "phamlendhub@email.com",
    password: "SuperSecretUIpass!@#"
  });
  
  // 2. Lấy cookie để authenticate
  const cookie = loginRes.headers["set-cookie"];
  
  // 3. Lấy danh sách wallet addresses từ Chainlink node
  const keysRes = await axios.get(`${CL_API_URL}/v2/keys/eth`, {
    headers: { Cookie: cookie }
  });
  
  // 4. Extract addresses
  if (keysRes.data?.data?.length > 0) {
    return keysRes.data.data.map(k => k.attributes.address);
    // → ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", ...]
  }
  
  return [];
}

async function findActiveAddress(allAddresses) {
  // 1. Đọc contract address
  const aggregatorAddress = data.contracts.multiPriceAggregator;
  
  // 2. Check current writer trong contract (ON-CHAIN)
  const aggregator = await hre.ethers.getContractAt(
    "MultiPriceAggregator", 
    aggregatorAddress
  );
  const currentWriter = await aggregator.writer();
  // → currentWriter = nodeAddress (địa chỉ Chainlink node)
  
  // 3. Verify address có trong danh sách
  if (allAddresses.some(addr => addr.toLowerCase() === currentWriter.toLowerCase())) {
    console.log(`✅ Current writer: ${currentWriter}`);
    return currentWriter;
  }
  
  return null;
}
```

## 🔐 5. Code Set Writer (Authorize Node)

**File: `scripts/deploy_ganache_simple.cjs`**

```javascript
// 1. Deploy MultiPriceAggregator contract
const multiPriceAggregator = await MultiPriceAggregator.deploy();
await multiPriceAggregator.waitForDeployment();
const multiAddr = await multiPriceAggregator.getAddress();

// 2. Lấy node address từ environment variable
const nodeAddress = process.env.NODE_ADDRESS;
// → "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

if (nodeAddress) {
  // 3. Set writer trong contract (ON-CHAIN)
  const setWriterTx = await multiPriceAggregator.setWriter(nodeAddress, true);
  await setWriterTx.wait();
  
  console.log("✅ Writer set to:", nodeAddress);
  // → Contract lưu: writer = nodeAddress
  // → Chỉ địa chỉ này mới có thể gọi updatePrice()
}
```

## 📊 6. Luồng Hoàn Chỉnh

### **Setup (Một Lần):**

```javascript
// 1. Chainlink Node (OFF-CHAIN) tạo wallet
const privateKey = "0x1234567890abcdef..."; // Từ secrets.toml
const wallet = new ethers.Wallet(privateKey);
const nodeAddress = wallet.address;
// → "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// 2. Set writer trong contract (ON-CHAIN)
await multiPriceAggregator.setWriter(nodeAddress, true);
// → Contract lưu: writer = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

### **Hoạt Động Hàng Ngày:**

```javascript
// Chainlink Node Job (chạy mỗi 3 phút)

// 1. Fetch giá từ Binance API (OFF-CHAIN)
const price = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');

// 2. Process data (OFF-CHAIN)
const price8dec = Math.round(price * 1e8);

// 3. Tạo transaction (OFF-CHAIN)
const tx = {
  to: multiPriceAggregatorAddress,
  data: encodeFunctionCall('updatePrice', ['WETH', price8dec]),
  gasLimit: 500000
};

// 4. Ký transaction bằng private key (OFF-CHAIN)
const signedTx = await wallet.signTransaction(tx);
// → Transaction.from = nodeAddress

// 5. Gửi transaction qua RPC (OFF-CHAIN → ON-CHAIN)
await provider.sendTransaction(signedTx);

// 6. Contract verify (ON-CHAIN)
// → msg.sender == writer? ✅
// → Execute updatePrice()
```

## 🎯 Tóm Tắt Code

### **1. Tạo Wallet Address:**

```javascript
// Chainlink node (internal)
const privateKey = process.env.CHAINLINK_PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey);
const nodeAddress = wallet.address;
```

### **2. Ký Transactions:**

```javascript
// Chainlink node job (TOML config)
submit [type="ethtx" to="0x..." data="$(encode)" gasLimit="500000"]
// → Chainlink node tự động ký bằng private key
```

### **3. Gửi Transactions:**

```javascript
// Chainlink node (internal)
const signedTx = await wallet.signTransaction(tx);
await provider.sendTransaction(signedTx);
```

### **4. Contract Verify:**

```solidity
// MultiPriceAggregator.sol (ON-CHAIN)
modifier onlyWriter() {
    require(msg.sender == writer, "Not authorized");
    // → msg.sender = nodeAddress (từ transaction)
    // → writer = nodeAddress (lưu trong contract)
    // → ✅ Match → Execute
}
```

## 📋 Files Liên Quan

1. **`chainlink-data/job-weth.toml`** - Chainlink job configuration
2. **`chainlink-data/config.toml`** - Chainlink node config
3. **`chainlink-data/secrets.toml`** - Private key (không commit)
4. **`scripts/update_prices_from_binance.cjs`** - Script mô phỏng Chainlink node
5. **`scripts/get_node_address.cjs`** - Lấy node address từ API
6. **`scripts/deploy_ganache_simple.cjs`** - Set writer trong contract

**Tóm lại: Chainlink node sử dụng private key để tạo wallet address và ký transactions, nhưng bản thân node vẫn chạy OFF-CHAIN trên server.**





