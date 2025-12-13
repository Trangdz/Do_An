# 🔒 Cơ Chế Bảo Mật RPC Frontend → Blockchain

## 📋 Tổng Quan

**Quan trọng:** Khi frontend gửi transaction, nó đã được ví (MetaMask, WalletConnect, etc.) **ký (sign)** trước khi gửi đến RPC. RPC không thể thay đổi transaction đã ký, nhưng vẫn có các rủi ro bảo mật khác.

Tài liệu này phân tích:
1. **Read Operations (view/call)**: Đọc data từ blockchain → Cần validate response
2. **Write Operations (transactions)**: Đã được ví ký → Cần verify transaction hash và receipt

---

## 🔴 Vấn Đề Hiện Tại

### ⚠️ Lưu Ý Quan Trọng: Transaction Đã Được Ví Ký

**Flow hiện tại:**
```
1. User click "Lend" → Frontend tạo transaction
2. Frontend gọi signer.sendTransaction() → Ví (MetaMask) ký transaction
3. Ví gửi transaction đã ký đến RPC
4. RPC broadcast transaction lên blockchain
```

**Điều này có nghĩa:**
- ✅ **RPC KHÔNG THỂ thay đổi transaction đã ký** (signature đã được tạo bởi ví)
- ✅ **RPC KHÔNG THỂ giả mạo transaction** (cần private key của user)
- ❌ **NHƯNG RPC CÓ THỂ:**
  - Drop transaction (không broadcast)
  - Trả về transaction hash giả
  - Trả về receipt sai
  - Censor transactions (chặn một số transactions)

### 1. RPC Endpoint Không Được Validate (Read Operations)

**Code hiện tại:**
```typescript
// lendhub-frontend-nextjs/src/context/LendState.js
const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
```

**Vấn đề với READ operations:**
- ✅ RPC URL hardcoded hoặc từ config → có thể bị thay đổi
- ❌ Không validate RPC endpoint có phải là node hợp lệ không
- ❌ Không kiểm tra RPC có bị compromise không
- ❌ Không có fallback RPC nếu primary RPC fail

**Rủi ro với READ:**
- **Man-in-the-Middle Attack:** Attacker có thể chặn và thay đổi RPC response
- **Malicious RPC:** RPC node có thể trả về data sai:
  - Balance giả → User thấy số tiền sai
  - Price giả → User tính toán sai
  - Contract state sai → User quyết định sai
- **Single Point of Failure:** Nếu RPC down, toàn bộ app không hoạt động

### 2. Transaction Verification (Write Operations)

**Code hiện tại:**
```typescript
// lendhub-frontend-nextjs/src/lib/tx.ts
// Pre-flight simulate to get explicit revert reason
try {
  await poolContract.getFunction("lend").staticCall(tokenAddress, amount);
} catch (err: any) {
  // Handle error...
}
```

**Điểm tốt:**
- ✅ Có `staticCall` để simulate transaction trước
- ✅ Có validate contract code tồn tại
- ✅ Transaction đã được ví ký → RPC không thể thay đổi

**Thiếu sót với WRITE:**
- ❌ Không verify transaction hash sau khi gửi
- ❌ Không verify receipt có hợp lệ không
- ❌ Không detect nếu RPC drop transaction
- ❌ Không có mechanism để retry nếu transaction bị drop

### 3. Không Có Rate Limiting

**Vấn đề:**
- ❌ Frontend có thể spam RPC với nhiều requests
- ❌ Không có throttling cho read operations
- ❌ Có thể bị DDoS nếu RPC public

**Rủi ro:**
- RPC node có thể bị quá tải
- User có thể bị rate limit bởi RPC provider
- Chi phí RPC có thể tăng cao

### 4. Không Có Response Validation

**Vấn đề:**
- ❌ Không verify RPC response có hợp lệ không
- ❌ Không check response format
- ❌ Không validate data consistency

**Ví dụ:**
```typescript
// ❌ Không validate response
const balance = await tokenContract.balanceOf(userAddress);
// Nếu RPC trả về balance sai → User thấy số tiền sai
```

---

## ✅ Giải Pháp Đề Xuất

### 1. RPC Endpoint Validation và Fallback

**File: `lendhub-frontend-nextjs/src/lib/rpcSecurity.ts`**

