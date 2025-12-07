# 🔍 Phân Biệt: Frontend Code vs Backend Code

## ❓ Câu Hỏi: `new ethers.JsonRpcProvider()` Là Backend?

## ✅ Trả Lời: KHÔNG! Đây là Frontend Code

---

## 🔍 Phân Tích Code

### **1. Code Trong `LendState.js` - Frontend**

```javascript
// lendhub-frontend-nextjs/src/context/LendState.js
// Đây là REACT COMPONENT, chạy trong BROWSER

const LendState = (props) => {
  // Code này chạy trong BROWSER (client-side)
  const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const accountData = await pool.getAccountData(userAddress);
}
```

**Vị trí file:** `src/context/LendState.js`  
**Chạy ở đâu:** Browser (client-side)  
**Là gì:** React Component

---

### **2. Code Trong API Route - Backend**

```typescript
// lendhub-frontend-nextjs/src/app/api/reserve/[asset]/route.ts
// Đây là API ROUTE, chạy trên SERVER

export async function GET(request: NextRequest) {
  // Code này chạy trên SERVER (server-side)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const reserve = await pool.reserves(assetAddress);
}
```

**Vị trí file:** `src/app/api/reserve/[asset]/route.ts`  
**Chạy ở đâu:** Server (server-side)  
**Là gì:** Next.js API Route

---

## 🎯 Sự Khác Biệt

### **Frontend Code (Browser):**

```javascript
// File: src/context/LendState.js
// Chạy trong BROWSER
const LendState = (props) => {
  // ✅ Code này chạy trong browser
  const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  // Browser gọi RPC trực tiếp từ client
}
```

**Đặc điểm:**
- ✅ Chạy trong browser
- ✅ User có thể thấy trong DevTools
- ✅ Có thể access `window`, `localStorage`
- ✅ Gọi RPC từ browser

---

### **Backend Code (Server):**

```typescript
// File: src/app/api/reserve/[asset]/route.ts
// Chạy trên SERVER
export async function GET(request: NextRequest) {
  // ✅ Code này chạy trên server
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  // Server gọi RPC từ server
}
```

**Đặc điểm:**
- ✅ Chạy trên server (Node.js)
- ✅ User không thấy code
- ✅ Không có `window`, `localStorage`
- ✅ Gọi RPC từ server

---

## 📊 So Sánh

| Aspect | Frontend Code | Backend Code |
|--------|---------------|--------------|
| **File location** | `src/context/` | `src/app/api/` |
| **Chạy ở đâu** | Browser | Server |
| **Có thể gọi RPC?** | ✅ Có | ✅ Có |
| **User thấy code?** | ✅ Có (DevTools) | ❌ Không |
| **Có `window`?** | ✅ Có | ❌ Không |
| **Có `localStorage`?** | ✅ Có | ❌ Không |

---

## 🔍 Làm Sao Biết Code Chạy Ở Đâu?

### **1. Xem File Location:**

```
Frontend Code:
- src/context/
- src/components/
- src/pages/
- src/lib/ (nếu import vào component)

Backend Code:
- src/app/api/
- src/app/api/**/route.ts
```

---

### **2. Xem Export:**

```javascript
// Frontend - React Component
const LendState = (props) => { ... }
export default LendState;

// Backend - API Route
export async function GET(request) { ... }
```

---

### **3. Xem Import:**

```javascript
// Frontend - Dùng React hooks
import { useState, useEffect } from 'react';

// Backend - Dùng Next.js API
import { NextRequest, NextResponse } from 'next/server';
```

---

## ✅ Kết Luận

**`const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');`**

**Trong `LendState.js`:**
- ✅ **Frontend code** (chạy trong browser)
- ✅ Browser gọi RPC trực tiếp
- ❌ **KHÔNG phải backend**

**Trong `route.ts`:**
- ✅ **Backend code** (chạy trên server)
- ✅ Server gọi RPC từ server
- ✅ Đây mới là backend

---

## 🎯 Tóm Tắt

**Cả Frontend và Backend đều có thể gọi RPC, nhưng:**

1. **Frontend code** (`LendState.js`):
   - Chạy trong browser
   - Browser gọi RPC trực tiếp
   - User có thể thấy trong DevTools

2. **Backend code** (`route.ts`):
   - Chạy trên server
   - Server gọi RPC từ server
   - User không thấy code

**Trong dự án này:**
- ✅ Frontend gọi RPC trực tiếp (chính)
- ✅ Backend cũng gọi RPC (nhưng ít hơn)

---

**`LendState.js` = Frontend Code (Browser)**  
**`route.ts` = Backend Code (Server)**






