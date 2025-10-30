# Sơ đồ Luồng Logic Nghiệp vụ - LendHub v2

## 1. Luồng Lending (Gửi tiền kiếm lãi)

```
┌─────────────────┐
│   User Wallet   │
└─────────┬───────┘
          │
          │ 1. Call lend(asset, amount)
          ▼
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 2. _accrue(asset)
          ▼
┌─────────────────┐    ┌─────────────────┐
│InterestRateModel│◄───┤   LendingPool   │
│   .getRates()   │    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. Transfer token từ user
                                ▼
┌─────────────────┐
│   Token Contract│
│  (WETH/DAI/USDC)│
└─────────────────┘
          │
          │ 4. Cập nhật user position
          ▼
┌─────────────────┐
│  UserReserveData│
│  - supply.principal
│  - supply.index
│  - useAsCollateral
└─────────────────┘
          │
          │ 5. Cập nhật reserve data
          ▼
┌─────────────────┐
│   ReserveData   │
│  - reserveCash
│  - liquidityIndex
│  - liquidityRate
└─────────────────┘
```

## 2. Luồng Borrowing (Vay tiền)

```
┌─────────────────┐
│   User Wallet   │
└─────────┬───────┘
          │
          │ 1. Call borrow(asset, amount)
          ▼
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 2. _accrue(asset)
          ▼
┌─────────────────┐    ┌─────────────────┐
│InterestRateModel│◄───┤   LendingPool   │
│   .getRates()   │    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. _getAccountData(user)
                                ▼
┌─────────────────┐    ┌─────────────────┐
│  PriceOracle    │◄───┤   LendingPool   │
│.getAssetPrice1e18│    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 4. Kiểm tra Health Factor
                                ▼
┌─────────────────┐
│ Health Factor   │
│ Check: col >=   │
│ debt * 1.1      │
└─────────────────┘
          │
          │ 5. Kiểm tra thanh khoản
          ▼
┌─────────────────┐
│ Reserve Cash    │
│ Check: available│
│ >= borrowAmount │
└─────────────────┘
          │
          │ 6. Transfer token cho user
          ▼
┌─────────────────┐
│   Token Contract│
│  (WETH/DAI/USDC)│
└─────────────────┘
          │
          │ 7. Cập nhật user debt position
          ▼
┌─────────────────┐
│  UserReserveData│
│  - borrow.principal
│  - borrow.index
└─────────────────┘
```

## 3. Luồng Repay (Trả nợ)

```
┌─────────────────┐
│   User Wallet   │
└─────────┬───────┘
          │
          │ 1. Call repay(asset, amount, onBehalfOf)
          ▼
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 2. _accrue(asset)
          ▼
┌─────────────────┐    ┌─────────────────┐
│InterestRateModel│◄───┤   LendingPool   │
│   .getRates()   │    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. Transfer token từ user
                                ▼
┌─────────────────┐
│   Token Contract│
│  (WETH/DAI/USDC)│
└─────────────────┘
          │
          │ 4. Dust Protection
          ▼
┌─────────────────┐
│ Dust Cleanup    │
│ - Clear small   │
│   debt amounts  │
└─────────────────┘
          │
          │ 5. Cập nhật user debt position
          ▼
┌─────────────────┐
│  UserReserveData│
│  - borrow.principal
│  - borrow.index
└─────────────────┘
          │
          │ 6. Cập nhật reserve data
          ▼
┌─────────────────┐
│   ReserveData   │
│  - reserveCash
│  - totalDebtPrincipal
└─────────────────┘
```

## 4. Luồng Liquidation (Thanh lý)

```
┌─────────────────┐
│   Liquidator    │
└─────────┬───────┘
          │
          │ 1. Call liquidationCall(debtAsset, collateralAsset, user, repayAmount)
          ▼
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 2. _accrue() cho cả debt và collateral asset
          ▼
┌─────────────────┐    ┌─────────────────┐
│InterestRateModel│◄───┤   LendingPool   │
│   .getRates()   │    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. _getAccountData(user)
                                ▼
┌─────────────────┐    ┌─────────────────┐
│  PriceOracle    │◄───┤   LendingPool   │
│.getAssetPrice1e18│    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 4. Kiểm tra Health Factor < 1
                                ▼
┌─────────────────┐
│ Health Factor   │
│ Check: HF < 1   │
└─────────────────┘
          │
          │ 5. Tính toán close factor
          ▼
┌─────────────────┐
│ Close Factor    │
│ maxRepay =      │
│ debt * closeFactor
└─────────────────┘
          │
          │ 6. Transfer debt token từ liquidator
          ▼
┌─────────────────┐
│   Debt Token    │
│   Contract      │
└─────────────────┘
          │
          │ 7. Tính toán collateral cần thanh lý
          ▼
┌─────────────────┐
│ Collateral Calc │
│ seizeAmount =   │
│ repayUSD *      │
│ (1 + bonusBps)  │
└─────────────────┘
          │
          │ 8. Transfer collateral cho liquidator
          ▼
┌─────────────────┐
│ Collateral Token│
│   Contract      │
└─────────────────┘
          │
          │ 9. Cập nhật positions
          ▼
┌─────────────────┐
│  UserReserveData│
│  - debt giảm
│  - collateral giảm
└─────────────────┘
```

