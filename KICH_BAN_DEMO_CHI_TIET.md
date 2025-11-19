# 🎬 KỊCH BẢN DEMO CHI TIẾT - LENDHUB V2

## 📋 MỤC LỤC
1. [Kịch bản 1: Kết nối ví và khám phá giao diện](#kịch-bản-1)
2. [Kịch bản 2: Gửi tài sản (Supply) và kiểm tra lãi suất](#kịch-bản-2)
3. [Kịch bản 3: Vay tài sản (Borrow)](#kịch-bản-3)
4. [Kịch bản 4: Trả nợ (Repay)](#kịch-bản-4)
5. [Kịch bản 5: Rút tài sản (Withdraw)](#kịch-bản-5)
6. [Kịch bản 6: Thanh lý (Liquidation)](#kịch-bản-6)
7. [Kịch bản 7: Tạo Proposal Governance](#kịch-bản-7)
8. [Kịch bản 8: Vote trên Proposal](#kịch-bản-8)
9. [Kịch bản 9: Demo đầy đủ chuỗi giao dịch](#kịch-bản-9)

---

## 🎯 KỊCH BẢN 1: KẾT NỐI VÍ VÀ KHÁM PHÁ GIAO DIỆN {#kịch-bản-1}

### Mục tiêu
- Kết nối ví MetaMask với dApp
- Khám phá giao diện Dashboard
- Kiểm tra số dư tài sản

### Điều kiện tiên quyết
- ✅ Ganache đang chạy (port 7545)
- ✅ Frontend đang chạy (http://localhost:3000)
- ✅ MetaMask đã import ít nhất 1 tài khoản từ Ganache
- ✅ Tài khoản đã có token (WETH, DAI, USDC, LINK)

### Các bước thực hiện

#### Bước 1: Mở dApp
1. Mở trình duyệt, truy cập: `http://localhost:3000`
2. Kiểm tra trang chủ hiển thị đúng

#### Bước 2: Kết nối ví
1. Click nút **"Connect Wallet"** ở góc trên bên phải
2. MetaMask sẽ hiện popup yêu cầu kết nối
3. Chọn tài khoản (ví dụ: Account 0 - có 100K LENDX)
4. Click **"Connect"** hoặc **"Next"** → **"Connect"**
5. **Kết quả mong đợi:**
   - Nút "Connect Wallet" đổi thành địa chỉ ví (ví dụ: `0x1234...5678`)
   - Dashboard hiển thị số dư tài sản
   - Không có lỗi trong console

#### Bước 3: Kiểm tra Dashboard
1. Xem trang **Dashboard** (trang chủ)
2. Kiểm tra các thông tin:
   - **Your Supplies**: Số tài sản đã gửi (ban đầu = 0)
   - **Your Borrows**: Số nợ hiện tại (ban đầu = 0)
   - **Health Factor**: Chỉ số sức khỏe (ban đầu = ∞ hoặc không hiển thị)
   - **Total Collateral**: Tổng giá trị tài sản thế chấp (ban đầu = $0)
   - **Total Debt**: Tổng nợ (ban đầu = $0)

#### Bước 4: Kiểm tra Markets
1. Click tab **"Markets"** hoặc điều hướng đến `/markets`
2. Kiểm tra danh sách tài sản:
   - **WETH**: Collateral only (không thể vay)
   - **DAI**: Có thể vay
   - **USDC**: Có thể vay
   - **LINK**: Có thể vay
3. Kiểm tra thông tin mỗi tài sản:
   - **Supply APY**: Lãi suất gửi (ví dụ: 0.1% - 1%)
   - **Borrow APR**: Lãi suất vay (ví dụ: 0.2% - 2%)
   - **Total Liquidity**: Tổng thanh khoản
   - **Available**: Số lượng có thể vay
   - **Price**: Giá từ Chainlink Oracle

#### Bước 5: Kiểm tra Wallet Balance
1. Quay lại Dashboard
2. Kiểm tra **Wallet Balance**:
   - WETH: ~10,000 (nếu dùng Account 0)
   - DAI: ~1,000,000
   - USDC: ~1,000,000
   - LINK: ~100,000
   - LENDX: ~100,000 (nếu Account 0)

### Kết quả mong đợi
- ✅ Ví kết nối thành công
- ✅ Dashboard hiển thị đúng số dư
- ✅ Markets hiển thị đầy đủ thông tin
- ✅ Không có lỗi trong console

### Dữ liệu kiểm tra
- Địa chỉ ví hiển thị đúng
- Số dư token khớp với Ganache
- Giá tài sản từ Oracle hiển thị (nếu Chainlink đã chạy)

---

## 🎯 KỊCH BẢN 2: GỬI TÀI SẢN (SUPPLY) VÀ KIỂM TRA LÃI SUẤT {#kịch-bản-2}

### Mục tiêu
- Gửi tài sản vào pool để kiếm lãi
- Kiểm tra số dư aToken tăng theo thời gian thực
- Xác minh lãi suất được tính đúng

### Điều kiện tiên quyết
- ✅ Đã kết nối ví (Kịch bản 1)
- ✅ Có ít nhất 1,000 DAI trong ví
- ✅ Có đủ ETH để trả gas

### Các bước thực hiện

#### Bước 1: Mở trang Deposit
1. Click tab **"Deposit"** hoặc điều hướng đến `/deposit`
2. Chọn tài sản muốn gửi (ví dụ: **DAI**)
3. Click nút **"Deposit"** hoặc click vào card DAI

#### Bước 2: Nhập số lượng
1. Trang chi tiết DAI mở ra (`/deposit/DAI`)
2. Tìm form **"Deposit Overview"** (bên phải)
3. Nhập số lượng: **1000 DAI**
4. Kiểm tra thông tin hiển thị:
   - **Wallet balance**: ~1,000,000 DAI
   - **Amount to deposit**: 1000 DAI
   - **Balance after deposit**: ~999,000 DAI
   - **USD estimate**: ~$1,000 (nếu giá DAI = $1)

#### Bước 3: Thực hiện giao dịch
1. Click nút **"Deposit"** (màu xanh, ở cuối form)
2. MetaMask hiện popup:
   - **Transaction 1**: Approve DAI (nếu chưa approve)
     - Click **"Confirm"** hoặc **"Approve"**
   - **Transaction 2**: Supply DAI
     - Kiểm tra:
       - **To**: LendingPool address
       - **Amount**: 1000 DAI
       - **Gas**: ~80,000 - 120,000
     - Click **"Confirm"**
3. Đợi transaction được confirm (thường < 5 giây trên Ganache)

#### Bước 4: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast notification hiện: **"Deposit Successful!"**
   - Dashboard tự động refresh
2. Kiểm tra **"Your Supplies"**:
   - DAI: **~1000 DAI** (số dư ban đầu)
   - Số dư sẽ tăng dần theo thời gian (real-time interest)
3. Kiểm tra **"Interest Earned"**:
   - Ban đầu: **0 DAI**
   - Sau 10 giây: **~0.000003 DAI** (tùy APY)
   - Số dư tăng mỗi giây (real-time calculation)

#### Bước 5: Kiểm tra Real-time Interest
1. Mở trang chi tiết DAI (`/deposit/DAI`)
2. Xem phần **"Your Balances"**:
   - **Your balance in pool**: Tăng dần mỗi giây
   - **Interest earned**: Tăng theo thời gian
3. Mở Console (F12) để xem log:
   - `💰 Realtime update:` hiển thị mỗi giây
   - Balance tăng với rate: `ratePerSecond`, `expectedAPR`

#### Bước 6: Kiểm tra Reserve Overview
1. Xem phần **"DAI Reserve Overview"**:
   - **Utilization rate**: Tăng (vì có người gửi)
   - **Available liquidity**: Giảm (vì đã gửi vào)
   - **Deposit APY**: Hiển thị (ví dụ: 0.1% - 1%)
   - **Maximum LTV**: 75%
   - **Liquidation threshold**: 80%

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Số dư aToken tăng đúng
- ✅ Interest earned tăng real-time
- ✅ Dashboard cập nhật đúng
- ✅ MongoDB indexer ghi nhận giao dịch

### Dữ liệu kiểm tra
- **Before**: Wallet = 1,000,000 DAI, Supply = 0 DAI
- **After**: Wallet = 999,000 DAI, Supply = ~1000 DAI (tăng dần)
- **Interest**: Tăng ~0.000003 DAI/giây (nếu APY = 0.1%)

---

## 🎯 KỊCH BẢN 3: VAY TÀI SẢN (BORROW) {#kịch-bản-3}

### Mục tiêu
- Vay tài sản dựa trên tài sản thế chấp
- Kiểm tra Health Factor giảm
- Xác minh nợ tăng theo thời gian (interest accrual)

### Điều kiện tiên quyết
- ✅ Đã gửi ít nhất 1,000 DAI (Kịch bản 2)
- ✅ Tài sản thế chấp (DAI) đã được enable làm collateral (tự động)

### Các bước thực hiện

#### Bước 1: Mở trang Borrow
1. Click tab **"Borrow"** hoặc điều hướng đến `/borrow`
2. Chọn tài sản muốn vay (ví dụ: **USDC**)
3. Click nút **"Borrow"** hoặc click vào card USDC

#### Bước 2: Kiểm tra Borrowing Power
1. Trang chi tiết USDC mở ra (`/borrow/USDC`)
2. Xem phần **"Borrowing Power"**:
   - **Collateral**: ~$1,000 (1000 DAI × $1)
   - **Maximum LTV**: 75%
   - **Borrowing Power**: ~$750 (75% × $1,000)
   - **Current Debt**: $0
   - **Available to Borrow**: ~$750

#### Bước 3: Nhập số lượng vay
1. Tìm form **"Borrow Overview"** (bên phải)
2. Nhập số lượng: **500 USDC** (≈ $500, trong giới hạn $750)
3. Kiểm tra thông tin:
   - **Amount to borrow**: 500 USDC
   - **USD estimate**: ~$500
   - **Health Factor after borrow**: ~2.0 (an toàn)
   - **Borrow APR**: Hiển thị (ví dụ: 0.2% - 2%)

#### Bước 4: Thực hiện giao dịch
1. Click nút **"Borrow"** (màu đỏ)
2. MetaMask hiện popup:
   - **To**: LendingPool address
   - **Amount**: 500 USDC
   - **Gas**: ~120,000 - 200,000
   - Click **"Confirm"**
3. Đợi transaction confirm

#### Bước 5: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast: **"Borrow Successful!"**
   - Dashboard refresh
2. Kiểm tra **"Your Borrows"**:
   - USDC: **~500 USDC** (số nợ ban đầu)
   - Nợ sẽ tăng dần theo thời gian (interest accrual)
3. Kiểm tra **"Health Factor"**:
   - Trước: ∞ hoặc không hiển thị
   - Sau: **~2.0** (an toàn, > 1.0)
4. Kiểm tra **"Total Debt"**:
   - Tăng từ $0 → ~$500

#### Bước 6: Kiểm tra Real-time Debt Accrual
1. Mở trang chi tiết USDC (`/borrow/USDC`)
2. Xem phần **"Your Balances"**:
   - **Your debt in pool**: Tăng dần mỗi giây
   - **Interest accrued**: Tăng theo thời gian
3. Mở Console để xem log:
   - `💰 Borrow realtime update:` hiển thị mỗi giây
   - Debt tăng với rate: `variableBorrowRateRayPerSec`

#### Bước 7: Kiểm tra giới hạn vay
1. Thử vay thêm: **300 USDC** (tổng = 800 USDC, vượt $750)
2. **Kết quả mong đợi:**
   - Transaction sẽ revert với lỗi: **"Health factor too low"** hoặc **"Insufficient borrowing power"**
   - Hoặc frontend sẽ hiển thị cảnh báo trước khi gửi

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Nợ tăng đúng
- ✅ Health Factor giảm nhưng vẫn > 1.0
- ✅ Interest accrued tăng real-time
- ✅ Không thể vay quá giới hạn

### Dữ liệu kiểm tra
- **Before**: Debt = 0, Health Factor = ∞
- **After**: Debt = ~500 USDC (tăng dần), Health Factor = ~2.0
- **Interest**: Tăng ~0.00001 USDC/giây (nếu APR = 0.2%)

---

## 🎯 KỊCH BẢN 4: TRẢ NỢ (REPAY) {#kịch-bản-4}

### Mục tiêu
- Trả một phần hoặc toàn bộ nợ
- Kiểm tra Health Factor tăng sau khi trả
- Xác minh nợ giảm đúng

### Điều kiện tiên quyết
- ✅ Đã vay ít nhất 500 USDC (Kịch bản 3)
- ✅ Có đủ USDC trong ví để trả (ít nhất 500 USDC)

### Các bước thực hiện

#### Bước 1: Mở trang Repay
1. Click tab **"Borrow"** → chọn **USDC** (đã có nợ)
2. Hoặc điều hướng đến `/borrow/USDC`
3. Xem phần **"Repay Overview"** (bên phải)

#### Bước 2: Kiểm tra thông tin nợ
1. Xem phần **"Your Balances"**:
   - **Your debt in pool**: ~500.001 USDC (đã tăng do interest)
   - **Interest accrued**: ~0.001 USDC
   - **Your wallet balance**: ~1,000,000 USDC (đủ để trả)

#### Bước 3: Nhập số lượng trả
1. Trong form **"Repay Overview"**:
   - Nhập: **250 USDC** (trả một nửa)
   - Hoặc click **"MAX"** để trả toàn bộ
2. Kiểm tra thông tin:
   - **Amount to repay**: 250 USDC
   - **Remaining debt**: ~250.001 USDC (sau khi trả)
   - **Remaining debt (USD)**: ~$250

#### Bước 4: Thực hiện giao dịch
1. Click nút **"Repay"** (màu xanh)
2. MetaMask hiện popup:
   - **Transaction 1**: Approve USDC (nếu chưa approve)
     - Click **"Confirm"**
   - **Transaction 2**: Repay USDC
     - **To**: LendingPool address
     - **Amount**: 250 USDC
     - **Gas**: ~80,000 - 120,000
     - Click **"Confirm"**
3. Đợi transaction confirm

#### Bước 5: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast: **"Repay Successful!"**
   - Dashboard refresh
2. Kiểm tra **"Your Borrows"**:
   - USDC: Giảm từ ~500.001 → ~250.001 USDC
3. Kiểm tra **"Health Factor"**:
   - Tăng từ ~2.0 → ~4.0 (an toàn hơn)
4. Kiểm tra **"Total Debt"**:
   - Giảm từ ~$500 → ~$250

#### Bước 6: Trả toàn bộ nợ
1. Nhập số lượng: Click **"MAX"** hoặc nhập số lớn hơn nợ
2. Click **"Repay"**
3. **Kết quả mong đợi:**
   - Transaction thành công
   - **Your Borrows**: USDC = 0
   - **Health Factor**: ∞ hoặc không hiển thị
   - **Total Debt**: $0

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Nợ giảm đúng
- ✅ Health Factor tăng
- ✅ Có thể trả một phần hoặc toàn bộ

### Dữ liệu kiểm tra
- **Before**: Debt = ~500.001 USDC, Health Factor = ~2.0
- **After (một nửa)**: Debt = ~250.001 USDC, Health Factor = ~4.0
- **After (toàn bộ)**: Debt = 0, Health Factor = ∞

---

## 🎯 KỊCH BẢN 5: RÚT TÀI SẢN (WITHDRAW) {#kịch-bản-5}

### Mục tiêu
- Rút tài sản đã gửi (sau khi không còn nợ)
- Kiểm tra số dư aToken giảm
- Xác minh tài sản về ví đúng

### Điều kiện tiên quyết
- ✅ Đã gửi ít nhất 1,000 DAI (Kịch bản 2)
- ✅ Không còn nợ (đã trả hết - Kịch bản 4)
- ✅ Hoặc nợ còn lại nhưng Health Factor vẫn > 1.0 sau khi rút

### Các bước thực hiện

#### Bước 1: Mở trang Withdraw
1. Click tab **"Deposit"** → chọn **DAI** (đã có supply)
2. Hoặc điều hướng đến `/deposit/DAI`
3. Xem phần **"Withdraw Overview"** (bên phải)

#### Bước 2: Kiểm tra thông tin
1. Xem phần **"Your Balances"**:
   - **Your balance in pool**: ~1000.003 DAI (đã tăng do interest)
   - **Interest earned**: ~0.003 DAI
   - **Your wallet balance**: ~999,000 DAI
   - **Available liquidity**: Kiểm tra pool có đủ thanh khoản

#### Bước 3: Nhập số lượng rút
1. Trong form **"Withdraw Overview"**:
   - Nhập: **500 DAI** (rút một nửa)
   - Hoặc click **"MAX"** để rút tối đa
2. Kiểm tra thông tin:
   - **Amount to withdraw**: 500 DAI
   - **Wallet balance**: ~999,000 DAI
   - **Balance after withdraw**: ~999,500 DAI

#### Bước 4: Thực hiện giao dịch
1. Click nút **"Withdraw"** (màu xanh)
2. MetaMask hiện popup:
   - **To**: LendingPool address
   - **Amount**: 500 DAI
   - **Gas**: ~80,000 - 120,000
   - Click **"Confirm"**
3. Đợi transaction confirm

#### Bước 5: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast: **"Withdraw Successful!"**
   - Dashboard refresh
2. Kiểm tra **"Your Supplies"**:
   - DAI: Giảm từ ~1000.003 → ~500.003 DAI
3. Kiểm tra **"Wallet Balance"**:
   - Tăng từ ~999,000 → ~999,500 DAI
4. Kiểm tra **"Health Factor"**:
   - Vẫn > 1.0 (nếu còn nợ) hoặc ∞ (nếu không còn nợ)

#### Bước 6: Rút toàn bộ (nếu không còn nợ)
1. Nhập số lượng: Click **"MAX"**
2. Click **"Withdraw"**
3. **Kết quả mong đợi:**
   - Transaction thành công
   - **Your Supplies**: DAI = 0
   - **Wallet Balance**: Tăng đúng số lượng

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Số dư aToken giảm đúng
- ✅ Tài sản về ví đúng
- ✅ Không thể rút nếu Health Factor < 1.0

### Dữ liệu kiểm tra
- **Before**: Supply = ~1000.003 DAI, Wallet = ~999,000 DAI
- **After (một nửa)**: Supply = ~500.003 DAI, Wallet = ~999,500 DAI
- **After (toàn bộ)**: Supply = 0, Wallet = ~1,000,003 DAI

---

## 🎯 KỊCH BẢN 6: THANH LÝ (LIQUIDATION) {#kịch-bản-6}

### Mục tiêu
- Tạo tình huống Health Factor < 1.0
- Thực hiện thanh lý từ tài khoản khác
- Kiểm tra liquidator nhận được collateral + bonus

### Điều kiện tiên quyết
- ✅ Có 2 tài khoản:
   - **Account A**: Đã gửi collateral và vay (sẽ bị thanh lý)
   - **Account B**: Có đủ token để trả nợ cho Account A (liquidator)
- ✅ Account A có Health Factor < 1.0 (hoặc sẽ tạo tình huống này)

### Các bước thực hiện

#### Bước 1: Tạo tình huống Health Factor < 1.0
**Với Account A:**
1. Kết nối Account A (ví dụ: Account 0)
2. Gửi **2,000 DAI** vào pool (tăng lên để dễ tính toán)
3. **Tính toán số lượng vay:**
   - Collateral: $2,000
   - LTV: 75%
   - **Borrowing Power**: $2,000 × 75% = **$1,500**
4. Vay **1,450 USDC** (gần giới hạn, để lại buffer nhỏ)
5. **Kiểm tra Health Factor:**
   - Dashboard → Health Factor: **~1.03 - 1.05** (rất gần nguy hiểm)
6. **Vay thêm để HF < 1.0:**
   - Vay thêm **100 USDC** (tổng = 1,550 USDC, vượt $1,500)
   - **Lưu ý**: Nếu frontend không cho phép, có thể cần dùng script (xem `HUONG_DAN_LIQUIDATION.md`)
   - **Kết quả**: Health Factor < 1.0 (ví dụ: 0.97)

#### Bước 2: Kiểm tra Health Factor
1. Xem Dashboard của Account A:
   - **Health Factor**: < 1.0 (ví dụ: 0.95)
   - **Total Collateral**: ~$1,000
   - **Total Debt**: ~$800
   - **Status**: ⚠️ **"At Risk"** hoặc **"Liquidation Available"**

#### Bước 3: Mở trang Liquidation (với Account B)
1. Chuyển sang **Account B** (ví dụ: Account 1)
2. Kết nối Account B trong MetaMask
3. Điều hướng đến trang **"Liquidation"** hoặc `/liquidations`
4. **Kiểm tra:**
   - Nếu không thấy Account A, có thể do:
     - User vay quá lâu (> 5000 blocks) - Xem `HUONG_DAN_LIQUIDATION.md` để tăng số block
     - Health Factor đã tăng > 1.0 - Cần tạo tình huống mới
5. **Kết quả mong đợi:**
   - Danh sách các tài khoản có Health Factor < 1.0
   - Hiển thị Account A với:
     - **User Address**: 0x... (6 ký tự đầu + 4 ký tự cuối)
     - **Health Factor**: 0.97 (màu đỏ)
     - **Collateral**: ~2,000 DAI
     - **Debt**: ~1,550 USDC
     - **Status**: 🔴 **Có thể thanh lý**
     - **Nút "Thanh lý"** hiển thị

#### Bước 4: Chọn tài khoản để thanh lý
1. Click nút **"Thanh lý"** trên Account A trong danh sách
2. Modal hiện ra với:
   - **Borrower**: Địa chỉ Account A
   - **Debt Asset**: Chọn **USDC** (dropdown)
   - **Collateral Asset**: Chọn **DAI** (dropdown)
   - **Repay amount**: Nhập số lượng USDC muốn trả
3. **Tính toán:**
   - **Debt Amount**: ~1,550 USDC
   - **Max Liquidation**: ~775 USDC (50% close factor)
   - **Repay amount**: Nhập **500 USDC** (một phần nợ)
   - **Collateral to Seize**: ~525 DAI (500 USDC + 5% bonus)
   - **Bonus**: 25 DAI (5%)

#### Bước 5: Thực hiện thanh lý
1. **Nhập số lượng**: **500 USDC** trong ô "Repay amount"
2. **Kiểm tra ước tính** (tự động tính khi blur input):
   - **Amount to repay**: 500 USDC
   - **Collateral to receive**: ~525 DAI
   - **Bonus**: 25 DAI (5%)
3. Click nút **"Xác nhận"** trong modal
4. MetaMask hiện popup:
   - **Transaction 1**: Approve USDC (nếu chưa approve)
     - Click **"Confirm"**
   - **Transaction 2**: `liquidationCall(USDC, DAI, AccountA, 500 USDC)`
     - **To**: LendingPool address
     - **Amount**: 500 USDC
     - **Gas**: ~200,000 - 300,000
     - Click **"Confirm"**
5. Đợi transaction confirm (thường < 5 giây trên Ganache)

#### Bước 6: Kiểm tra kết quả
**Với Account B (Liquidator):**
1. Kiểm tra **Wallet Balance**:
   - USDC: Giảm 500 USDC
   - DAI: Tăng ~525 DAI (nhận được collateral + bonus)
2. Toast: **"Liquidation Successful!"**

**Với Account A (Bị thanh lý):**
1. Chuyển về Account A
2. Kiểm tra Dashboard:
   - **Health Factor**: Tăng từ 0.97 → ~1.3 (an toàn hơn)
   - **Total Debt**: Giảm từ ~$1,550 → ~$1,050
   - **Total Collateral**: Giảm từ ~$2,000 → ~$1,475
3. **Your Borrows**: USDC giảm từ 1,550 → 1,050 USDC
4. **Your Supplies**: DAI giảm từ 2,000 → ~1,475 DAI

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Liquidator nhận được collateral + bonus
- ✅ Health Factor của Account A tăng
- ✅ Nợ giảm đúng
- ✅ Collateral giảm đúng

### Dữ liệu kiểm tra
- **Before (Account A)**: HF = 0.97, Debt = 1,550 USDC, Collateral = 2,000 DAI
- **After (Account A)**: HF = ~1.3, Debt = 1,050 USDC, Collateral = ~1,475 DAI
- **After (Account B)**: Nhận ~525 DAI (500 USDC trả + 25 DAI bonus)

### ⚠️ Lưu ý quan trọng
- Nếu trang `/liquidations` không hiển thị Account A, xem file **`HUONG_DAN_LIQUIDATION.md`** để:
  - Tăng số block tìm kiếm
  - Sử dụng script để tạo tình huống
  - Debug và kiểm tra Health Factor

---

## 🎯 KỊCH BẢN 7: TẠO PROPOSAL GOVERNANCE {#kịch-bản-7}

### Mục tiêu
- Tạo proposal để thay đổi thông số protocol
- Kiểm tra proposal được lưu trên chain
- Xác minh proposal có thể được vote

### Điều kiện tiên quyết
- ✅ Có ít nhất 10,000 LENDX token (để tạo proposal)
- ✅ Đã kết nối ví (Account 0 có 100K LENDX - phù hợp)
- ✅ Governor contract đã được deploy

### Các bước thực hiện

#### Bước 1: Mở trang Create Proposal
1. Điều hướng đến `/governance/create`
2. Hoặc click **"Governance"** → **"Create Proposal"**

#### Bước 2: Điền thông tin Proposal
1. **Title**: "Increase DAI Reserve Factor to 15%"
2. **Description**: 
   ```
   This proposal aims to increase the reserve factor for DAI from 10% to 15%.
   This will increase the protocol's revenue while slightly reducing supply APY.
   ```
3. **Target Contract**: LendingPool
4. **Function**: `updateReserveFactor`
5. **Parameters**:
   - **Asset**: DAI address
   - **New Reserve Factor**: 1500 (15% = 1500 basis points)

#### Bước 3: Kiểm tra Proposal Preview
1. Xem **"Proposal Summary"**:
   - **Proposer**: Địa chỉ ví của bạn
   - **Voting Power**: ~100,000 LENDX (nếu Account 0)
   - **Target**: LendingPool address
   - **Function**: updateReserveFactor(DAI, 1500)
   - **Estimated Gas**: ~200,000 - 300,000

#### Bước 4: Thực hiện tạo Proposal
1. Click nút **"Create Proposal"**
2. MetaMask hiện popup:
   - **To**: Governor address
   - **Function**: propose(...)
   - **Gas**: ~200,000 - 300,000
   - Click **"Confirm"**
3. Đợi transaction confirm

#### Bước 5: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast: **"Proposal Created Successfully!"**
   - Hiển thị **Proposal ID**: #1 (hoặc số tiếp theo)
2. Tự động chuyển đến trang chi tiết proposal: `/governance/1`
3. Kiểm tra thông tin proposal:
   - **Proposal ID**: #1
   - **Title**: "Increase DAI Reserve Factor to 15%"
   - **Proposer**: Địa chỉ ví của bạn
   - **Status**: **"Active"** (đang trong thời gian vote)
   - **Voting Period**: 7 days (hoặc theo config)
   - **Votes For**: 0
   - **Votes Against**: 0
   - **Quorum**: 10,000 LENDX (hoặc theo config)

#### Bước 6: Kiểm tra Proposal trên Chain
1. Mở Console (F12)
2. Kiểm tra event:
   - `ProposalCreated` event được emit
   - Proposal ID, proposer, target, calldata được log

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Proposal được tạo với ID hợp lệ
- ✅ Trạng thái = "Active"
- ✅ Có thể vote ngay

### Dữ liệu kiểm tra
- **Proposal ID**: #1 (hoặc số tiếp theo)
- **Status**: Active
- **Voting Period**: 7 days
- **Quorum**: 10,000 LENDX

---

## 🎯 KỊCH BẢN 8: VOTE TRÊN PROPOSAL {#kịch-bản-8}

### Mục tiêu
- Vote "For" hoặc "Against" trên proposal
- Kiểm tra voting power được tính đúng
- Xác minh proposal state thay đổi sau khi vote

### Điều kiện tiên quyết
- ✅ Đã có proposal Active (Kịch bản 7)
- ✅ Có ít nhất 1 LENDX token để vote
- ✅ Chưa vote trên proposal này

### Các bước thực hiện

#### Bước 1: Mở trang Proposal
1. Điều hướng đến `/governance/1` (hoặc ID proposal vừa tạo)
2. Hoặc click vào proposal trong danh sách `/governance`

#### Bước 2: Kiểm tra thông tin Proposal
1. Xem **"Proposal Details"**:
   - **Status**: Active
   - **Voting Period**: Còn X ngày
   - **Votes For**: 0
   - **Votes Against**: 0
   - **Your Voting Power**: ~100,000 LENDX (nếu Account 0)
   - **You Voted**: No

#### Bước 3: Vote "For"
1. Click nút **"Vote For"** (màu xanh)
2. MetaMask hiện popup:
   - **To**: Governor address
   - **Function**: castVote(1, true)
   - **Gas**: ~100,000 - 150,000
   - Click **"Confirm"**
3. Đợi transaction confirm

#### Bước 4: Kiểm tra kết quả
1. Sau khi transaction thành công:
   - Toast: **"Vote Cast Successfully!"**
   - Page tự động refresh
2. Kiểm tra **"Votes For"**:
   - Tăng từ 0 → ~100,000 LENDX
3. Kiểm tra **"You Voted"**:
   - Đổi thành **"Yes (For)"**
4. Kiểm tra **"Vote Buttons"**:
   - Bị disable (đã vote rồi)

#### Bước 5: Vote từ tài khoản khác
1. Chuyển sang **Account 1** (có 50K LENDX)
2. Kết nối Account 1 trong MetaMask
3. Mở lại proposal `/governance/1`
4. Click **"Vote Against"** (màu đỏ)
5. **Kết quả mong đợi:**
   - Transaction thành công
   - **Votes Against**: Tăng từ 0 → 50,000 LENDX
   - **Votes For**: Vẫn 100,000 LENDX
   - **Total Votes**: 150,000 LENDX

#### Bước 6: Kiểm tra Proposal State
1. Sau khi có đủ vote:
   - **Votes For**: 100,000 LENDX
   - **Votes Against**: 50,000 LENDX
   - **Total Votes**: 150,000 LENDX
   - **Quorum**: 10,000 LENDX ✅ (đã đạt)
   - **Status**: Vẫn **"Active"** (chưa hết thời gian vote)

#### Bước 7: Đợi hết thời gian vote (hoặc giả lập)
1. Sau khi hết thời gian vote (7 days):
   - **Status**: Tự động chuyển thành **"Succeeded"** (nếu For > Against và đủ quorum)
   - Hoặc **"Defeated"** (nếu không đủ điều kiện)
2. Kiểm tra:
   - **Votes For** > **Votes Against**: ✅
   - **Total Votes** >= **Quorum**: ✅
   - **Status**: **"Succeeded"**

### Kết quả mong đợi
- ✅ Transaction thành công
- ✅ Votes được cập nhật đúng
- ✅ Không thể vote lại
- ✅ Proposal state thay đổi đúng sau khi hết thời gian

### Dữ liệu kiểm tra
- **Before**: Votes For = 0, Votes Against = 0
- **After (Account 0)**: Votes For = 100,000 LENDX
- **After (Account 1)**: Votes Against = 50,000 LENDX
- **Final State**: Succeeded (nếu For > Against và đủ quorum)

---

## 🎯 KỊCH BẢN 9: DEMO ĐẦY ĐỦ CHUỖI GIAO DỊCH {#kịch-bản-9}

### Mục tiêu
- Thực hiện đầy đủ chuỗi giao dịch từ đầu đến cuối
- Kiểm tra tất cả chức năng hoạt động liên tục
- Xác minh hệ thống ổn định

### Điều kiện tiên quyết
- ✅ Ganache đang chạy
- ✅ Frontend đang chạy
- ✅ Chainlink Oracle đang cập nhật giá (nếu có)
- ✅ MongoDB indexer đang chạy (nếu có)

### Chuỗi giao dịch đầy đủ

#### Phase 1: Setup (5 phút)
1. **Kết nối ví** (Account 0)
   - Connect Wallet
   - Kiểm tra số dư: 10K WETH, 1M DAI, 1M USDC, 100K LINK, 100K LENDX

2. **Khám phá giao diện**
   - Dashboard: Kiểm tra tất cả thông tin
   - Markets: Xem APY, liquidity, price
   - Governance: Xem danh sách proposals (nếu có)

#### Phase 2: Supply & Borrow (10 phút)
3. **Gửi tài sản**
   - Gửi 2,000 DAI
   - Kiểm tra interest tăng real-time
   - Đợi 30 giây, kiểm tra interest earned

4. **Vay tài sản**
   - Vay 1,000 USDC (dựa trên 2,000 DAI collateral)
   - Kiểm tra Health Factor = ~2.0
   - Kiểm tra debt tăng real-time

#### Phase 3: Repay & Withdraw (5 phút)
5. **Trả nợ**
   - Trả 500 USDC (một nửa)
   - Kiểm tra Health Factor tăng
   - Trả nốt 500 USDC còn lại

6. **Rút tài sản**
   - Rút 1,000 DAI (một nửa)
   - Kiểm tra wallet balance tăng
   - Rút nốt 1,000 DAI còn lại

#### Phase 4: Governance (10 phút)
7. **Tạo Proposal**
   - Tạo proposal thay đổi reserve factor
   - Kiểm tra proposal được tạo với ID hợp lệ

8. **Vote**
   - Vote "For" với Account 0 (100K LENDX)
   - Chuyển Account 1, vote "Against" (50K LENDX)
   - Kiểm tra votes được cập nhật

#### Phase 5: Liquidation (10 phút)
9. **Tạo tình huống thanh lý**
   - Với Account 2: Gửi 1,000 DAI, vay 800 USDC
   - Vay thêm để Health Factor < 1.0

10. **Thực hiện thanh lý**
    - Với Account 3: Liquidate Account 2
    - Kiểm tra nhận được collateral + bonus
    - Kiểm tra Account 2 Health Factor tăng

#### Phase 6: Kiểm tra tổng thể (5 phút)
11. **Kiểm tra Dashboard**
    - Tất cả số liệu hiển thị đúng
    - Health Factor hợp lý
    - Total Collateral và Total Debt chính xác

12. **Kiểm tra MongoDB Indexer** (nếu có)
    - Tất cả giao dịch được ghi nhận
    - Events được lưu đúng
    - User positions được cập nhật

### Kết quả mong đợi
- ✅ Tất cả giao dịch thành công
- ✅ Số liệu hiển thị chính xác
- ✅ Real-time updates hoạt động
- ✅ Không có lỗi trong console
- ✅ MongoDB ghi nhận đầy đủ

### Checklist cuối cùng
- [ ] Kết nối ví thành công
- [ ] Supply hoạt động + interest tăng
- [ ] Borrow hoạt động + debt tăng
- [ ] Repay hoạt động
- [ ] Withdraw hoạt động
- [ ] Governance proposal tạo thành công
- [ ] Vote hoạt động
- [ ] Liquidation hoạt động
- [ ] Dashboard hiển thị đúng
- [ ] Không có lỗi nghiêm trọng

---

## 📝 GHI CHÚ QUAN TRỌNG

### Lỗi thường gặp và cách xử lý

1. **"Transaction failed" hoặc "User rejected"**
   - Nguyên nhân: User hủy transaction trong MetaMask
   - Giải pháp: Thử lại, đảm bảo approve đủ token

2. **"Insufficient allowance"**
   - Nguyên nhân: Chưa approve token cho LendingPool
   - Giải pháp: Hệ thống tự động approve, đợi transaction approve xong

3. **"Health factor too low"**
   - Nguyên nhân: Vay quá nhiều hoặc rút quá nhiều
   - Giải pháp: Giảm số lượng vay/rút, hoặc trả bớt nợ

4. **"Insufficient liquidity"**
   - Nguyên nhân: Pool không đủ thanh khoản
   - Giải pháp: Đợi người khác gửi vào, hoặc giảm số lượng

5. **Giá hiển thị = $0 hoặc NaN**
   - Nguyên nhân: Chainlink Oracle chưa cập nhật giá
   - Giải pháp: Kiểm tra Chainlink jobs đang chạy, đợi 1-2 phút

### Tips cho demo

1. **Chuẩn bị trước:**
   - Test tất cả chức năng trước khi demo
   - Chuẩn bị sẵn các tài khoản với số dư phù hợp
   - Đảm bảo Chainlink Oracle đang chạy

2. **Trong khi demo:**
   - Giải thích từng bước rõ ràng
   - Chỉ ra các tính năng nổi bật (real-time interest, Health Factor)
   - Xử lý lỗi một cách chuyên nghiệp

3. **Sau khi demo:**
   - Tóm tắt lại các chức năng đã demo
   - Nhấn mạnh điểm mạnh của hệ thống
   - Trả lời câu hỏi về các tính năng

---

## 🎉 KẾT LUẬN

Các kịch bản demo trên bao gồm đầy đủ chức năng chính của LendHub V2:
- ✅ Kết nối ví và giao diện
- ✅ Supply với real-time interest
- ✅ Borrow với Health Factor
- ✅ Repay và Withdraw
- ✅ Liquidation
- ✅ Governance (Proposal + Vote)

Mỗi kịch bản đều có:
- Mục tiêu rõ ràng
- Điều kiện tiên quyết
- Các bước chi tiết
- Kết quả mong đợi
- Dữ liệu kiểm tra

Chúc bạn demo thành công! 🚀

