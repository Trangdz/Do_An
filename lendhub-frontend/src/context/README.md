# LendHub v2 Context Structure

## Tổng quan

Cấu trúc context của LendHub v2 được tổ chức tương tự như LendHub v1, với 2 file chính:

- `lendContext.js` - Định nghĩa React Context
- `LendState.js` - Logic implementation và state management
- `useLendContext.js` - Hook để sử dụng context dễ dàng

## Cấu trúc Files

```
src/context/
├── lendContext.js          # React Context definition
├── LendState.js           # Main logic & state management
├── useLendContext.js      # Hook for easy context usage
├── LendState.d.ts         # TypeScript declarations
├── useLendContext.d.ts    # TypeScript declarations
└── README.md              # This file
```

## So sánh với LendHub v1

| Aspect | **LendHub v1** | **LendHub v2** |
|--------|----------------|----------------|
| **Framework** | Next.js | Vite + React |
| **Language** | JavaScript | JavaScript + TypeScript |
| **Blockchain** | Web3.js + Ethers v5 | Ethers v6 |
| **Functions** | 21+ functions | 25+ functions |
| **State Management** | 8+ state variables | 10+ state variables |
| **Error Handling** | `reportError()` | `reportError()` + try-catch |
| **Type Safety** | None | TypeScript declarations |

## Các Functions chính

### 🔹 **Utility Functions:**
- `numberToEthers(number)` - Chuyển số thành ethers format
- `reportError(error)` - Xử lý lỗi thống nhất
- `getContract(address, abi)` - Tạo contract instance

### 🔹 **Wallet Functions:**
- `connectWallet()` - Kết nối MetaMask
- `refresh()` - Refresh tất cả data

### 🔹 **Asset Functions:**
- `getUserAssets()` - Lấy tất cả assets của user
- `getYourSupplies()` - Lấy supplies của user
- `getYourBorrows()` - Lấy borrows của user
- `getAssetsToBorrow()` - Lấy assets có thể borrow

### 🔹 **Transaction Functions:**
- `ApproveToContinue(tokenAddress, approveAmount)` - Approve tokens
- `LendAsset(token, supplyAmount)` - Supply asset
- `WithdrawAsset(tokenAddress, withdrawAmount)` - Withdraw asset
- `borrowAsset(token, borrowAmount)` - Borrow asset
- `repayAsset(tokenAddress, repayAmount)` - Repay asset

### 🔹 **ETH/WETH Functions:**
- `wrapEth(amountEth)` - Wrap ETH to WETH
- `unwrapWeth(amountEth)` - Unwrap WETH to ETH

### 🔹 **Account Functions:**
- `getAccountData(user?)` - Lấy collateral, debt, health factor
- `getUserTotalAvailableBalance()` - Tổng balance available
- `getTokensPerUSDAmount(token, amount)` - Tính tokens từ USD

### 🔹 **Data Processing Functions:**
- `objectifySuppliedAssets(assets)` - Format supplied assets
- `objectifyBorrowedAssets(assets)` - Format borrowed assets
- `mergeObjectifiedAssets(assets)` - Merge assets với token info

### 🔹 **Interest Functions:**
- `updateInterests(asset)` - Cập nhật lãi suất (accrue)

## State Management

### 🔹 **Wallet State:**
```javascript
metamaskDetails: {
  provider: ethers.Provider | null,
  networkName: string | null,
  signer: ethers.Signer | null,
  currentAccount: string | null,
  chainId: number | null,
}
```

### 🔹 **Asset States:**
```javascript
userAssets: any[],           // Tất cả assets của user
supplyAssets: any[],         // Assets user đã supply
yourBorrows: any[],          // Assets user đã borrow
assetsToBorrow: any[],       // Assets có thể borrow
```

### 🔹 **Summary States:**
```javascript
supplySummary: {
  totalUSDBalance: number,
  weightedAvgAPY: number,
  totalUSDCollateral: number,
}

borrowSummary: {
  totalUSDBalance: number,
  weightedAvgAPY: number,
  totalBorrowPowerUsed: number,
}

accountData: {
  collateralUSD: string,
  debtUSD: string,
  healthFactor: string,
}
```

## Cách sử dụng

### 1. **Wrap App với LendState:**
```jsx
import LendState from './context/LendState';

function App() {
  return (
    <LendState>
      <YourComponents />
    </LendState>
  );
}
```

### 2. **Sử dụng trong Components:**
```jsx
import useLendContext from '../context/useLendContext';

function YourComponent() {
  const {
    metamaskDetails,
    userAssets,
    connectWallet,
    refresh,
    LendAsset,
    // ... other functions
  } = useLendContext();

  // Use the context...
}
```

## Ưu điểm

### ✅ **Tập trung logic:**
- Tất cả blockchain logic ở 1 chỗ
- Dễ debug và fix lỗi
- Dễ thêm/sửa functions

### ✅ **Reusable:**
- Components chỉ cần `useLendContext()`
- Không cần import nhiều files
- API nhất quán

### ✅ **Type Safety:**
- TypeScript declarations
- IntelliSense support
- Compile-time error checking

### ✅ **Maintainable:**
- Cấu trúc rõ ràng
- Dễ hiểu và maintain
- Tương thích với LendHub v1

## Lưu ý

- Sử dụng `ethers v6` thay vì `v5`
- Tất cả functions đều async
- Error handling được tích hợp sẵn
- State được update tự động sau transactions
