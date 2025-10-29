# ✅ GIẢI PHÁP CUỐI CÙNG

## 🔍 VẤN ĐỀ:

**Lỗi:** `could not coalesce error (code -32603)`

**Khi nào:** Khi cố tắt collateral

## 🎯 NGUYÊN NHÂN:

Transaction REVERT vì:
- Bạn có **DEBT** (đang vay tiền)
- Bạn đang tắt **COLLATERAL DUY NHẤT**
- Contract kiểm tra → HF sẽ < 1.00 → REVERT để bảo vệ bạn!

---

## ✅ GIẢI PHÁP:

### Option 1: Repay Debt Trước
1. Vào dashboard
2. Tìm "Borrows" section
3. Repay **ALL** debt
4. Sau đó tắt collateral → **Success!**

### Option 2: Enable Thêm Collateral
1. Supply thêm 1 asset khác (ví dụ: DAI, USDC)
2. Enable nó làm collateral
3. Bây giờ bạn có 2 assets làm collateral
4. Tắt asset đầu tiên → **Success!**

---

## 🛡️ TẠI SAO NHƯ VẬY?

**Health Factor (HF) = Collateral Value / Debt Value**

Ví dụ:
- Collateral: $1000
- Debt: $800
- HF = $1000 / $800 = 1.25 ✅ (Safe)

Nếu tắt collateral:
- Collateral: $0
- Debt: $800  
- HF = $0 / $800 = 0 ❌ (Liquidatable!)

→ Contract KHÔNG cho phép → REVERT transaction

---

## 💡 LÀM GÌ BÂY GIỜ:

### Bước 1: Mở Browser
```
http://localhost:3000
```

### Bước 2: Hard Refresh
```
Ctrl + Shift + R
```

### Bước 3: Kiểm tra Debt
- Vào "Borrows" section
- Xem bạn đang nợ bao nhiêu

### Bước 4a: Nếu có Debt
- **Repay hết debt** trước
- Hoặc **enable thêm collateral**
- Sau đó mới tắt

### Bước 4b: Nếu KHÔNG có Debt
- Tắt collateral được ngay!

---

**Đây là CƠ CHẾ BẢO VỆ, không phải BUG!** ✅



