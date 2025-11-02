# 📋 SO SÁNH CÁC FORMAT TOML CHO CHAINLINK 1.13.0

## ✅ FORMAT ĐANG HOẠT ĐỘNG (Hiện tại)

```toml
encode   [type="ethabiencode" abi="(int256)" data="[$(multiply)]"]
submit   [type="ethtx" to="0x..." functionSignature="updateAnswer(int256)" data="$(encode)"]
```

**Ưu điểm:**
- ✅ Đã test và hoạt động
- ✅ Không có vấn đề TOML parsing
- ✅ Đơn giản, dễ hiểu

**Cách hoạt động:**
- Dùng array format `[$(multiply)]` cho unnamed parameter
- Dùng `functionSignature` trong `ethtx` để chỉ định hàm cần gọi

---

## ❌ FORMAT USER ĐỀ XUẤT (Bị lỗi)

```toml
jsonstr  [type="concat" values="{\\"answer_\\":" "$(multiply)"}"]
jsonobj  [type="jsonparse" data="$(jsonstr)"]
encode   [type=ethabiencode abi="updateAnswer(int256)" data="$(jsonobj)"]
submit   [type=ethtx to="0x..." data="$(encode)"]
```

**Lỗi:**
```
failed to parse TOML: Error in S55: id(19,":"), Pos(offset=297, line=5, column=42), 
expected one of: = 
```

**Nguyên nhân:**
- Chainlink 1.13.0 không parse được cách escape quotes trong `concat` task
- TOML parser gặp vấn đề với `"{\\"answer_\\":"` trong `values` attribute

---

## 🔧 CÁCH KHẮC PHỤC (Nếu muốn dùng named parameter)

### Option 1: Dùng single quotes (Đã test - FAIL)
```toml
encode   [type="ethabiencode" abi="updateAnswer(int256)" data='{"answer_": $(multiply)}']
```
❌ Chainlink 1.13.0 không hỗ trợ single quotes trong TOML

### Option 2: Dùng concat với format khác
Cần escape quotes khác đi, nhưng vẫn có thể gặp lỗi parsing.

### Option 3: Giữ format hiện tại (Recommended)
✅ Đang hoạt động tốt, không cần thay đổi.

---

## 📊 KẾT LUẬN

**Format hiện tại đã tối ưu:**
- Hoạt động 100%
- Không có lỗi parsing
- Đơn giản và rõ ràng

**Format user đề xuất:**
- ❌ Bị lỗi TOML parsing
- Cần sửa cách escape quotes (nhưng có thể vẫn fail)
- Không có lợi ích so với format hiện tại

**Khuyến nghị:** Giữ nguyên format hiện tại vì:
1. Đã hoạt động tốt
2. Không có lỗi
3. Đơn giản hơn
4. Named parameter không cần thiết cho function `updateAnswer(int256)`

---

## 💡 LƯU Ý

Contract function:
```solidity
function updateAnswer(int256 answer_) external returns (uint80 roundId)
```

Có named parameter `answer_` nhưng trong ABI encoding, tên parameter không quan trọng. 
Chainlink chỉ cần:
- ABI signature: `updateAnswer(int256)`
- Data: `[value]` (array với giá trị)

Format hiện tại đáp ứng đủ yêu cầu này.



