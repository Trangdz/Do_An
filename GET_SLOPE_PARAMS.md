# 🎯 CÁCH XEM SLOPE1, SLOPE2, UOPT TRÊN ETHERSCAN

## ⚠️ Bạn đang xem contract SAI!

Địa chỉ bạn đang xem: `0x9ec6F08190DeA04A54f8Afc53Db96134e5E3FdFB`
➡️ ĐÂY KHÔNG PHẢI Interest Rate Strategy contract!

---

## ✅ VÀO ĐÚNG CONTRACT

### Interest Rate Strategy (USDC):
```
https://etherscan.io/address/0xA9F3C3caE095527061E6D270DBE163693e6fdaae
```

### HOẶC: Aave PoolDataProvider
```
https://etherscan.io/address/0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
```

---

## 📝 CÁC BƯỚC

### BƯỚC 1: Click tab "Contract"
Ở dòng tabs (Transactions, Contract, Events...)
➡️ Click "Contract"

### BƯỚC 2: Click "Read Contract"
Có nút màu xanh lá "Read Contract"
➡️ Click vào đó

### BƯỚC 3: Tìm các function này

Tìm trong danh sách functions:
```
✅ OPTIMAL_USAGE_RATIO
✅ getVariableRateSlope1  
✅ getVariableRateSlope2
✅ baseVariableBorrowRate
✅ getMaxVariableBorrowRate
```

### BƯỚC 4: Click từng function và Query
Click vào từng function và nhấn "Query" để xem giá trị

---

## 🚀 HOẶC: Xem trực tiếp trên GitHub

### Link GitHub Aave V3 Source:
```
https://github.com/aave/aave-v3-core
```

### File configuration:
```
aave-v3-core/contracts/protocol/lendingpool/
  → PoolConfigurator.sol
```

Tìm section: "USDC Interest Rate Strategy"

---

## 💡 GIÁ TRỊ NHANH (TỪ GRAPH)

Dựa trên graph bạn đã show:

```
Base:        0%
Slope 1:     6.5% APR
Slope 2:     ~47% APR
Optimal U:   92%
Rmax:        53% APR
```

**Cách kiểm chứng từ graph:**
- Optimal = 92% (vertical line)
- APR tại 92% = 6.00%
- Curve slope sau 92% rất dốc
- Max APR hiển thị = ~10% (nhưng thực tế cao hơn nhiều)

---

## 📊 SO SÁNH

| | Your Project | Aave |
|---|-------------|------|
| Base | 0.1% | 0% |
| Slope1 | 0.2% | 6.5% |
| Slope2 | 1% | 47% |
| Optimal U | 80% | 92% |
| Rmax | 1.3% | 53% |


