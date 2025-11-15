# ĐỀ XUẤT GIAO DIỆN CẤU HÌNH (ADMIN PANEL)

## 1. TẠI SAO CẦN GIAO DIỆN CẤU HÌNH?

### 1.1. Vấn Đề Hiện Tại

Hiện tại, để cấu hình hệ thống, Owner phải:
- ✅ Sử dụng Hardhat scripts (`deploy_ganache_simple.cjs`)
- ✅ Gọi trực tiếp smart contract functions qua console/script
- ❌ **Không có giao diện trực quan** để quản lý
- ❌ **Khó khăn** khi cần cập nhật tham số nhanh
- ❌ **Không an toàn** nếu phải share private key cho scripts

### 1.2. Lợi Ích Của Giao Diện Admin

- ✅ **Dễ sử dụng**: Giao diện trực quan, không cần viết code
- ✅ **An toàn hơn**: Sử dụng MetaMask, không cần expose private key
- ✅ **Nhanh chóng**: Cập nhật tham số ngay lập tức
- ✅ **Minh bạch**: Xem trạng thái hệ thống real-time
- ✅ **Kiểm soát tốt**: Pause/unpause hệ thống trong trường hợp khẩn cấp

---

## 2. CÁC CHỨC NĂNG CẦN CÓ

### 2.1. Quản Lý Reserves (Tài Sản)

#### 2.1.1. Thêm Reserve Mới
**Function:** `initReserve()`

**Giao diện cần có:**
```
┌─────────────────────────────────────────┐
│  Thêm Tài Sản Mới                       │
├─────────────────────────────────────────┤
│  Token Address: [________________]       │
│  Token Symbol:  [WETH/DAI/USDC/LINK]    │
│  Decimals:      [18]                     │
│                                          │
│  Tham Số Rủi Ro:                        │
│  - LTV:                  [75] %          │
│  - Liquidation Threshold: [80] %         │
│  - Reserve Factor:        [10] %         │
│  - Liquidation Bonus:     [5] %          │
│  - Close Factor:          [50] %         │
│                                          │
│  Tham Số Lãi Suất:                      │
│  - Optimal Utilization:  [80] %         │
│  - Base Rate (APR):       [0.1] %        │
│  - Slope 1 (APR):         [0.2] %        │
│  - Slope 2 (APR):         [1.0] %        │
│                                          │
│  Cấu Hình:                               │
│  ☑ Cho phép vay (Borrowable)             │
│                                          │
│  [Hủy]  [Thêm Tài Sản]                  │
└─────────────────────────────────────────┘
```

**Validation:**
- Kiểm tra token address hợp lệ
- Kiểm tra token chưa được thêm vào hệ thống
- Kiểm tra tham số trong phạm vi hợp lệ (0-100%)

#### 2.1.2. Xem Danh Sách Reserves
**Hiển thị:**
- Tất cả reserves đã được khởi tạo
- Thông tin: Symbol, Address, LTV, Liquidation Threshold, Reserve Factor
- Trạng thái: Borrowable, Paused
- Số liệu: Total Supply, Total Borrow, Utilization Rate, APY

#### 2.1.3. Cập Nhật Tham Số Reserve
**Function:** `setReserveBorrowable()`

**Giao diện:**
- Toggle "Cho phép vay" cho từng asset
- Hiển thị cảnh báo nếu có người dùng đang vay asset đó

**Lưu ý:** Hiện tại contract chỉ có `setReserveBorrowable()`, các tham số khác (LTV, liquidation threshold) không thể cập nhật sau khi init. Có thể đề xuất thêm functions:
- `updateReserveParams()` - Cập nhật LTV, liquidation threshold (với timelock)
- `updateInterestRateParams()` - Cập nhật tham số lãi suất

### 2.2. Quản Lý Oracle (Giá Tài Sản)

#### 2.2.1. Cấu Hình Token Symbol
**Function:** `setTokenSymbol()` trong MultiPriceAggregator

**Giao diện:**
```
┌─────────────────────────────────────────┐
│  Cấu Hình Token Symbol                  │
├─────────────────────────────────────────┤
│  Token Address: [________________]      │
│  Symbol:        [WETH]                  │
│                                          │
│  [Hủy]  [Lưu Cấu Hình]                  │
└─────────────────────────────────────────┘
```

#### 2.2.2. Cấu Hình Chainlink Writer
**Function:** `setWriter()` trong MultiPriceAggregator

