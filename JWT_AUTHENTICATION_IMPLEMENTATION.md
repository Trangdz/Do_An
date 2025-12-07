# Triển Khai JWT Authentication Cho Next.js API Routes

## 📋 Tổng Quan

Hướng dẫn triển khai JWT authentication để bảo mật API routes, đặc biệt cho DeFi app sử dụng MetaMask.

## 🔐 Flow Authentication

```
1. User connect MetaMask
2. Frontend gửi wallet address + signature đến /api/auth/login
3. Backend verify signature (ECDSA)
4. Backend generate JWT token
5. Frontend lưu token
6. Frontend gửi token trong header khi gọi API
7. Backend verify token trước khi trả về data
```

## 📦 Bước 1: Cài Đặt Dependencies

```bash
cd lendhub-frontend-nextjs
npm install jsonwebtoken @types/jsonwebtoken
```

## 🔑 Bước 2: Tạo JWT Helper Functions

**File: `lendhub-frontend-nextjs/src/lib/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days

export interface JWTPayload {
  address: string; // User wallet address
  iat?: number; // Issued at
  exp?: number; // Expiration
}

/**
 * Generate JWT token for user
 */
export function generateToken(address: string): string {
  const payload: JWTPayload = {
    address: address.toLowerCase(), // Normalize address
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}
```

## 🔐 Bước 3: Tạo Authentication Middleware

**File: `lendhub-frontend-nextjs/src/lib/auth.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    address: string;
  };
}

/**
 * Middleware to verify JWT token
 */
export function authenticate(request: NextRequest): {
  success: boolean;
  user?: { address: string };
  error?: string;
  status?: number;
} {
  const authHeader = request.headers.get('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return {
      success: false,
      error: 'No token provided',
      status: 401,
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      success: false,
      error: 'Invalid or expired token',
      status: 401,
    };
  }

  return {
    success: true,
    user: {
      address: decoded.address,
    },
  };
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}
```

## 🔑 Bước 4: Tạo Login API Route

**File: `lendhub-frontend-nextjs/src/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { generateToken } from '@/lib/jwt';

/**
 * POST /api/auth/login
 * 
 * Authenticate user with MetaMask signature
 * 
 * Body:
 * {
 *   address: string, // User wallet address
 *   signature: string, // Signature from MetaMask
 *   message: string // Message that was signed
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, message } = body;

    // Validate input
    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: address, signature, message' },
        { status: 400 }
      );
    }

    // Verify address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Check if recovered address matches provided address
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(address);

    return NextResponse.json({
      success: true,
      token,
      address: address.toLowerCase(),
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🔒 Bước 5: Update Protected API Routes

### **Example 1: `/api/positions/[user]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, unauthorizedResponse } from '@/lib/auth';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'lendhub';

let client: MongoClient | null = null;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(MONGODB_DB);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {
  try {
    // ✅ Authenticate request
    const auth = authenticate(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const { user: userAddress } = await params;
    
    // ✅ Verify user can only access their own data
    if (auth.user!.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only access your own data' },
        { status: 403 }
      );
    }

    // Validate address format
    if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid user address' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const positions = await db.collection('userPositions').findOne({
      user: userAddress.toLowerCase()
    });

    if (!positions) {
      return NextResponse.json(
        { 
          user: userAddress,
          positions: [],
          totalCollateralUSD: 0,
          totalDebtUSD: 0,
          healthFactor: 999999,
          updatedAt: new Date().toISOString(),
          lastUpdateTimestamp: Math.floor(Date.now() / 1000)
        },
        { status: 200 }
      );
    }

    const { _id, ...data } = positions;
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error fetching positions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### **Example 2: `/api/reserve/[asset]/route.ts` (Public API)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ✅ Public API - No authentication required
// Reserve data is public information

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset: string }> }
) {
  try {
    const resolvedParams = await params;
    const assetAddress = resolvedParams.asset;
    
    // ... existing code ...
    
    return NextResponse.json({ ... });
  } catch (error: any) {
    // ... error handling ...
  }
}
```

## 🎨 Bước 6: Update Frontend - Login với MetaMask

**File: `lendhub-frontend-nextjs/src/lib/authClient.ts`**

```typescript
import { ethers } from 'ethers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Login with MetaMask
 */
