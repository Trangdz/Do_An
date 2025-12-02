# Use Case: Thanh Lý Vị Thế (Liquidation)

## Thông Tin Cơ Bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên use case** | Thanh lý vị thế (Liquidation) |
| **Tác nhân** | Người thanh lý (Liquidator) |
| **Mô tả ngắn gọn** | Liquidator thanh toán thay cho borrower có Health Factor < 1, nhận lại phần tài sản thế chấp tương ứng kèm thưởng (bonus) để duy trì an toàn hệ thống. |

---

## Điều Kiện Tiên Quyết

1. ✅ **Liquidator đã kết nối ví** và có ETH trả phí gas
2. ✅ **Có đủ số dư token** của tài sản nợ (debtAsset)
3. ✅ **Borrower có nợ** và **Health Factor < 1**
4. ✅ **Thị trường/tài sản đang hoạt động**, không bị pause

---

## Luồng Cơ Bản

### Bước 1: Mở trang Liquidation
- Liquidator mở trang Liquidation trên ứng dụng

### Bước 2: Lấy danh sách vị thế rủi ro
- Ứng dụng truy vấn blockchain/backend để lấy danh sách borrower có HF < 1
- Hiển thị danh sách sắp xếp theo HF thấp nhất

### Bước 3: Chọn và cấu hình
- Liquidator chọn:
  - **Borrower** (người vay cần thanh lý)
  - **Debt Asset** (token mà borrower đang nợ)
  - **Collateral Asset** (token mà borrower đang thế chấp)
  - **Số tiền** muốn trả (tối đa = close factor × debt)

### Bước 4: Ước tính phần thưởng
- Ứng dụng ước tính số collateral sẽ nhận được
- Tính toán dựa trên:
  - Giá token từ Oracle
  - Bonus thanh lý (thường 5%)
  - Công thức: `seize = repay × (1 + bonus%)`

### Bước 5: Kiểm tra và Approve
- Kiểm tra Allowance (quyền rút token)
- Nếu thiếu → hiển thị nút "Approve"
- Liquidator gửi giao dịch Approve nếu cần

### Bước 6: Gửi giao dịch thanh lý
- Gửi giao dịch `liquidationCall(debtAsset, collateralAsset, user, repayAmount)` đến hợp đồng LendingPool

### Bước 7: Smart Contract xử lý
- Kiểm tra điều kiện an toàn:
  - HF < 1
  - Có debt
  - Đủ collateral
  - Pool có thanh khoản
- Cập nhật dữ liệu:
  - **Giảm nợ** của borrower
  - **Giảm collateral** tương ứng (nhiều hơn debt do bonus)
  - **Chuyển collateral** (có bonus) cho liquidator
- Phát sự kiện `Liquidated(liquidator, user, debtAsset, collateralAsset, repay, seize)`

### Bước 8: Backend lưu trữ
- Backend/Indexer ghi lại giao dịch
- Cập nhật dữ liệu MongoDB:
  - Transactions
  - User positions

### Bước 9: Hiển thị kết quả
- Ứng dụng hiển thị "Thanh lý thành công"
- Cập nhật danh sách vị thế
- Hiển thị transaction hash

---

## Luồng Thay Thế (Lỗi)

### A1. Health Factor ≥ 1
- **Điều kiện:** HF của borrower đã ≥ 1
- **Hành động:** Hợp đồng Revert với message "HF >= 1"
- **Kết quả:** Không cho thanh lý, hiển thị lỗi

### A2. Không đủ collateral
- **Điều kiện:** Borrower không có đủ collateral để seize
- **Hành động:** Revert với message "insufficient collateral"
- **Kết quả:** Giao dịch thất bại, hiển thị lỗi

### A3. Pool thiếu thanh khoản
- **Điều kiện:** Pool không có đủ collateral cash
- **Hành động:** Revert với message "pool coll cash low"
- **Kết quả:** Giao dịch thất bại, yêu cầu thử lại sau

### A4. Lỗi giá Oracle hoặc Token FoT
- **Điều kiện:** Oracle trả về giá sai hoặc token có fee-on-transfer
- **Hành động:** Revert, hiển thị thông báo lỗi
- **Kết quả:** Giao dịch thất bại

---

## Hậu Điều Kiện

Sau khi thanh lý thành công:

1. ✅ **Liquidator:**
   - Đã trả token debtAsset
   - Nhận được collateralAsset (có bonus)
   - Có lợi nhuận từ bonus

2. ✅ **Borrower:**
   - Nợ giảm trên blockchain
   - Collateral giảm (nhiều hơn debt do bonus)
   - Health Factor có thể tăng hoặc vẫn < 1 (tùy số tiền thanh lý)

3. ✅ **Hệ thống:**
   - Dữ liệu MongoDB được cập nhật
   - Vị thế an toàn hơn (debt giảm)
   - Lịch sử giao dịch được ghi lại

4. ✅ **Ứng dụng:**
   - Hiển thị lịch sử thanh lý
   - Cập nhật danh sách vị thế
   - Refresh dữ liệu real-time

---

## Ví Dụ Cụ Thể

**Tình huống:**
- Borrower: Thế chấp 20,000 USDC, vay 1,500 LINK @ $10
- HF ban đầu = 1.0 (an toàn)
- LINK tăng lên $15 → HF = 0.67 (< 1) → Rủi ro

**Liquidator thanh lý:**
- Trả: 11,000 USDC
- Nhận: 770 LINK (≈ $11,550) với bonus 5%
- Lời: 550 USD

**Kết quả:**
- Borrower: Debt giảm 11,000, Collateral giảm 11,550
- HF mới = 0.30 (vẫn có thể thanh lý tiếp)