**Giao diện:**
- Hiển thị writer hiện tại
- Cho phép set writer mới (Chainlink node address)
- Cảnh báo nếu writer = address(0) (không có writer)

#### 2.2.3. Xem Giá Hiện Tại
**Function:** `getPrice()`, `getAssetPrice1e18()`

**Hiển thị:**
- Bảng giá tất cả assets
- Giá USD, Round ID, Thời gian cập nhật
- Cảnh báo nếu giá cũ (staleness check)

### 2.3. Quản Lý Hệ Thống

#### 2.3.1. Pause/Unpause Hệ Thống
**Functions:** `pause()`, `unpause()`

**Giao diện:**
```
┌─────────────────────────────────────────┐
│  Trạng Thái Hệ Thống                    │
├─────────────────────────────────────────┤
│  Trạng thái:  🟢 Đang hoạt động          │
│                                          │
│  [⏸️ Tạm Dừng Hệ Thống]                  │
│                                          │
│  ⚠️ Cảnh báo:                            │
│  - Tạm dừng sẽ chặn tất cả giao dịch    │
│  - Chỉ cho phép withdraw và repay       │
│  - Cần xác nhận từ MetaMask             │
└─────────────────────────────────────────┘
```

**Khi Paused:**
- Hiển thị banner cảnh báo trên tất cả pages
- Disable buttons: Supply, Borrow
- Cho phép: Withdraw, Repay (để user có thể thoát khỏi vị thế)

#### 2.3.2. Xem Thông Tin Owner
**Hiển thị:**
- Owner address hiện tại
- Số dư ETH của owner
- Lịch sử các thay đổi cấu hình

### 2.4. Dashboard Tổng Quan

**Hiển thị:**
- Tổng số reserves
- Tổng TVL (Total Value Locked)
- Tổng nợ (Total Debt)
- Utilization rate trung bình
- Số lượng người dùng
- Trạng thái hệ thống (Active/Paused)

---

## 3. THIẾT KẾ GIAO DIỆN

### 3.1. Cấu Trúc Trang

```
/admin
├── /dashboard          (Tổng quan)
├── /reserves           (Quản lý reserves)
│   ├── /add            (Thêm reserve mới)
│   └── /[address]      (Chi tiết reserve)
├── /oracle             (Quản lý oracle)
│   ├── /tokens         (Cấu hình token symbols)
│   └── /prices         (Xem giá hiện tại)
└── /system             (Quản lý hệ thống)
    ├── /pause          (Pause/Unpause)
    └── /settings       (Cài đặt)
```

### 3.2. Access Control

**Kiểm tra Owner:**
```typescript
// Hook: useIsOwner.ts
export function useIsOwner() {
  const { account } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOwner() {
      if (!account) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const pool = new ethers.Contract(
          CONFIG.LENDING_POOL,
          LENDING_POOL_ABI,
          provider
        );
        const owner = await pool.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error('Error checking owner:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }

    checkOwner();
  }, [account]);

  return { isOwner, loading };
}
```

**Protect Route:**
```typescript
// components/admin/AdminRoute.tsx
export function AdminRoute({ children }) {
  const { isOwner, loading } = useIsOwner();
  const router = useRouter();

  if (loading) {
    return <Loading />;
  }

  if (!isOwner) {
    router.push('/');
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
}
```

### 3.3. Components Cần Tạo

1. **AdminLayout.tsx** - Layout cho admin pages
2. **AdminDashboard.tsx** - Dashboard tổng quan
3. **ReserveList.tsx** - Danh sách reserves
4. **AddReserveModal.tsx** - Modal thêm reserve mới
5. **ReserveDetail.tsx** - Chi tiết reserve
6. **OracleConfig.tsx** - Cấu hình oracle
7. **PriceTable.tsx** - Bảng giá
8. **SystemControl.tsx** - Pause/Unpause
9. **OwnerInfo.tsx** - Thông tin owner

---

## 4. IMPLEMENTATION PLAN

### 4.1. Phase 1: Basic Admin (Ưu tiên cao)

**Thời gian:** 1-2 tuần

**Chức năng:**
- ✅ Access control (check owner)
- ✅ Admin dashboard (tổng quan)
- ✅ Pause/Unpause hệ thống
- ✅ Xem danh sách reserves
- ✅ Xem giá oracle