## 5. Luồng Collateral Management

```
┌─────────────────┐
│   User Wallet   │
└─────────┬───────┘
          │
          │ 1. Call setUserUseReserveAsCollateral(asset, useAsCollateral)
          ▼
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 2. _accrue(asset)
          ▼
┌─────────────────┐    ┌─────────────────┐
│InterestRateModel│◄───┤   LendingPool   │
│   .getRates()   │    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. Kiểm tra user có supply > 0
                                ▼
┌─────────────────┐
│ Supply Check    │
│ user.supply > 0 │
└─────────────────┘
          │
          │ 4. Nếu disable collateral
          ▼
┌─────────────────┐    ┌─────────────────┐
│  PriceOracle    │◄───┤   LendingPool   │
│.getAssetPrice1e18│    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 5. Kiểm tra Health Factor sau khi disable
                                ▼
┌─────────────────┐
│ Health Factor   │
│ Check: HF >= 1  │
│ sau khi disable │
└─────────────────┘
          │
          │ 6. Cập nhật useAsCollateral
          ▼
┌─────────────────┐
│  UserReserveData│
│  - useAsCollateral
└─────────────────┘
```

## 6. Luồng Interest Rate Calculation

```
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 1. _accrue(asset) được gọi
          ▼
┌─────────────────┐
│  Reserve Data   │
│  - cash
│  - debtNow
│  - parameters
└─────────────────┘
          │
          │ 2. Gọi InterestRateModel.getRates()
          ▼
┌─────────────────┐
│InterestRateModel│
└─────────┬───────┘
          │
          │ 3. Tính Utilization Rate
          ▼
┌─────────────────┐
│ Utilization     │
│ U = debt /      │
│ (cash + debt)   │
└─────────────────┘
          │
          │ 4. Áp dụng 2-slope formula
          ▼
┌─────────────────┐
│ 2-Slope Formula │
│ if U <= U*:     │
│   rb = base +   │
│   s1*(U/U*)     │
│ else:           │
│   rb = base +   │
│   s1 + s2*      │
│   ((U-U*)/(1-U*))
└─────────────────┘
          │
          │ 5. Tính Supply Rate
          ▼
┌─────────────────┐
│ Supply Rate     │
│ rs = rb * U *   │
│ (1 - reserveFactor)
└─────────────────┘
          │
          │ 6. Cập nhật rates và index
          ▼
┌─────────────────┐
│  Reserve Data   │
│  - liquidityRate
│  - borrowRate
│  - liquidityIndex
│  - borrowIndex
└─────────────────┘
```

## 7. Luồng Health Factor Calculation

```
┌─────────────────┐
│   LendingPool   │
└─────────┬───────┘
          │
          │ 1. _getAccountData(user)
          ▼
┌─────────────────┐
│  All Assets     │
│  Loop through   │
└─────────┬───────┘
          │
          │ 2. Cho mỗi asset
          ▼
┌─────────────────┐    ┌─────────────────┐
│  PriceOracle    │◄───┤   LendingPool   │
│.getAssetPrice1e18│    │                 │
└─────────────────┘    └─────────┬───────┘
                                │
                                │ 3. Tính Collateral Value
                                ▼
┌─────────────────┐
│ Collateral Value│
│ = supply * price│
│ * ltvBps / 10000│
└─────────────────┘
          │
          │ 4. Tính Debt Value
          ▼
┌─────────────────┐
│   Debt Value    │
│ = debt * price  │
└─────────────────┘
          │
          │ 5. Tổng hợp
          ▼
┌─────────────────┐
│ Total Values    │
│ - totalCollateral
│ - totalDebt
└─────────────────┘
          │
          │ 6. Tính Health Factor
          ▼
┌─────────────────┐
│ Health Factor   │
│ HF = collateral │
│ / debt          │
└─────────────────┘
```

## 8. Luồng Oracle Price Update

```
┌─────────────────┐
│   Admin/Owner   │
└─────────┬───────┘
          │
          │ 1. Cập nhật giá
          ▼
┌─────────────────┐
│  PriceOracle    │
│ .setAssetPrice()│
└─────────────────┘
          │
          │ HOẶC
          ▼
┌─────────────────┐
│ChainlinkOracle  │
│.setPriceFeed()  │
└─────────────────┘
          │
          │ 2. Chainlink tự động cập nhật
          ▼
┌─────────────────┐
│MockV3Aggregator │
│.updateAnswer()  │
└─────────────────┘
          │
          │ 3. LendingPool sử dụng giá
          ▼
┌─────────────────┐
│   LendingPool   │
│ .getAssetPrice1e18│
└─────────────────┘
```

## Tóm tắt các điểm quan trọng:

1. **Tất cả các giao dịch đều bắt đầu với `_accrue()`** để cập nhật lãi suất
2. **Health Factor** được kiểm tra trước khi cho vay và thanh lý
3. **Oracle** cung cấp giá cho tất cả tính toán tài chính
4. **Interest Rate Model** tính toán lãi suất động dựa trên utilization
5. **Dust Protection** xử lý các khoản nợ nhỏ
6. **Liquidation** chỉ xảy ra khi Health Factor < 1
7. **Collateral Management** cho phép bật/tắt tài sản thế chấp








