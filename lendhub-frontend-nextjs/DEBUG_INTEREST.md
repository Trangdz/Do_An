# Debug Guide: Interest Earned Display Issue

## Vấn đề
Interest earned hiển thị = 0 mặc dù balance đã tăng (999.998... DAI).

## Nguyên nhân có thể

### 1. `originalPrincipalWadRef` chưa được set đúng
- Khi fetch từ chain lần đầu, `originalPrincipalWadRef` phải được set = `principalWad` (999)
- Nếu `originalPrincipalWadRef` = 0, thì `interestEarned` sẽ = `suppliedBalance` (sai)

### 2. Timing issue
- Khi component render lần đầu, `originalPrincipalWadRef` = 0
- Khi fetch từ chain, `originalPrincipalWadRef` được set, nhưng component chưa re-render
- Cần đảm bảo component re-render sau khi set `originalPrincipalWadRef`

### 3. Fallback logic sai
- Nếu `originalPrincipalWadRef` = 0, code fallback về `principalWadRef.current` hoặc `supplyAsset.supplyPrincipal`
- Những giá trị này có thể không chính xác

## Cách debug

### Bước 1: Kiểm tra console log
Mở DevTools và tìm các log sau:

1. **`✅ Set originalPrincipalWadRef (first time)`**
   - Phải xuất hiện khi fetch từ chain lần đầu
   - `principal` phải = 999 (hoặc giá trị thực tế)

2. **`💰 Interest calculation`**
   - Kiểm tra `originalPrincipalWadRef` có = 0 không
   - Kiểm tra `suppliedBalance` và `suppliedPrincipal`
   - Kiểm tra `interestEarned` = `suppliedBalance - suppliedPrincipal`

3. **`💰 Balance calculation`**
   - Kiểm tra `displayBalance` có tăng không
   - Kiểm tra `originalPrincipalWad` có được set không

### Bước 2: Kiểm tra localStorage
Mở DevTools > Application > Local Storage và tìm key:
```
deposit_realtime_<userAddress>_<symbol>_<address>
```

Kiểm tra:
- `originalPrincipalWad` có tồn tại không
- `originalPrincipalWad` có = `principalWad` không (hoặc gần bằng)

### Bước 3: Kiểm tra logic tính toán
Trong console, chạy:
```javascript
// Lấy giá trị từ refs (cần truy cập từ component)
console.log('originalPrincipalWadRef:', originalPrincipalWadRef.current.toString());
console.log('principalWadRef:', principalWadRef.current.toString());
console.log('displayBalance:', displayBalance);
```

## Giải pháp đã áp dụng

1. **Đảm bảo `originalPrincipalWadRef` luôn được set**
   - Khi fetch từ chain lần đầu (principal = 0 → set ngay)
   - Khi có deposit mới (principal tăng > 1%)

2. **Không fallback về `supplyAsset.supplyPrincipal`**
   - Chỉ sử dụng `originalPrincipalWadRef` hoặc `principalWadRef`
   - Nếu cả hai đều = 0, thì `originalPrincipal` = 0

3. **Thêm log chi tiết**
   - Log khi set `originalPrincipalWadRef`
   - Log khi tính interest
   - Log khi restore từ localStorage

## Test case

1. **Deposit 1000 DAI**
   - `originalPrincipalWadRef` phải = 999 (sau fee)
   - `displayBalance` bắt đầu từ 999.998... (có lãi)
   - `interestEarned` = 999.998... - 999 = 0.998... (đúng)

2. **Sau 1 giây**
   - `displayBalance` tăng lên (ví dụ: 999.9985...)
   - `originalPrincipalWadRef` vẫn = 999 (không đổi)
   - `interestEarned` = 999.9985... - 999 = 0.9985... (tăng)

3. **Refresh page**
   - `originalPrincipalWadRef` được restore từ localStorage
   - `displayBalance` được restore và tiếp tục tăng
   - `interestEarned` vẫn tính đúng

## Nếu vẫn không hoạt động

1. Kiểm tra xem `originalPrincipalWadRef` có được set trong `fetchChainSnapshot` không
2. Kiểm tra xem `originalPrincipalWadRef` có được save vào localStorage không
3. Kiểm tra xem `originalPrincipalWadRef` có được restore từ localStorage không
4. Kiểm tra xem component có re-render sau khi set `originalPrincipalWadRef` không

