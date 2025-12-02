# Quy Trình Thanh Lý (Liquidation Flow)

## Tổng Quan

Thanh lý là cơ chế bảo vệ hệ thống khi một borrower có Health Factor (HF) < 1, tức là giá trị tài sản thế chấp không đủ để đảm bảo khoản vay. Liquidator (người thanh lý) sẽ trả nợ thay cho borrower và nhận lại tài sản thế chấp kèm bonus.

## Các Bước Chi Tiết

### 1. Phát Hiện Vị Thế Rủi Ro (Frontend)
- Hệ thống quét tất cả users có debt > 0
- Tính toán Health Factor cho mỗi user: `HF = (Collateral × LTV) / Debt`
- Hiển thị danh sách users có HF < 1 trong trang Liquidation

### 2. Liquidator Chọn Vị Thế (Frontend)
- Liquidator xem danh sách vị thế rủi ro
- Chọn một borrower có HF < 1
- Nhấn nút "Thanh lý" để mở modal

### 3. Modal Thanh Lý (Frontend)
- **Load thông tin borrower:**
  - Danh sách debt assets (tokens borrower đang nợ)
  - Danh sách collateral assets (tokens borrower đang thế chấp)
  - Close factor (giới hạn % debt có thể thanh lý/lần, thường 50%)
  - Liquidation bonus (phần thưởng cho liquidator, thường 5%)

- **Liquidator chọn:**
  - Debt Asset: Token mà borrower đang nợ (ví dụ: LINK)
  - Collateral Asset: Token mà borrower đang thế chấp (ví dụ: USDC)
  - Repay Amount: Số tiền muốn trả giúp (tối đa = close factor × debt)

### 4. Tính Toán Ước Tính (Frontend)
- Tính `repayUSD = repayAmount × priceDebt`
- Tính `seizeUSD = repayUSD × (1 + bonusBps/10000)`
- Tính `seizeTokens = seizeUSD / priceColl`
- Hiển thị ước tính số collateral sẽ nhận được

### 5. Validation (Frontend)
- Kiểm tra borrower vẫn có HF < 1
- Kiểm tra liquidator có đủ balance của debt asset
- Kiểm tra liquidator đã approve LendingPool chưa
- Kiểm tra borrower có đủ collateral để seize

### 6. Approve (Nếu Cần) - Frontend
- Nếu allowance < repayAmount, hiển thị nút "Approve"
- Liquidator nhấn "Approve" → gửi `ERC20.approve(LendingPool, MaxUint256)`
- Sau khi approve thành công, có thể tiếp tục

### 7. Gửi Giao Dịch (Frontend → Contract)
- Liquidator nhấn "Xác nhận"
- Frontend gọi `liquidationCall(debtAsset, collateralAsset, borrower, repayAmount)`

### 8. Contract Validation (On-Chain)
- **Accrue interest:** Cập nhật lãi cho cả debt và collateral assets
- **Kiểm tra HF < 1:** `require(hf < 1e18, "HF>=1")`
- **Kiểm tra có debt:** `require(debtNow > 0, "no debt")`
- **Áp dụng close factor:** `maxRepay = (closeFactorBps × debtNow) / 10000`
- **Clamp repay amount:** `repay = min(repayRequested, maxRepay)`

### 9. Transfer Debt Asset (On-Chain)
- Liquidator chuyển `repayAmount` debt asset vào LendingPool
- Contract kiểm tra số tiền thực nhận (FoT-aware)

### 10. Tính Toán Seize (On-Chain)
- Lấy giá từ Oracle: `priceDebt`, `priceColl`
- Tính `repayUSD = repayAmount × priceDebt`
- Tính `seizeUSD = repayUSD × (1 + bonusBps/10000)`
- Tính `seizeTokens = seizeUSD / priceColl`

### 11. Kiểm Tra Collateral (On-Chain)
- Kiểm tra borrower có đủ collateral: `require(userCollNow >= seizeColl, "insufficient collateral")`
- Kiểm tra pool có đủ collateral cash: `require(poolCash >= seizeColl, "pool coll cash low")`

### 12. Cập Nhật Vị Thế Borrower (On-Chain)
- Giảm debt: `debtNew = debtNow - repayAmount`
- Giảm collateral: `collNew = collNow - seizeTokens`
- Cập nhật `userReserves[borrower][debtAsset]` và `userReserves[borrower][collateralAsset]`

### 13. Cập Nhật Reserve (On-Chain)
- Tăng `reserveCash` của debt asset (nhận tiền từ liquidator)
- Giảm `totalDebtPrincipal` của debt asset
- Giảm `reserveCash` của collateral asset (trả cho liquidator)

### 14. Transfer Collateral (On-Chain)
- LendingPool chuyển `seizeTokens` collateral asset cho liquidator
- Emit event `Liquidated(liquidator, borrower, debtAsset, collateralAsset, repayAmount, seizeTokens)`

### 15. Kết Quả
- Borrower: Debt giảm, Collateral giảm (nhiều hơn debt do bonus)
- Liquidator: Mất debt asset, nhận collateral asset (với bonus)
- Pool: An toàn hơn (debt giảm)

## Công Thức Quan Trọng

```
Health Factor (HF) = (Collateral USD × LTV) / Debt USD

Max Repay = Debt × Close Factor (thường 50%)

Seize USD = Repay USD × (1 + Bonus BPS / 10000)
Seize Tokens = Seize USD / Price Collateral
```

## Ví Dụ Cụ Thể

**Tình huống:**
- Borrower thế chấp: 20,000 USDC (LTV 75% → Collateral = $15,000)
- Borrower vay: 1,500 LINK @ $10 = $15,000
- HF ban đầu = 1.0

**LINK tăng lên $15:**
- Debt mới = 1,500 × $15 = $22,500
- HF = $15,000 / $22,500 = 0.67 (< 1) → Có thể thanh lý

**Liquidator thanh lý 11,000 USDC (50% debt):**
- Repay: 11,000 USDC
- Seize USD = 11,000 × 1.05 = 11,550 USD (bonus 5%)
- Seize LINK = 11,550 / 15 = 770 LINK

**Sau thanh lý:**
- Borrower: Debt còn 11,500 USDC, Collateral còn ~3,450 USD
- Liquidator: Mất 11,000 USDC, nhận 770 LINK (≈ $11,550)
- HF mới = 3,450 / 11,500 = 0.30 (vẫn < 1, có thể thanh lý tiếp)