```typescript
import { ethers } from 'ethers';

interface RPCConfig {
  primary: string;
  fallbacks: string[];
  timeout: number;
  retries: number;
}

class SecureRPCProvider {
  private config: RPCConfig;
  private providers: ethers.JsonRpcProvider[] = [];
  
  constructor(config: RPCConfig) {
    this.config = config;
    
    // ✅ Tạo providers cho tất cả RPC endpoints
    this.providers = [
      new ethers.JsonRpcProvider(config.primary, undefined, { staticNetwork: true }),
      ...config.fallbacks.map(url => 
        new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true })
      )
    ];
  }
  
  /**
   * ✅ Validate RPC endpoint bằng cách:
   * 1. Check network chainId
   * 2. Check latest block number
   * 3. Check RPC response time
   */
  async validateRPC(provider: ethers.JsonRpcProvider): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // ✅ Check 1: Network chainId
      const network = await provider.getNetwork();
      const expectedChainId = BigInt(CONFIG.CHAIN_ID);
      if (network.chainId !== expectedChainId) {
        console.warn(`⚠️ RPC chainId mismatch: ${network.chainId} != ${expectedChainId}`);
        return false;
      }
      
      // ✅ Check 2: Latest block number (should be recent)
      const blockNumber = await provider.getBlockNumber();
      const currentTime = Date.now();
      const block = await provider.getBlock(blockNumber);
      
      if (block && block.timestamp) {
        const blockAge = currentTime - (Number(block.timestamp) * 1000);
        // Block should be < 5 minutes old (for mainnet) or < 1 minute (for testnet)
        const maxAge = CONFIG.CHAIN_ID === 1 ? 5 * 60 * 1000 : 60 * 1000;
        if (blockAge > maxAge) {
          console.warn(`⚠️ RPC block is stale: ${blockAge}ms old`);
          return false;
        }
      }
      
      // ✅ Check 3: Response time (should be < 2 seconds)
      const responseTime = Date.now() - startTime;
      if (responseTime > 2000) {
        console.warn(`⚠️ RPC response time too slow: ${responseTime}ms`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ RPC validation failed:', error);
      return false;
    }
  }
  
  /**
   * ✅ Get provider với fallback mechanism
   */
  async getProvider(): Promise<ethers.JsonRpcProvider> {
    // Try primary RPC first
    if (await this.validateRPC(this.providers[0])) {
      return this.providers[0];
    }
    
    // Try fallback RPCs
    for (let i = 1; i < this.providers.length; i++) {
      if (await this.validateRPC(this.providers[i])) {
        console.log(`✅ Using fallback RPC ${i}: ${this.config.fallbacks[i - 1]}`);
        return this.providers[i];
      }
    }
    
    throw new Error('All RPC endpoints are unavailable');
  }
}

// ✅ Export singleton instance
const rpcConfig: RPCConfig = {
  primary: CONFIG.RPC_URL || 'http://127.0.0.1:7545',
  fallbacks: [
    // Add fallback RPCs (Infura, Alchemy, etc.)
    process.env.NEXT_PUBLIC_RPC_FALLBACK_1,
    process.env.NEXT_PUBLIC_RPC_FALLBACK_2,
  ].filter(Boolean) as string[],
  timeout: 5000,
  retries: 3,
};

export const secureRPC = new SecureRPCProvider(rpcConfig);
```

**Sử dụng:**
```typescript
// Thay vì:
const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

// Dùng:
const rpcProvider = await secureRPC.getProvider();
```

---

### 2. Transaction Parameter Validation

**File: `lendhub-frontend-nextjs/src/lib/txSecurity.ts`**

```typescript
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';

interface TransactionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ✅ Validate transaction parameters trước khi sign
 */
export async function validateTransaction(
  signer: ethers.Signer,
  contractAddress: string,
  functionName: string,
  params: any[]
): Promise<TransactionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // ✅ Check 1: Contract address is valid
    if (!ethers.isAddress(contractAddress)) {
      errors.push(`Invalid contract address: ${contractAddress}`);
    }
    
    // ✅ Check 2: Contract exists on chain
    const provider = signer.provider;
    if (provider) {
      const code = await provider.getCode(contractAddress);
      if (!code || code === '0x') {
        errors.push(`Contract does not exist at ${contractAddress}`);
      }
    }
    
    // ✅ Check 3: Validate function-specific parameters
    if (functionName === 'lend' || functionName === 'withdraw') {
      const [asset, amount] = params;
      
      // Validate asset address
      if (!ethers.isAddress(asset)) {
        errors.push(`Invalid asset address: ${asset}`);
      }
      
      // Validate amount
      if (!amount || amount <= 0n) {
        errors.push('Amount must be greater than 0');
      }
      
      // Check amount is reasonable (not exceeding max uint128)
      const MAX_UINT128 = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
      if (amount > MAX_UINT128) {
        errors.push('Amount exceeds maximum allowed value');
      }
    }
    
    // ✅ Check 4: Verify contract is in CONFIG (whitelist)
    const isWhitelisted = 
      contractAddress.toLowerCase() === CONFIG.LENDING_POOL.toLowerCase() ||
      contractAddress.toLowerCase() === CONFIG.PRICE_ORACLE.toLowerCase() ||
      CONFIG.TOKENS.some(t => t.address.toLowerCase() === contractAddress.toLowerCase());
    
    if (!isWhitelisted) {
      warnings.push(`Contract ${contractAddress} is not in whitelist. Proceed with caution.`);
    }
    
    // ✅ Check 5: Network validation
    if (provider) {
      const network = await provider.getNetwork();
      const expectedChainId = BigInt(CONFIG.CHAIN_ID);
      if (network.chainId !== expectedChainId) {
        errors.push(`Wrong network: ${network.chainId} != ${expectedChainId}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error.message}`],
      warnings: [],
    };
  }
}

/**
 * ✅ Verify transaction hash sau khi gửi
 */
export async function verifyTransaction(
  provider: ethers.Provider,
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedValue: bigint
): Promise<boolean> {
  try {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.error('❌ Transaction not found:', txHash);
      return false;
    }
    
    // ✅ Verify sender
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      console.error('❌ Transaction sender mismatch');
      return false;
    }
    
    // ✅ Verify recipient
    if (tx.to && tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
      console.error('❌ Transaction recipient mismatch');
      return false;
    }
    
    // ✅ Verify value
    if (tx.value !== expectedValue) {
      console.error('❌ Transaction value mismatch');
      return false;
    }
    
    // ✅ Wait for confirmation
    const receipt = await tx.wait();
    if (receipt.status !== 1) {
      console.error('❌ Transaction failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Transaction verification failed:', error);
    return false;
  }
}
```