export async function loginWithMetaMask(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMask is not installed',
      };
    }

    // Get user address
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Create message to sign
    const message = `Please sign this message to authenticate with LendHub.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

    // Request signature from MetaMask
    const signature = await signer.signMessage(message);

    // Send to backend
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        signature,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Login failed',
      };
    }

    // Store token
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_address', data.address);
    }

    return {
      success: true,
      token: data.token,
    };

  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get user address
 */
export function getUserAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_address');
}

/**
 * Logout
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_address');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
```

## 📡 Bước 7: Update Frontend - Gọi API với Token

**File: `lendhub-frontend-nextjs/src/lib/apiClient.ts`**

```typescript
import { getToken } from './authClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch API with authentication
 */
export async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 (Unauthorized) - token expired
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_address');
    // Optionally redirect to login page
    // window.location.href = '/login';
  }

  return response;
}

/**
 * Example: Get user positions
 */
export async function getUserPositions(userAddress: string) {
  const response = await fetchAPI(`/api/positions/${userAddress}`);
  if (!response.ok) {
    throw new Error('Failed to fetch positions');
  }
  return response.json();
}
```

## 🔄 Bước 8: Update Context để Auto Login

**File: `lendhub-frontend-nextjs/src/context/LendState.js`**

```javascript
// Add to LendState component
import { loginWithMetaMask, isAuthenticated } from '../lib/authClient';

const LendState = (props) => {
  // ... existing code ...

  const connectWallet = useCallback(async () => {
    // ... existing MetaMask connection code ...

    // After connecting MetaMask, auto login
    if (accounts.length) {
      const loginResult = await loginWithMetaMask();
      if (loginResult.success) {
        console.log('✅ Auto-logged in with JWT');
      } else {
        console.warn('⚠️ Auto-login failed:', loginResult.error);
      }
    }
  }, []);

  // ... rest of code ...
};
```

## 🛡️ Bước 9: Thêm Rate Limiting

**File: `lendhub-frontend-nextjs/src/lib/rateLimit.ts`**

```typescript
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 minute
});

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100
): { allowed: boolean; remaining: number } {
  const count = rateLimit.get(identifier) || 0;

  if (count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  rateLimit.set(identifier, count + 1);

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
  };
}

/**
 * Rate limit middleware
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  // Use IP address or user address as identifier
  const identifier = request.ip || 
    request.headers.get('x-forwarded-for') || 
    'unknown';

  const result = checkRateLimit(identifier);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        },
      }
    );
  }

  return null;
}
```

## 📋 Bước 10: Environment Variables

**File: `.env.local`**

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lendhub_local
MONGODB_DB=lendhub_local

# RPC
RPC_URL=http://127.0.0.1:7545
```

## 🎯 Sử Dụng

### **1. User Connect MetaMask:**

```typescript
// Auto login after connecting MetaMask
await connectWallet();
// → Auto calls loginWithMetaMask()
// → Token stored in localStorage
```

### **2. Gọi Protected API:**

```typescript
// Frontend automatically includes token in header
const positions = await getUserPositions(userAddress);
// → GET /api/positions/0x...
// → Header: Authorization: Bearer <token>
// → Backend verifies token
// → Returns data
```

### **3. Public API (No Auth):**

```typescript
// Public APIs don't require token
const reserve = await fetch('/api/reserve/0x...');
// → No Authorization header needed
```

## 📊 Phân Loại APIs

### **Public APIs (Không cần auth):**
- `/api/reserve/[asset]` - Public reserve data
- `/api/transactions` - Public transaction history

### **Protected APIs (Cần auth):**
- `/api/positions/[user]` - User-specific data
- `/api/balance/[user]` - User-specific data
- `/api/account-data/[user]` - User-specific data

## ✅ Kết Luận

### **Đã Triển Khai:**

1. ✅ JWT token generation và verification
2. ✅ MetaMask signature authentication
3. ✅ Protected API routes với authentication
4. ✅ Rate limiting
5. ✅ Frontend auto-login

### **Bảo Mật:**

- ✅ JWT token expires sau 7 days
- ✅ Signature verification (ECDSA)
- ✅ User chỉ có thể access data của mình
- ✅ Rate limiting (100 requests/minute)
- ✅ Token stored in localStorage (có thể upgrade to httpOnly cookie)

### **Next Steps:**

1. ✅ Deploy với JWT_SECRET mạnh
2. ✅ Consider httpOnly cookies thay vì localStorage
3. ✅ Add refresh token mechanism
4. ✅ Add CORS protection
5. ✅ Monitor và log authentication attempts

**Tóm lại: Đã triển khai JWT authentication với MetaMask signature verification, bảo vệ user-specific APIs.**





