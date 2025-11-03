# 🔧 Interest Tracker Fix

## ✅ Đã Sửa

Interest Tracker đã được cập nhật để **tự động tìm users từ blockchain** thay vì chỉ dựa vào MongoDB transactions.

### Thay đổi:

1. **Multi-source user discovery:**
   - Trước: Chỉ tìm trong MongoDB transactions collection
   - Sau: Tìm trong MongoDB + blockchain events

2. **Blockchain event querying:**
   - Query `Supplied` events từ contract
   - Query `Borrowed` events từ contract
   - Scan last 10,000 blocks

3. **Fallback mechanism:**
   - Nếu không có users trong DB → query blockchain
   - Nếu không có events → hiển thị warning

---

## 🚀 Cách Chạy

```bash
cd indexer
npm run interest-tracker
```

### Output mong đợi:

```
✅ Connected to MongoDB
✅ Initialized Interest Tracker
🚀 Starting Interest Tracker...
🔄 Updating all user positions...
📊 Found 0 users from transactions DB
🔍 Searching blockchain for users with positions...
📊 Found 3 users from blockchain
✅ Updated all positions
✅ Interest Tracker running (updates every 60s)
```

---

## ⚠️ Nếu Vẫn Không Tìm Thấy Users

1. **Kiểm tra contract address:**
   ```bash
   echo $LENDING_POOL_ADDRESS
   ```

2. **Kiểm tra RPC connection:**
   ```bash
   curl -X POST http://localhost:7545 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

3. **Tạo transactions test:**
   - Supply một số tokens
   - Borrow một số tokens
   - Interest Tracker sẽ tự động detect

4. **Manually add user (for testing):**
   ```javascript
   // Trong MongoDB shell
   db.transactions.insertOne({
     user: "0xYourAddress",
     type: "Lend",
     asset: { address: "0x...", symbol: "WETH" },
     amount: "1.0",
     timestamp: Date.now()
   })
   ```

---

## 📝 Notes

- Interest Tracker sẽ tự động update mỗi 1 phút
- Khi có transaction mới, sẽ được detect trong lần update tiếp theo
- Users được cache trong memory để optimize performance