**Sử dụng:**
```typescript
// Trước khi gửi transaction
const validation = await validateTransaction(
  signer,
  CONFIG.LENDING_POOL,
  'lend',
  [tokenAddress, amount]
);

if (!validation.isValid) {
  throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
}

if (validation.warnings.length > 0) {
  console.warn('⚠️ Warnings:', validation.warnings);
}

// Sau khi gửi transaction
const tx = await poolContract.lend(tokenAddress, amount);
const isValid = await verifyTransaction(
  provider,
  tx.hash,
  userAddress,
  CONFIG.LENDING_POOL,
  0n
);
```

---

### 3. Rate Limiting và Request Throttling

**File: `lendhub-frontend-nextjs/src/lib/rateLimiter.ts`**

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * ✅ Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }
  
  /**
   * ✅ Wait if rate limit exceeded
   */
  async waitIfNeeded(key: string): Promise<void> {
    if (!this.isAllowed(key)) {
      const waitTime = this.windowMs;
      console.warn(`⚠️ Rate limit exceeded for ${key}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// ✅ Singleton instances for different operation types
export const readRateLimiter = new RateLimiter(20, 1000); // 20 reads/second
export const writeRateLimiter = new RateLimiter(5, 1000);  // 5 writes/second

/**
 * ✅ Wrapper for RPC calls with rate limiting
 */
export async function rateLimitedCall<T>(
  limiter: RateLimiter,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  await limiter.waitIfNeeded(key);
  return await fn();
}
```

**Sử dụng:**
```typescript
// Read operations
const balance = await rateLimitedCall(
  readRateLimiter,
  `balance:${userAddress}:${tokenAddress}`,
  () => tokenContract.balanceOf(userAddress)
);

// Write operations
const tx = await rateLimitedCall(
  writeRateLimiter,
  `lend:${userAddress}`,
  () => poolContract.lend(tokenAddress, amount)
);
```

---

### 4. Response Validation và Data Consistency

**File: `lendhub-frontend-nextjs/src/lib/responseValidator.ts`**

```typescript
/**
 * ✅ Validate RPC response format
 */
export function validateResponse<T>(response: any, expectedType: string): T {
  if (response === null || response === undefined) {
    throw new Error(`Response is null or undefined`);
  }
  
  // Type-specific validation
  switch (expectedType) {
    case 'bigint':
      if (typeof response !== 'bigint' && typeof response !== 'string' && typeof response !== 'number') {
        throw new Error(`Invalid bigint response: ${typeof response}`);
      }
      return BigInt(response) as T;
      
    case 'address':
      if (!ethers.isAddress(response)) {
        throw new Error(`Invalid address response: ${response}`);
      }
      return response as T;
      
    case 'number':
      const num = Number(response);
      if (isNaN(num) || !isFinite(num)) {
        throw new Error(`Invalid number response: ${response}`);
      }
      return num as T;
      
    default:
      return response as T;
  }
}

/**
 * ✅ Cross-validate data từ multiple sources
 */
export async function crossValidateBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  userAddress: string
): Promise<bigint> {
  // ✅ Get balance from multiple sources
  const [balance1, balance2] = await Promise.all([
    // Source 1: Direct contract call
    (async () => {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return await tokenContract.balanceOf(userAddress);
    })(),
    
    // Source 2: RPC eth_call
    (async () => {
      const data = ethers.Interface.from(ERC20_ABI).encodeFunctionData('balanceOf', [userAddress]);
      const result = await provider.call({
        to: tokenAddress,
        data: data,
      });
      return BigInt(result);
    })(),
  ]);
  
  // ✅ Validate consistency
  if (balance1 !== balance2) {
    console.error('❌ Balance mismatch between sources:', {
      source1: balance1.toString(),
      source2: balance2.toString(),
    });
    throw new Error('Balance validation failed: data inconsistency');
  }
  
  return balance1;
}

/**
 * ✅ Validate price data từ oracle
 */
export async function validatePrice(
  provider: ethers.Provider,
  oracleAddress: string,
  assetAddress: string,
  expectedRange?: { min: number; max: number }
): Promise<bigint> {
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
  const price = await oracle.getAssetPrice1e18(assetAddress);
  
  // ✅ Validate price is positive
  if (price <= 0n) {
    throw new Error(`Invalid price: ${price.toString()}`);
  }
  
  // ✅ Validate price is within expected range
  if (expectedRange) {
    const priceNum = Number(ethers.formatUnits(price, 18));
    if (priceNum < expectedRange.min || priceNum > expectedRange.max) {
      console.warn(`⚠️ Price out of expected range: ${priceNum} (expected: ${expectedRange.min}-${expectedRange.max})`);
    }
  }
  
  return price;
}
```

---

### 5. Transaction Nonce Management

**File: `lendhub-frontend-nextjs/src/lib/nonceManager.ts`**

```typescript
class NonceManager {
  private nonces: Map<string, number> = new Map();
  
  /**
   * ✅ Get next nonce for address
   */
  async getNextNonce(provider: ethers.Provider, address: string): Promise<number> {
    // Get on-chain nonce
    const onChainNonce = await provider.getTransactionCount(address, 'pending');
    
    // Get cached nonce
    const cachedNonce = this.nonces.get(address) || 0;
    
    // Use max of both to avoid nonce conflicts
    const nextNonce = Math.max(onChainNonce, cachedNonce);
    
    // Update cache
    this.nonces.set(address, nextNonce + 1);
    
    return nextNonce;
  }
  
  /**
   * ✅ Reset nonce cache (call after transaction confirmed)
   */
  resetNonce(address: string) {
    this.nonces.delete(address);
  }
}

export const nonceManager = new NonceManager();
```

**Sử dụng:**
```typescript
// Get nonce before sending transaction
const nonce = await nonceManager.getNextNonce(provider, userAddress);

// Send transaction with explicit nonce
const tx = await poolContract.lend(tokenAddress, amount, { nonce });

// Reset nonce after confirmation
await tx.wait();
nonceManager.resetNonce(userAddress);
```

---

## 📊 Tóm Tắt: Các Cơ Chế Bảo Mật Cần Triển Khai

### ✅ **Bắt Buộc (Critical)**

1. **RPC Endpoint Validation**
   - ✅ Validate chainId
   - ✅ Validate block freshness
   - ✅ Fallback RPC mechanism

2. **Transaction Parameter Validation**
   - ✅ Validate addresses
   - ✅ Validate amounts
   - ✅ Whitelist contracts

3. **Response Validation**
   - ✅ Validate response format
   - ✅ Cross-validate data
   - ✅ Check data consistency

### ⚠️ **Nên Có (Recommended)**

4. **Rate Limiting**
   - ✅ Throttle read operations
   - ✅ Limit write operations
   - ✅ Prevent DDoS

5. **Nonce Management**
   - ✅ Prevent replay attacks
   - ✅ Handle concurrent transactions
   - ✅ Cache nonce properly

### 💡 **Tùy Chọn (Optional)**

6. **Transaction Monitoring**
   - ✅ Log all transactions
   - ✅ Alert on suspicious activity
   - ✅ Track transaction history

7. **Error Handling**
   - ✅ Graceful degradation
   - ✅ User-friendly error messages
   - ✅ Retry mechanism

---

## 🎯 Kết Luận

**Câu trả lời:** **CÓ**, dự án cần triển khai thêm các cơ chế bảo mật khi gửi yêu cầu từ frontend đến RPC.

**Lý do:**
1. **RPC có thể bị compromise** → Cần validate endpoint
2. **Transaction có thể bị giả mạo** → Cần verify parameters
3. **Response có thể bị thay đổi** → Cần validate data
4. **Có thể bị DDoS** → Cần rate limiting

**Ưu tiên triển khai:**
1. ✅ RPC endpoint validation và fallback (Critical)
2. ✅ Transaction parameter validation (Critical)
3. ✅ Response validation (Critical)
4. ⚠️ Rate limiting (Recommended)
5. ⚠️ Nonce management (Recommended)

