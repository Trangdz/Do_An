# 🔍 Debug: Proposal Bonus Không Thay Đổi Sau Khi Execute

## ⚠️ Vấn Đề

Đã tạo proposal để thay đổi liquidation bonus của LINK từ 1% lên 5%, nhưng sau khi execute thì không thay đổi.

## 🔍 Phân Tích Code

### 1. Flow Thực Thi Proposal

**Bước 1: Execute Proposal**
```solidity
// LendHubGovernor.sol - executeProposal()
function executeProposal(uint256 proposalId) external {
    // ...
    _executeProposalActions(proposalId, proposal);
    // ...
}
```

**Bước 2: Parse và Execute Actions**
```solidity
// LendHubGovernor.sol - _executeProposalActions()
function _executeProposalActions(uint256 proposalId, Proposal memory proposal) internal {
    string memory desc = proposal.description;
    address asset = _extractAsset(desc); // ⚠️ Extract asset address
    bool handled = false;
    
    // 3. Change Liquidation Bonus
    else if (_contains(desc, "Proposed Bonus")) {
        uint16 newBonus = _extractProposedLiquidationBonus(desc);
        require(asset != address(0), "LendHubGovernor: asset not found"); // ⚠️ Check asset
        lendingPool.updateLiquidationBonus(asset, newBonus);
        handled = true;
    }
    
    require(handled, "LendHubGovernor: unsupported or invalid proposal description");
}
```

### 2. Extract Asset Address

**Logic trong `_extractAsset()`:**
```solidity
function _extractAsset(string memory desc) internal view returns (address) {
    // 1. Ưu tiên: Tìm "Asset Address: 0x..."
    address extracted = _extractAssetAddress(desc);
    if (extracted != address(0)) {
        return extracted;
    }

    // 2. Fallback: Tìm "Asset Symbol: LINK" và lookup trong mapping
    string memory symbol = _extractAssetSymbol(desc);
    if (bytes(symbol).length == 0) {
        return address(0);
    }

    return assetAddresses[symbol]; // ⚠️ Nếu chưa set → address(0)
}
```

### 3. Extract Proposed Bonus

**Logic trong `_extractProposedLiquidationBonus()`:**
```solidity
function _extractProposedLiquidationBonus(string memory desc) internal pure returns (uint16) {
    bytes memory pattern = bytes("Proposed Bonus (%): ");
    // Tìm pattern và extract số
    // Convert: 5% → 500 bps (5 * 100)
    // Support decimal: 5.5% → 550 bps
    return uint16(num * 100 / (10 ** decimals));
}
```

## ⚠️ Vấn Đề Có Thể

### Vấn Đề 1: Asset Address Chưa Được Set

**Nguyên nhân:**
- `assetAddresses["LINK"]` chưa được set trong Governor contract
- `_extractAsset()` trả về `address(0)`
- `require(asset != address(0))` → Revert!

**Kiểm tra:**
```solidity
// Trong Governor contract
assetAddresses["LINK"] // Nếu = address(0) → Chưa set
```

**Giải pháp:**
- Set asset address trong Governor contract:
```solidity
governor.setAssetAddress("LINK", LINKAddress);
```

### Vấn Đề 2: Format Description Không Đúng

**Contract expect:**
```
Asset Address: 0xCE8F467817A9998A34bc3B5CA8778BbeBA3dED9d
Asset Symbol: LINK
Proposed Bonus (%): 5
```

**Nếu format sai:**
- Thiếu "Asset Address:" → Dùng symbol lookup
- Thiếu "Asset Symbol:" → Không tìm được symbol
- Format "Proposed Bonus" sai → Không parse được

### Vấn Đề 3: Parse Bonus Sai

**Contract logic:**
```solidity
// "Proposed Bonus (%): 5" → 5 * 100 = 500 bps
// "Proposed Bonus (%): 5.5" → 55 * 100 / 10 = 550 bps
```

**Nếu value = "1.00":**
- Parse: num = 100, decimals = 2
- Result: 100 * 100 / 100 = 100 bps (1%) ✅

**Nếu value = "5":**
- Parse: num = 5, decimals = 0
- Result: 5 * 100 / 1 = 500 bps (5%) ✅

### Vấn Đề 4: Transaction Revert Nhưng Không Báo Lỗi

**Có thể:**
- Transaction revert nhưng frontend không hiển thị lỗi chi tiết
- Cần check transaction receipt để xem revert reason

## 🔧 Giải Pháp

### Giải Pháp 1: Set Asset Address trong Governor

**Tạo script để set:**
```javascript
// scripts/set_governor_asset_addresses.cjs
const { ethers } = require('ethers');
const addresses = require('../lendhub-frontend-nextjs/src/addresses.js');

async function setAssetAddresses() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const [deployer] = await provider.listAccounts();
  const signer = await provider.getSigner(deployer);
  
  const governor = new ethers.Contract(
    addresses.GovernorAddress,
    ['function setAssetAddress(string memory symbol, address assetAddress) external'],
    signer
  );
  
  // Set LINK
  const tx1 = await governor.setAssetAddress("LINK", addresses.LINKAddress);
  await tx1.wait();
  console.log('✅ Set LINK address');
  
  // Set các asset khác
  await governor.setAssetAddress("DAI", addresses.DAIAddress);
  await governor.setAssetAddress("USDC", addresses.USDCAddress);
  await governor.setAssetAddress("WETH", addresses.WETHAddress);
  
  console.log('✅ All asset addresses set');
}

setAssetAddresses();
```

### Giải Pháp 2: Kiểm Tra Format Description

**Đảm bảo description có format đúng:**
```
Asset Address: 0xCE8F467817A9998A34bc3B5CA8778BbeBA3dED9d
Asset Symbol: LINK
Proposed Bonus (%): 5
```

**Code trong create.tsx đã đúng (dòng 228-229):**
```typescript
} else if (p.name === 'Proposed Bonus (%)') {
  return `Proposed Bonus (%): ${p.value}`;
}
```

### Giải Pháp 3: Kiểm Tra Transaction Revert

**Thêm error handling tốt hơn:**
```typescript
try {
  const tx = await executeProposal(id);
  await tx.wait();
} catch (error: any) {
  // Parse revert reason
  if (error.reason) {
    console.error('Revert reason:', error.reason);
  }
  if (error.data) {
    console.error('Revert data:', error.data);
  }
}
```

### Giải Pháp 4: Test Parse Logic

**Tạo script test:**
```javascript
// scripts/test_proposal_parse.cjs
// Test parse description để xem có extract đúng không
```

## 🎯 Checklist Debug

- [ ] **Asset address đã set trong Governor?**
  - Check: `governor.assetAddresses("LINK")` != address(0)
  
- [ ] **Description format đúng?**
  - Có "Asset Address: 0x..." hoặc "Asset Symbol: LINK"
  - Có "Proposed Bonus (%): 5"
  
- [ ] **Bonus value đúng?**
  - Value = "5" → Parse = 500 bps (5%)
  - Value = "1.00" → Parse = 100 bps (1%)
  
- [ ] **Transaction có revert không?**
  - Check transaction receipt
  - Xem revert reason
  
- [ ] **LendingPool có được set trong Governor?**
  - Check: `governor.lendingPool()` != address(0)

## 📝 Script Debug

Tôi sẽ tạo script để:
1. Check asset addresses trong Governor
2. Test parse description
3. Set asset addresses nếu chưa có

