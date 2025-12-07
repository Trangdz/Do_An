# 🏗️ Sơ Đồ Kiến Trúc Hệ Thống - Chuẩn Chỉ

## 🔍 Phân Tích Sơ Đồ Hiện Tại

### **✅ Đúng:**
1. Wallet gửi signed transactions trực tiếp qua RPC Node
2. Wallet đọc RPC trực tiếp
3. Backend có read RPC schedule/cron (cho indexer)
4. Backend lưu parsed data vào MongoDB
5. Chainlink Node update prices lên Oracle

### **❌ Thiếu/Chưa Đúng:**
1. **Frontend cũng gọi RPC trực tiếp** (không chỉ qua Wallet)
2. **Indexer** chưa được thể hiện rõ (đang ở Backend)
3. **Flow đọc data** chưa rõ: Frontend có thể đọc từ API hoặc RPC trực tiếp
4. **Cache layer** chưa được thể hiện

---

## 📊 Sơ Đồ Mermaid Chuẩn Chỉ

```mermaid
graph TB
    subgraph Client["🖥️ CLIENT (Browser)"]
        Frontend["Frontend<br/>(Next.js)"]
        Wallet["Wallet<br/>(MetaMask)"]
    end

    subgraph OffChain["📡 OFF-CHAIN"]
        Backend["Backend API<br/>(Next.js Routes)"]
        Indexer["Indexer/Workers<br/>(Event Listener)"]
        MongoDB[("MongoDB<br/>(Database)")]
        ChainlinkNode["Chainlink Node<br/>(Oracle Service)"]
    end

    subgraph OnChain["⛓️ ON-CHAIN (Blockchain)"]
        RPCNode["RPC Node<br/>(http://127.0.0.1:7545)"]
        LendingPool["LendingPool<br/>(Smart Contract)"]
        Oracle["Oracle<br/>(MultiPriceAggregator)"]
        IRM["InterestRateModel<br/>(Smart Contract)"]
        ERC20["ERC20 Tokens<br/>(Smart Contracts)"]
    end

    %% Client Interactions
    Frontend -->|"1. REST/JSON<br/>(Optional API)"| Backend
    Frontend -->|"2. Read RPC<br/>(Direct - Đọc data)"| RPCNode
    Wallet -->|"3. Signed TX<br/>(Transactions)"| RPCNode
    Wallet -->|"4. Read RPC<br/>(Query state)"| RPCNode

    %% Off-chain Interactions
    Backend -->|"5. Store parsed data"| MongoDB
    Backend -->|"6. Read RPC<br/>(API endpoints)"| RPCNode
    Indexer -->|"7. Subscribe Events<br/>(Real-time)"| RPCNode
    Indexer -->|"8. Store events"| MongoDB
    ChainlinkNode -->|"9. Update prices<br/>(Optional)"| Oracle

    %% On-chain Interactions
    RPCNode -->|"10. Query/Execute"| LendingPool
    RPCNode -->|"11. Query/Execute"| Oracle
    RPCNode -->|"12. Query/Execute"| IRM
    RPCNode -->|"13. Query/Execute"| ERC20

    %% Smart Contract Interactions
    LendingPool -->|"14. Get prices"| Oracle
    LendingPool -->|"15. Get rates"| IRM
    LendingPool -->|"16. Transfer tokens"| ERC20

    %% Styling
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef offchain fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef onchain fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class Frontend,Wallet client
    class Backend,Indexer,ChainlinkNode offchain
    class RPCNode,LendingPool,Oracle,IRM,ERC20 onchain
    class MongoDB database
```

---

## 📝 Giải Thích Chi Tiết

### **1. Frontend → RPC Node (Trực Tiếp)**
```
Frontend gọi RPC trực tiếp để:
- Đọc balance
- Đọc positions
- Đọc reserve data
- Query contract state
```
**Code:**
```javascript
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const accountData = await pool.getAccountData(userAddress);
```

---

### **2. Frontend → Backend API (Optional)**
```
Frontend có thể gọi API để:
- Lấy cached data (nhanh hơn)
- Lấy transaction history
- Lấy analytics
```
**Code:**
```javascript
const response = await fetch('/api/positions/user');
const data = await response.json();
```

---

### **3. Wallet → RPC Node (Transactions)**
```
Wallet gửi signed transactions:
- Supply/Deposit
- Withdraw
- Borrow
- Repay
- Liquidate
```
**Code:**
```javascript
const signer = await provider.getSigner();
const tx = await poolContract.supply(tokenAddress, amount);
```

---

### **4. Indexer → RPC Node (Events)**
```
Indexer đọc events từ blockchain:
- Supplied events
- Withdrawn events
- Borrowed events
- Repaid events
- Liquidated events
```
**Code:**
```javascript
pool.on('Supplied', (user, asset, amount) => {
  // Store to MongoDB
});
```

---

### **5. Backend → MongoDB (Storage)**
```
Backend/Indexer lưu:
- Parsed transaction data
- User positions
- Reserve data
- Analytics
```

---

### **6. Chainlink → Oracle (Prices)**
```
Chainlink Node update prices:
- External price feeds
- Update on-chain Oracle
- LendingPool sử dụng prices
```

---

## 🔄 Flow Chi Tiết

### **Flow 1: User Đọc Data**

```
User muốn xem positions
    ↓
Frontend có 2 options:
    ↓
Option A: Gọi API (nhanh, có thể stale)
    Frontend → Backend API → MongoDB
    ↓
Option B: Gọi RPC trực tiếp (chậm, chính xác)
    Frontend → RPC Node → LendingPool
    ↓
Return data về Frontend
```

---

### **Flow 2: User Thực Hiện Transaction**

```
User click "Supply"
    ↓
Frontend gọi function supply()
    ↓
Wallet (MetaMask) ký transaction
    ↓
Wallet gửi signed TX → RPC Node
    ↓
RPC Node broadcast → Blockchain
    ↓
LendingPool execute transaction
    ↓
Emit Events (Supplied)
    ↓
Indexer bắt events → Lưu MongoDB
    ↓
Frontend refresh data
```

---

### **Flow 3: Indexer Đọc Events**

```
Indexer chạy real-time
    ↓
Subscribe events từ RPC Node
    ↓
Khi có event mới:
    - Parse event data
    - Lưu vào MongoDB
    - Update user positions
    ↓
Frontend có thể query từ MongoDB (nhanh)
```

---

## ✅ Sơ Đồ Chuẩn Chỉ

### **Điểm Quan Trọng:**

1. ✅ **Frontend gọi RPC trực tiếp** (không chỉ qua Wallet)
2. ✅ **Wallet chỉ cho transactions** (signed TX)
3. ✅ **Backend/Indexer đọc events** và lưu MongoDB
4. ✅ **Frontend có 2 options**: API (nhanh) hoặc RPC (chính xác)
5. ✅ **Indexer chạy real-time** để sync data

---

## 🎯 So Sánh Với Sơ Đồ Cũ

| Aspect | Sơ Đồ Cũ | Sơ Đồ Chuẩn |
|--------|----------|-------------|
| Frontend → RPC | ❌ Không rõ | ✅ Có (trực tiếp) |
| Indexer | ❌ Ẩn trong Backend | ✅ Tách riêng |
| Flow đọc data | ❌ Không rõ | ✅ 2 options |
| Cache layer | ❌ Không có | ✅ MongoDB |

---

**Sơ đồ này phản ánh đúng logic và luồng thực tế của hệ thống!** 🎯