**Files cần tạo:**
```
lendhub-frontend-nextjs/src/
├── app/admin/
│   ├── layout.tsx
│   ├── page.tsx (dashboard)
│   ├── reserves/
│   │   └── page.tsx
│   ├── oracle/
│   │   └── page.tsx
│   └── system/
│       └── page.tsx
├── components/admin/
│   ├── AdminLayout.tsx
│   ├── AdminDashboard.tsx
│   ├── ReserveList.tsx
│   ├── OracleConfig.tsx
│   ├── SystemControl.tsx
│   └── OwnerGuard.tsx
└── hooks/
    └── useIsOwner.ts
```

### 4.2. Phase 2: Reserve Management (Ưu tiên trung bình)

**Thời gian:** 1 tuần

**Chức năng:**
- ✅ Thêm reserve mới (initReserve)
- ✅ Toggle borrowable (setReserveBorrowable)
- ✅ Chi tiết reserve (thông tin, số liệu)

**Files cần tạo:**
```
components/admin/
├── AddReserveModal.tsx
├── ReserveDetail.tsx
└── ReserveForm.tsx
```

### 4.3. Phase 3: Advanced Features (Ưu tiên thấp)

**Thời gian:** 1-2 tuần

**Chức năng:**
- ✅ Cấu hình token symbols
- ✅ Set Chainlink writer
- ✅ Lịch sử thay đổi cấu hình
- ✅ Analytics cho admin

---

## 5. CODE SAMPLES

### 5.1. Hook: useIsOwner

```typescript
// hooks/useIsOwner.ts
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/context/useWeb3';
import { CONFIG } from '@/config/contracts';
import LENDING_POOL_ABI from '@/abis/LendingPool.json';

export function useIsOwner() {
  const { account, provider } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOwner() {
      if (!account || !provider) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const pool = new ethers.Contract(
          CONFIG.LENDING_POOL,
          LENDING_POOL_ABI,
          provider
        );
        const owner = await pool.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error('Error checking owner:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }

    checkOwner();
  }, [account, provider]);

  return { isOwner, loading };
}
```

### 5.2. Component: SystemControl

```typescript
// components/admin/SystemControl.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/context/useWeb3';
import { CONFIG } from '@/config/contracts';
import LENDING_POOL_ABI from '@/abis/LendingPool.json';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';

export function SystemControl() {
  const { account, signer } = useWeb3();
  const [paused, setPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Check paused status
  useEffect(() => {
    async function checkPaused() {
      if (!account) return;
      try {
        const pool = new ethers.Contract(
          CONFIG.LENDING_POOL,
          LENDING_POOL_ABI,
          provider
        );
        const isPaused = await pool.paused();
        setPaused(isPaused);
      } catch (error) {
        console.error('Error checking paused status:', error);
      }
    }
    checkPaused();
  }, [account]);

  async function handlePause() {
    if (!signer) {
      toast.error('Please connect wallet');
      return;
    }

    if (!confirm('Are you sure you want to PAUSE the system? This will block all Supply and Borrow operations.')) {
      return;
    }

    setLoading(true);
    try {
      const pool = new ethers.Contract(
        CONFIG.LENDING_POOL,
        LENDING_POOL_ABI,
        signer
      );
      const tx = await pool.pause();
      await tx.wait();
      setPaused(true);
      toast.success('System paused successfully');
    } catch (error: any) {
      console.error('Error pausing system:', error);
      toast.error(error.message || 'Failed to pause system');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpause() {
    if (!signer) {
      toast.error('Please connect wallet');
      return;
    }

    setLoading(true);
    try {
      const pool = new ethers.Contract(
        CONFIG.LENDING_POOL,
        LENDING_POOL_ABI,
        signer
      );
      const tx = await pool.unpause();
      await tx.wait();
      setPaused(false);
      toast.success('System unpaused successfully');
    } catch (error: any) {
      console.error('Error unpausing system:', error);
      toast.error(error.message || 'Failed to unpause system');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4">System Control</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">System Status:</p>
          <div className="flex items-center gap-2">
            {paused === null ? (
              <span className="text-gray-400">Loading...</span>
            ) : paused ? (
              <>
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="font-semibold text-red-600">PAUSED</span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="font-semibold text-green-600">ACTIVE</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {paused ? (
            <Button
              onClick={handleUnpause}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Unpausing...' : 'Unpause System'}
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Pausing...' : 'Pause System'}
            </Button>
          )}
        </div>

        {paused && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ System is paused. Users can only withdraw and repay. Supply and borrow are blocked.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
```

### 5.3. Component: AddReserveModal

