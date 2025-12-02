# 🔍 Giải Thích Lỗi Chainlink Queue (252/250)

## ❌ Lỗi Gặp Phải

```
Txm#CreateEthTransaction: cannot create transaction; 
too many unstarted transactions in the queue (252/250)
```

## 📖 Giải Thích

### 1. **Lỗi là gì?**
- Chainlink đang cố gắng tạo transaction mới
- Nhưng queue đã có **252 transactions** chưa được gửi
- Giới hạn hiện tại là **250 transactions** (MaxQueued)
- → Chainlink từ chối tạo transaction mới để tránh queue quá đầy

### 2. **Tại sao lại có 252 transactions trong queue?**
**Nguyên nhân chính:** ETH node (Ganache/Hardhat) **KHÔNG broadcast transactions** lên mạng

**Quy trình bình thường:**
```
Chainlink → Tạo transaction → Gửi đến ETH node → ETH node broadcast → Xóa khỏi queue
```

**Quy trình khi lỗi:**
```
Chainlink → Tạo transaction → Gửi đến ETH node → ❌ ETH node KHÔNG broadcast 
→ Transaction vẫn trong queue → Tích lũy đến 252 transactions
```

### 3. **Tại sao ETH node không broadcast?**

Có thể do:
- ✅ **ETH node không chạy** → Khởi động lại
- ✅ **ETH node bị treo/crash** → Restart node
- ✅ **Kết nối mạng bị lỗi** → Kiểm tra firewall, network
- ✅ **ETH node quá tải** → Giảm số transactions hoặc tăng tài nguyên
- ✅ **ETH node không nhận được transactions** → Kiểm tra URL kết nối

## 🔧 Giải Pháp

### ✅ Giải Pháp 1: Khởi Động Lại ETH Node

**Nếu dùng Ganache:**
```bash
# Dừng Ganache hiện tại (Ctrl+C)
# Khởi động lại
ganache-cli -p 7545 -m "globe equip glow concert garage canvas sword feature stereo prison pony brief"
```

**Nếu dùng Hardhat:**
```bash
# Dừng Hardhat hiện tại (Ctrl+C)
# Khởi động lại
npx hardhat node --port 8545
```

### ✅ Giải Pháp 2: Khởi Động Lại Chainlink

Chainlink cần restart để:
- Áp dụng config mới (MaxQueued = 1000)
- Kết nối lại với ETH node
- Xóa queue cũ

```bash
docker-compose restart chainlink
```

### ✅ Giải Pháp 3: Kiểm Tra Kết Nối

**Kiểm tra ETH node có chạy không:**
```bash
# Test Ganache
curl -X POST http://localhost:7545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test Hardhat
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Kiểm tra Chainlink có kết nối được không:**
- Mở Chainlink UI: http://localhost:6688
- Vào tab "Chains" → Kiểm tra status
- Vào tab "Transactions" → Xem queue

### ✅ Giải Pháp 4: Tăng MaxQueued (Đã làm)

Đã tăng `MaxQueued` từ 250 → 1000 trong:
- ✅ `config.toml`
- ✅ `chainlink-data/config.toml`
- ✅ `node1/config.toml`
- ✅ `node2/config.toml`

**⚠️ Lưu ý:** Tăng MaxQueued chỉ là giải pháp tạm thời. Nếu ETH node không broadcast, queue sẽ lại đầy.

## 🎯 Giải Pháp Dài Hạn

### 1. **Thêm Backup ETH Nodes**

Sửa `chainlink-data/config.toml`:

```toml
[[EVM.Nodes]]
Name   = "ganache-primary"
WSURL  = "ws://host.docker.internal:7545"
HTTPURL = "http://host.docker.internal:7545"

[[EVM.Nodes]]
Name   = "ganache-backup"
WSURL  = "ws://host.docker.internal:7546"
HTTPURL = "http://host.docker.internal:7546"
SendOnly = true  # Chỉ dùng để gửi transactions
```

### 2. **Tối Ưu Cấu Hình**

```toml
[EVM.Transactions]
MaxInFlight = 32        # Tăng số transactions đang xử lý
MaxQueued = 1000        # Đã tăng
ReaperInterval = '30m'  # Dọn dẹp queue thường xuyên hơn
ResendAfterThreshold = '30s'  # Resend nhanh hơn nếu fail
```

### 3. **Monitoring**

- Theo dõi Chainlink logs: `docker-compose logs -f chainlink`
- Kiểm tra ETH node logs
- Monitor queue size trong Chainlink UI

## 📊 Kiểm Tra Sau Khi Sửa

1. ✅ **ETH node đang chạy** → Test bằng curl
2. ✅ **Chainlink kết nối được ETH node** → Check Chainlink UI
3. ✅ **Queue giảm dần** → Xem tab Transactions
4. ✅ **Transactions được broadcast** → Check Ganache/Hardhat logs

## 🚨 Khi Nào Cần Hỗ Trợ Thêm?

Nếu sau khi:
- ✅ Restart ETH node
- ✅ Restart Chainlink
- ✅ Kiểm tra kết nối

Mà vẫn gặp lỗi → Có thể là:
- Vấn đề với cấu hình network (Docker networking)
- ETH node không tương thích
- Chainlink version có bug

→ Kiểm tra logs chi tiết và tài liệu Chainlink.













