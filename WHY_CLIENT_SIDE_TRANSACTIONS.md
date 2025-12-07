# Tại Sao Transactions Phải Chạy Ở Client-Side Trong Next.js?

## 🤔 Câu Hỏi: Tại Sao Lại Gửi Từ Client Khi Dự Án Dùng Next.js?

Next.js có thể chạy code ở **cả server-side và client-side**. Tuy nhiên, **transactions PHẢI chạy ở client-side** vì lý do kỹ thuật và bảo mật.

## 📋 Next.js Có 2 Môi Trường Chạy Code

### 1. **Server-Side (Backend)**
- Chạy trên **Node.js server**
- Có thể gọi RPC từ server
- **KHÔNG CÓ** access đến browser APIs (MetaMask, localStorage, window, etc.)
- Dùng cho: API routes, Server Components, data fetching

### 2. **Client-Side (Browser)**
- Chạy trong **browser**
- Có access đến **MetaMask**, localStorage, window, etc.
- Dùng cho: User interactions, transactions, UI components

## 🔍 Code Hiện Tại

**File: `lendhub-frontend-nextjs/src/app/layout.tsx`**
```typescript
'use client';  // ← Directive này báo Next.js: code này chạy ở CLIENT-SIDE

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LendState>  {/* React component chạy ở browser */}
          {children}
        </LendState>
      </body>
    </html>
  )
}
```

**File: `lendhub-frontend-nextjs/src/lib/tx.ts`**
```typescript
export async function lend(
  signer: ethers.Signer,  // ← MetaMask signer - CHỈ CÓ Ở BROWSER
  tokenAddress: string,
  amount: bigint
) {
  const poolContract = new ethers.Contract(..., signer);
  const tx = await poolContract.lend(...);  // ← Chạy ở BROWSER
}
```

## ❌ Tại Sao KHÔNG Thể Chạy Transactions Ở Server-Side?

### Vấn Đề 1: **Không Có MetaMask Ở Server**

```typescript
// ❌ KHÔNG THỂ làm ở server-side:
// app/api/lend/route.ts (Server-Side)
export async function POST(request: Request) {
  // ❌ LỖI: Server không có window.ethereum
  const provider = new ethers.BrowserProvider(window.ethereum);  // ❌ undefined
  
  // ❌ LỖI: Server không có MetaMask
  const signer = await provider.getSigner();  // ❌ Không thể lấy signer
}
```

**Lý do:**
- MetaMask chỉ có ở **browser** (window.ethereum)
- Server không có **window object**
- Server không có **browser APIs**

### Vấn Đề 2: **Cần Private Key Để Ký Transaction**

```typescript
// ❌ Nếu muốn ký transaction ở server:
// app/api/lend/route.ts
export async function POST(request: Request) {
  // ❌ NGUY HIỂM: Phải lưu private key ở server
  const privateKey = process.env.USER_PRIVATE_KEY;  // ❌ RẤT NGUY HIỂM!
  const wallet = new ethers.Wallet(privateKey);
  const tx = await poolContract.lend(...);
}
```

**Vấn đề:**
- ❌ **RẤT NGUY HIỂM**: Private key ở server có thể bị hack
- ❌ **Centralized**: User phải trust server
- ❌ **Không đúng tinh thần DeFi**: Decentralized = user tự control

### Vấn Đề 3: **User Phải Approve Transaction**

```typescript
// ✅ Đúng (Client-Side):
// User click button → MetaMask popup → User approve → Transaction gửi

// ❌ Sai (Server-Side):
// User click button → Server tự động gửi transaction
// → User KHÔNG THỂ approve
// → User KHÔNG THỂ kiểm soát
```

## ✅ Tại Sao Phải Chạy Ở Client-Side?

### 1. **Cần MetaMask (Chỉ Có Ở Browser)**

```typescript
// ✅ Đúng (Client-Side):
const { ethereum } = window;  // ← Chỉ có ở browser
const provider = new ethers.BrowserProvider(ethereum);
const signer = await provider.getSigner();  // ← MetaMask signer
const tx = await poolContract.lend(...);  // ← User approve trong MetaMask
```

### 2. **User Tự Control (DeFi Pattern)**

```
✅ Đúng (Client-Side):
User → MetaMask (browser) → Blockchain
(User tự control, không qua server)

❌ Sai (Server-Side):
User → Server → Blockchain
(User phải trust server, không đúng DeFi)
```

### 3. **Bảo Mật (Private Key Ở Browser)**

```
✅ Đúng (Client-Side):
- Private key ở MetaMask (browser)
- User tự quản lý
- Server không thấy private key

❌ Sai (Server-Side):
- Private key ở server
- Server có thể bị hack
- User mất control
```

## 🔄 Next.js Architecture: Server vs Client

### **Server Components (Mặc Định - Không Có 'use client')**

```typescript
// app/reserves/page.tsx (Server Component)
// KHÔNG có 'use client'
export default async function ReservesPage() {
  // Chạy ở SERVER
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const reserves = await pool.reserves(tokenAddress);
  
  return <div>{reserves}</div>;  // Render ở server, gửi HTML về browser
}
```

**Dùng cho:**
- ✅ Đọc data (không cần signer)
- ✅ SEO-friendly (server-side rendering)
- ✅ Không cần browser APIs

### **Client Components (Có 'use client')**

```typescript
// components/LendModal.tsx (Client Component)
'use client';  // ← Báo Next.js: code này chạy ở BROWSER

export function LendModal() {
  const handleLend = async () => {
    // Chạy ở BROWSER
    const signer = await provider.getSigner();  // ← MetaMask
    await lend(signer, tokenAddress, amount);
  };
  
  return <button onClick={handleLend}>Lend</button>;
}
```

**Dùng cho:**
- ✅ Transactions (cần MetaMask)
- ✅ User interactions (onClick, onChange)
- ✅ Browser APIs (localStorage, window, etc.)

## 📊 So Sánh: Server-Side vs Client-Side

| Aspect | Server-Side | Client-Side |
|--------|------------|-------------|
| **Chạy ở đâu** | Node.js server | Browser |
| **Có MetaMask?** | ❌ Không | ✅ Có |
| **Có window.ethereum?** | ❌ Không | ✅ Có |
| **Có private key?** | ❌ Không (hoặc nguy hiểm) | ✅ Có (MetaMask) |
| **Transactions** | ❌ Không thể | ✅ Có thể |
| **Read data** | ✅ Có thể | ✅ Có thể |
| **User approve** | ❌ Không thể | ✅ Có thể |

## 🎯 Kết Luận

### **Tại Sao Transactions Phải Ở Client-Side:**

1. ✅ **Cần MetaMask** (chỉ có ở browser)
2. ✅ **Cần private key** (chỉ có ở MetaMask/browser)
3. ✅ **User phải approve** (chỉ có ở browser)
4. ✅ **DeFi pattern** (user tự control, không trust server)
5. ✅ **Bảo mật** (private key không ở server)

### **Next.js Vẫn Có Server-Side Cho:**

1. ✅ **Read operations** (đọc data từ blockchain)
2. ✅ **API routes** (caching, rate limiting)
3. ✅ **Server Components** (SEO, performance)

### **Nhưng Transactions PHẢI Ở Client-Side!**

**Tóm lại:**
- Next.js có thể chạy code ở **cả server và client**
- **Read operations** có thể qua server (API routes)
- **Write operations (transactions)** PHẢI ở client vì cần MetaMask
- Đây là **best practice** cho DeFi applications





