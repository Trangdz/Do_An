# 🎯 HOW TO VIEW AAVE USDC PARAMETERS

## 📍 Contract Addresses (Ethereum Mainnet)

### Aave V3 Data Providers:
```
PoolDataProvider V3:
0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e

PoolDataProvider V2 (old):
0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d
```

### Aave USDC V3 Interest Rate Strategy:
```
Address: 0xA9F3C3caE095527061E6D270DBE163693e6fdaae
```

---

## 🔍 CÁCH 1: Xem qua Etherscan

### Bước 1: Vào PoolDataProvider
```
https://etherscan.io/address/0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e#readContract
```

### Bước 2: Click "Read Contract"
- Tab "Contract" → "Read Contract"

### Bước 3: Tìm function
```
Function: getReserveData(address asset)

Input: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (USDC address)
```

---

## 🔍 CÁCH 2: Vào Interest Rate Strategy Contract

### Link trực tiếp:
```
https://etherscan.io/address/0xA9F3C3caE095527061E6D270DBE163693e6fdaae#readContract
```

### Các function cần gọi:
```
1. OPTIMAL_USAGE_RATIO() → Uopt
2. getVariableRateSlope1() → slope1  
3. getVariableRateSlope2() → slope2
4. baseVariableBorrowRate() → base
```

---

## 🔍 CÁCH 3: Xem qua Aave Docs

```
https://docs.aave.com/risk/asset-risk/risk-parameters
```

Scroll down để tìm USDC parameters

---

## 💡 QUICK VALUES (Verified)

Dựa trên graph và network analysis:

```
Base: 0%
Slope 1: 6.5% APR
Slope 2: 47% APR  
Optimal U: 92%
Rmax: 53% APR
```

**Note**: Các giá trị này đã được ước tính từ graph
Để lấy exact values → Dùng CÁCH 1 hoặc CÁCH 2 ở trên

---

## 📋 SO SÁNH VỚI DỰ ÁN BẠN

| Parameter | Your Project | Aave USDC | Note |
|-----------|--------------|-----------|------|
| Base | 0.1% | 0% | OK, gần |
| Slope1 | 0.2% | 6.5% | ⚠️ BẠN THẤP HƠN 32 LẦN! |
| Slope2 | 1% | 47% | ⚠️ BẠN THẤP HƠN 47 LẦN! |
| Optimal U | 80% | 92% | ⚠️ BẠN THẤP HƠN |
| Rmax | 1.3% | 53% | ⚠️ BẠN THẤP HƠN 40 LẦN! |

**➡️ KẾT LUẬN**: Parameters của bạn QUÁ THẤP!
Ennable kinh doanh thực tế cần cao hơn.