```typescript
// components/admin/AddReserveModal.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/context/useWeb3';
import { CONFIG } from '@/config/contracts';
import LENDING_POOL_ABI from '@/abis/LendingPool.json';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from '@/components/ui/Toast';

interface AddReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddReserveModal({ isOpen, onClose, onSuccess }: AddReserveModalProps) {
  const { signer } = useWeb3();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [assetAddress, setAssetAddress] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [reserveFactorBps, setReserveFactorBps] = useState('1000'); // 10%
  const [ltvBps, setLtvBps] = useState('7500'); // 75%
  const [liqThresholdBps, setLiqThresholdBps] = useState('8000'); // 80%
  const [liqBonusBps, setLiqBonusBps] = useState('500'); // 5%
  const [closeFactorBps, setCloseFactorBps] = useState('5000'); // 50%
  const [isBorrowable, setIsBorrowable] = useState(true);
  const [optimalUBps, setOptimalUBps] = useState('8000'); // 80%
  const [baseRate, setBaseRate] = useState('10000000000000000'); // 0.1% APR in Ray
  const [slope1, setSlope1] = useState('20000000000000000'); // 0.2% APR in Ray
  const [slope2, setSlope2] = useState('100000000000000000'); // 1.0% APR in Ray

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!signer) {
      toast.error('Please connect wallet');
      return;
    }

    // Validation
    if (!ethers.isAddress(assetAddress)) {
      toast.error('Invalid token address');
      return;
    }

    setLoading(true);
    try {
      const pool = new ethers.Contract(
        CONFIG.LENDING_POOL,
        LENDING_POOL_ABI,
        signer
      );

      const tx = await pool.initReserve(
        assetAddress,
        parseInt(decimals),
        parseInt(reserveFactorBps),
        parseInt(ltvBps),
        parseInt(liqThresholdBps),
        parseInt(liqBonusBps),
        parseInt(closeFactorBps),
        isBorrowable,
        parseInt(optimalUBps),
        baseRate,
        slope1,
        slope2
      );

      await tx.wait();
      toast.success('Reserve added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding reserve:', error);
      toast.error(error.message || 'Failed to add reserve');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Add New Reserve</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Address */}
          <div>
            <Label>Token Address</Label>
            <Input
              value={assetAddress}
              onChange={(e) => setAssetAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          {/* Decimals */}
          <div>
            <Label>Decimals</Label>
            <Input
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              min="0"
              max="18"
              required
            />
          </div>

          {/* Risk Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>LTV (%)</Label>
              <Input
                type="number"
                value={parseInt(ltvBps) / 100}
                onChange={(e) => setLtvBps(String(parseInt(e.target.value) * 100))}
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <Label>Liquidation Threshold (%)</Label>
              <Input
                type="number"
                value={parseInt(liqThresholdBps) / 100}
                onChange={(e) => setLiqThresholdBps(String(parseInt(e.target.value) * 100))}
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <Label>Reserve Factor (%)</Label>
              <Input
                type="number"
                value={parseInt(reserveFactorBps) / 100}
                onChange={(e) => setReserveFactorBps(String(parseInt(e.target.value) * 100))}
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <Label>Liquidation Bonus (%)</Label>
              <Input
                type="number"
                value={parseInt(liqBonusBps) / 100}
                onChange={(e) => setLiqBonusBps(String(parseInt(e.target.value) * 100))}
                min="0"
                max="100"
                required
              />
            </div>
          </div>

          {/* Borrowable */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBorrowable"
              checked={isBorrowable}
              onChange={(e) => setIsBorrowable(e.target.checked)}
            />
            <Label htmlFor="isBorrowable">Allow Borrowing</Label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Reserve'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 6. KẾT LUẬN

**CÓ CẦN giao diện cấu hình (Admin Panel)** vì:

1. ✅ **Cải thiện trải nghiệm**: Owner không cần viết code để cấu hình
2. ✅ **An toàn hơn**: Sử dụng MetaMask, không cần expose private key
3. ✅ **Nhanh chóng**: Cập nhật tham số ngay lập tức
4. ✅ **Kiểm soát tốt**: Pause/unpause hệ thống trong trường hợp khẩn cấp
5. ✅ **Minh bạch**: Xem trạng thái hệ thống real-time

**Ưu tiên triển khai:**
- **Phase 1 (Cao)**: Access control, Dashboard, Pause/Unpause, Xem reserves
- **Phase 2 (Trung bình)**: Thêm reserve, Toggle borrowable
- **Phase 3 (Thấp)**: Advanced features, Analytics

---



