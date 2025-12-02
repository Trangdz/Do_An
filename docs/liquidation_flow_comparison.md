# So Sánh Luồng Thanh Lý: Hình Vẽ vs Code Thực Tế

## Điểm Đúng ✅

1. **Phase 1: Phát hiện vị thế rủi ro**
   - ✅ Liquidator mở trang Liquidation
   - ✅ Frontend lấy danh sách borrowers có HF < 1
   - ✅ Hiển thị danh sách sắp xếp theo HF thấp nhất

2. **Phase 2: Cấu hình và ước tính**
   - ✅ Liquidator chọn borrower, debtAsset, collateralAsset, amount
   - ✅ Frontend lấy giá token và bonus để ước tính
   - ✅ Hiển thị kết quả ước tính collateral nhận được

3. **Phase 3: Gửi giao dịch**
   - ✅ Liquidator gửi liquidationCall
   - ✅ Contract kiểm tra HF và điều kiện an toàn
   - ✅ Có alt block xử lý thành công/thất bại

4. **Phase 4: Kết quả**
   - ✅ Emit event Liquidated
   - ✅ Backend lưu vào MongoDB (Indexer service)

## Điểm Cần Điều Chỉnh ⚠️

### 1. **Frontend không gọi Backend để lấy danh sách**

**Trong hình:** Frontend → Backend → Blockchain

**Trong code thực tế:** Frontend → Blockchain (trực tiếp)

```typescript
// Frontend trực tiếp query blockchain
const [coll, debt, hf] = await pool.getAccountData(user);
// Không có API call đến backend
```

**Lý do:** Frontend sử dụng RPC provider trực tiếp để query blockchain, không qua backend API.

### 2. **Backend chỉ lưu events, không phải nguồn dữ liệu chính**

**Trong hình:** Backend được hiển thị như một bước trong luồng chính

**Trong code thực tế:** 
- Indexer là service riêng, chạy độc lập
- Chỉ lắng nghe events và lưu vào MongoDB
- Frontend không phụ thuộc vào backend để hiển thị danh sách

### 3. **Thiếu bước Validation & Approve**

**Trong hình:** Không có bước kiểm tra balance/allowance và approve

**Trong code thực tế:**
- Frontend kiểm tra balance của liquidator
- Frontend kiểm tra allowance
- Nếu thiếu, hiển thị nút Approve
- Liquidator phải approve trước khi thanh lý

## Sơ Đồ Đã Điều Chỉnh

Đã tạo file `docs/liquidation_sequence_corrected.mermaid` với các điều chỉnh:

1. ✅ Frontend trực tiếp query blockchain (không qua backend)
2. ✅ Thêm bước Validation & Approve
3. ✅ Indexer là service riêng, lắng nghe events bất đồng bộ
4. ✅ Giữ nguyên logic alt block cho thành công/thất bại

## Kết Luận

Luồng trong hình **đúng về mặt logic** nhưng cần điều chỉnh:
- Frontend query blockchain trực tiếp (không qua backend)
- Backend chỉ lưu events sau khi transaction thành công
- Cần thêm bước validation và approve

Sơ đồ đã điều chỉnh phản ánh đúng cách code hoạt động.







