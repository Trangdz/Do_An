# Mô Tả Quy Trình Thanh Lý (Liquidation Process)

## Tổng Quan

Quy trình thanh lý là cơ chế bảo vệ hệ thống khi một borrower (người vay) có Health Factor (HF) < 1, tức là giá trị tài sản thế chấp không đủ để đảm bảo khoản vay. Liquidator (người thanh lý) sẽ can thiệp để trả nợ thay cho borrower và nhận lại tài sản thế chấp kèm phần thưởng (bonus).

## Các Bước Chi Tiết

### Bước 1 & 2: Thiết Lập Vị Thế (Borrower → LendingPool)

**Bước 1: Deposit Collateral (Gửi Tài Sản Thế Chấp)**
- Borrower gửi tài sản thế chấp vào LendingPool (ví dụ: 20,000 USDC)
- Tài sản này được sử dụng làm đảm bảo cho khoản vay
- LendingPool lưu trữ và quản lý tài sản thế chấp

**Bước 2: Borrow Assets (Vay Tài Sản)**
- Borrower vay tài sản từ LendingPool (ví dụ: 1,500 LINK)
- Số tiền có thể vay phụ thuộc vào giá trị tài sản thế chấp và LTV (Loan-to-Value)
- LendingPool ghi nhận khoản nợ và tính toán Health Factor

**Kết quả ban đầu:**
- Collateral: 20,000 USDC (LTV 75% = 15,000 USD)
- Debt: 1,500 LINK @ $10 = 15,000 USD
- Health Factor = 15,000 / 15,000 = 1.0 (an toàn)

### Bước 3: Phát Hiện Vị Thế Rủi Ro (LendingPool → Liquidator)

**Tình huống:**
- Giá tài sản vay tăng (ví dụ: LINK từ $10 lên $15)
- Debt mới = 1,500 × $15 = 22,500 USD
- Health Factor = 15,000 / 22,500 = 0.67 (< 1) → **RỦI RO**

**Hệ thống phát hiện:**
- LendingPool liên tục tính toán Health Factor cho tất cả borrowers
- Khi HF < 1, vị thế được đánh dấu là "liquidatable" (có thể thanh lý)
- Danh sách các vị thế rủi ro được hiển thị trong giao diện Liquidation
- Liquidator có thể xem và chọn vị thế để thanh lý

### Bước 4: Trả Nợ Thay (Liquidator → LendingPool)

**Liquidator thực hiện:**
- Liquidator chọn một borrower có HF < 1
- Chọn debt asset (token mà borrower đang nợ, ví dụ: LINK)
- Chọn collateral asset (token mà borrower đang thế chấp, ví dụ: USDC)
- Nhập số tiền muốn trả giúp (tối đa = close factor × debt, thường 50%)

**Ví dụ:**
- Liquidator trả 11,000 USDC thay cho borrower
- Số tiền này được chuyển vào LendingPool
- LendingPool nhận và xử lý khoản thanh toán

**Điều kiện:**
- Liquidator phải có đủ số dư của debt asset
- Liquidator phải đã approve LendingPool được phép rút token
- Số tiền trả không được vượt quá close factor (50% debt)

### Bước 5: Tịch Thu Collateral + Bonus (LendingPool → Liquidator)

**Tính toán:**
- LendingPool tính toán số collateral cần tịch thu:
  - Repay USD = 11,000 USDC × $1 = 11,000 USD
  - Bonus = 5% → Seize USD = 11,000 × 1.05 = 11,550 USD
  - Seize Tokens = 11,550 / $15 = 770 LINK

**Chuyển giao:**
- LendingPool chuyển 770 LINK cho liquidator
- Liquidator nhận được tài sản thế chấp với bonus 5%
- Liquidator có lợi nhuận: 11,550 - 11,000 = 550 USD

**Lý do có bonus:**
- Khuyến khích liquidator tham gia thanh lý
- Bù đắp rủi ro và chi phí giao dịch
- Đảm bảo hệ thống luôn được bảo vệ

### Bước 6: Giảm Debt & Collateral (LendingPool → Borrower)

**Cập nhật vị thế borrower:**
- **Debt giảm:** 22,500 - 11,000 = 11,500 USD
- **Collateral giảm:** 15,000 - 11,550 = 3,450 USD
- **Health Factor mới:** 3,450 / 11,500 = 0.30

**Kết quả:**
- Borrower mất nhiều collateral hơn số nợ được trả (do bonus)
- Debt giảm nhưng HF có thể vẫn < 1 (có thể thanh lý tiếp)
- Vị thế của borrower được cập nhật trong LendingPool

**Lưu ý:**
- Nếu HF vẫn < 1, liquidator có thể thanh lý tiếp
- Borrower có thể tự repay phần nợ còn lại để phục hồi HF ≥ 1
- Borrower có thể thêm collateral để tăng HF

## Tóm Tắt

1. **Borrower** gửi collateral và vay assets từ **LendingPool**
2. Khi giá thay đổi làm HF < 1, **LendingPool** phát hiện và hiển thị cho **Liquidator**
3. **Liquidator** trả nợ thay cho borrower vào **LendingPool**
4. **LendingPool** tịch thu collateral + bonus và chuyển cho **Liquidator**
5. **LendingPool** giảm debt và collateral của **Borrower**

## Lợi Ích

- **Borrower:** Giảm được một phần nợ (mặc dù mất nhiều collateral)
- **Liquidator:** Nhận được lợi nhuận từ bonus
- **Hệ thống:** Được bảo vệ khỏi rủi ro vỡ nợ, duy trì tính thanh khoản







