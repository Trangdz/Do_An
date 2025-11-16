# Governance On-Chain Architecture

## Tại sao cần lưu Proposals On-Chain?

### ✅ Ưu điểm của On-Chain Governance:

1. **Decentralization (Phi tập trung)**
   - Không phụ thuộc vào server/backend
   - Tất cả users có thể xem proposals từ bất kỳ frontend nào
   - Không thể bị kiểm duyệt hoặc xóa

2. **Transparency (Minh bạch)**
   - Tất cả proposals được lưu vĩnh viễn trên blockchain
   - Có thể verify trên block explorer (Etherscan)
   - Lịch sử không thể thay đổi

3. **Security (Bảo mật)**
   - Proposals được bảo vệ bởi blockchain security
   - Không thể bị hack hoặc thao túng
   - Voting được thực thi tự động bởi smart contract

4. **Interoperability (Tương thích)**
   - Bất kỳ frontend nào cũng có thể đọc proposals
   - Có thể tích hợp với các tools khác (Snapshot, Tally, etc.)

### ❌ Nhược điểm của Off-Chain (localStorage hiện tại):

1. **Chỉ local cho browser**
   - Không share giữa browsers
   - Mất dữ liệu khi clear cache
   - Không thể verify

2. **Không an toàn**
   - Có thể bị thao túng
   - Không có cơ chế bảo vệ

3. **Không phù hợp với DeFi**
   - DeFi cần decentralization
   - Users cần trustless system

## Kiến trúc Hybrid (Như Aave, Compound)

### Cách các dự án lớn làm:

```
┌─────────────────────────────────────────────────┐
│           PROPOSAL CREATION FLOW                 │
└─────────────────────────────────────────────────┘

1. User tạo proposal trên frontend
   ↓
2. Metadata (title, description) → IPFS/Snapshot
   ↓
3. IPFS Hash + Parameters → Smart Contract
   ↓
4. Proposal ID được tạo on-chain
   ↓
5. Users vote on-chain
   ↓
6. Execution tự động nếu proposal pass
```

### Phân chia dữ liệu:

**Off-Chain (IPFS/Snapshot):**
- Title, Description, Motivation (text dài)
- Images, Documents
- Discussion links

**On-Chain (Smart Contract):**
- Proposal ID
- Creator address
- Parameters (LTV, Caps, etc.)
- Voting data (votesFor, votesAgainst)
- State (Created, Active, Executed)
- Execution calldata

## Implementation Plan

### Phase 1: Basic Governance Contract

```solidity
// contracts/governance/LendHubGovernor.sol
contract LendHubGovernor {
    struct Proposal {
        uint256 id;
        address proposer;
        string ipfsHash;  // Link to metadata
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalState state;
        uint256 createdAt;
        uint256 votingEnd;
        bytes[] calldatas;  // Execution data
    }
    
    // Proposals mapping
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    // Voting
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    function createProposal(
        string memory ipfsHash,
        bytes[] memory calldatas
    ) external returns (uint256);
    
    function castVote(uint256 proposalId, bool support) external;
    
    function executeProposal(uint256 proposalId) external;
}
```

### Phase 2: Integration với LendingPool

```solidity
// Proposals có thể thay đổi:
- LTV ratios
- Liquidation thresholds
- Supply/Borrow caps
- Interest rate parameters
- Pause/unpause assets
```

### Phase 3: Frontend Integration

```typescript
// Thay localStorage bằng smart contract calls
const governor = new ethers.Contract(
  GOVERNOR_ADDRESS,
  GOVERNOR_ABI,
  signer
);

// Create proposal
const tx = await governor.createProposal(
  ipfsHash,
  calldatas
);

// Get proposals
const proposalCount = await governor.proposalCount();
const proposals = [];
for (let i = 1; i <= proposalCount; i++) {
  const proposal = await governor.proposals(i);
  proposals.push(proposal);
}
```

## Migration Path từ localStorage → On-Chain

### Step 1: Deploy Governance Contract
```bash
npx hardhat run scripts/deploy_governance.cjs --network ganache
```

### Step 2: Update Frontend
- Thay `addProposal()` → `governor.createProposal()`
- Thay `getAllProposals()` → `governor.getProposals()`
- Thêm IPFS upload cho metadata

### Step 3: Migrate Existing Proposals
- Export proposals từ localStorage
- Upload metadata lên IPFS
- Create proposals on-chain

## Best Practices

1. **Use OpenZeppelin Governor**
   - Đã được audit
   - Battle-tested
   - Tương thích với ERC20Votes

2. **IPFS cho Metadata**
   - Tiết kiệm gas
   - Dễ dàng update
   - Decentralized storage

3. **Timelock cho Execution**
   - Delay trước khi execute
   - Cho phép users review
   - Security best practice

4. **Quorum & Thresholds**
   - Minimum votes required
   - Differential threshold
   - Prevent spam proposals

## Cost Estimation

**Gas costs (approximate):**
- Create Proposal: ~200,000 gas
- Cast Vote: ~50,000 gas
- Execute Proposal: ~100,000 - 500,000 gas (tùy complexity)

**On Mainnet:**
- Create: ~$20-50 (tùy gas price)
- Vote: ~$5-15
- Execute: ~$10-100

## Recommendation

✅ **Nên implement on-chain governance vì:**
1. Phù hợp với DeFi principles
2. Tăng trust và transparency
3. Tương thích với ecosystem tools
4. Long-term sustainability

⚠️ **Hiện tại (Development):**
- Có thể dùng localStorage để test UI/UX
- Nhưng cần migrate sang on-chain trước khi launch

## Next Steps

1. ✅ Design governance contract structure
2. ⏳ Deploy basic Governor contract
3. ⏳ Integrate với LendingPool
4. ⏳ Update frontend to use contracts
5. ⏳ Add IPFS integration
6. ⏳ Test end-to-end flow

