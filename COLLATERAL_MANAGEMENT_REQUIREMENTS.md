# 🎯 YÊU CẦU: COLLATERAL MANAGEMENT CHO MỖI LOẠI TIỀN

## 📋 CHỨC NĂNG CẦN THÊM (Giống Aave):

### 1. **Get User Collateral List** ❌
```solidity
// Thiếu: Liệt kê assets nào user đang dùng làm collateral
function getUserCollateral(address user) external view returns (address[] memory);
```

### 2. **Check If Asset Can Be Collateral** ❌
```solidity
// Thiếu: Check asset có LTV > 0 không
function canUseAsCollateral(address asset) external view returns (bool);
```

### 3. **Get User Collateral Value** ⚠️ Partial
```solidity
// Có: _getAccountData() nhưng trả về tổng
// Thiếu: Value của từng asset riêng lẻ
function getUserCollateralValue(address user, address asset) external view returns (uint256);
```

### 4. **Get Max Borrowable Amount** ❌
```solidity
// Thiếu: Tính được vay tối đa bao nhiêu
function getMaxBorrowable(address user, address asset) external view returns (uint256);
```

### 5. **Get Debt Utilization** ❌
```solidity
// Thiếu: % debt so với collateral capacity
function getDebtUtilization(address user) external view returns (uint256);
```

### 6. **Batch Collateral Operations** ❌
```solidity
// Thiếu: Enable/disable nhiều assets cùng lúc
function setUserCollaterals(address[] memory assets, bool[] memory useAsCollateral) external;
```

### 7. **Check Liquidation Risk** ❌
```solidity
// Thiếu: Check gần liquidation threshold chưa
function getLiquidationRisk(address user, address asset) external view returns (uint256);
```

---

## 🎯 CẦN IMPLEMENT:

Các functions thiếu cho collateral management hoàn chỉnh!


