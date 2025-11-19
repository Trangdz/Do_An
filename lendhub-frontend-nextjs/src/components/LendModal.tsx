import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber, formatBalance, formatWETHBalance } from '../lib/math';
import { lend, getTokenBalance, getTokenAllowance, parseTokenAmount } from '../lib/tx';
import { ORACLE_ABI } from '../config/abis';
import { CONFIG } from '../config/contracts';
import { useToast } from './ui/Toast';
import { isUserRejection, getFriendlyErrorMessage } from '@/lib/errorHandler';


interface LendModalProps {
  open: boolean;
  onClose: () => void;
  token: {
    address: string;
    symbol: string;
    decimals: number;
    userBalance?: number;
  };
  poolAddress: string;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  onSuccess?: () => void;
  onWrapEth?: () => void;
  simulatedBalance?: number;
}


export function LendModal({ 
  open, 
  onClose, 
  token, 
  poolAddress, 
  signer, 
  provider,
  onSuccess,
  onWrapEth,
  simulatedBalance = 0
}: LendModalProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priceUSD, setPriceUSD] = useState<number>(0);
  const { showToast } = useToast();

  // Load user balance, allowance, and price (USD) from oracle
  useEffect(() => {
    if (!open || !signer || !provider) return;

    const loadData = async () => {
      setIsLoadingBalance(true);
      try {
        const userAddress = await signer.getAddress();
        console.log(`🔍 [LendModal] Loading balance for ${token.symbol}:`, {
          tokenAddress: token.address,
          userAddress,
          decimals: token.decimals,
          poolAddress
        });

        // Validate user address
        if (!userAddress || userAddress === ethers.ZeroAddress) {
          console.error(`❌ [LendModal] Invalid user address: ${userAddress}`);
          setBalance('0');
          setAllowance('0');
          setIsLoadingBalance(false);
          return;
        }
        console.log(`✅ [LendModal] User address valid: ${userAddress}`);

        // ALWAYS use direct RPC provider for read operations to avoid MetaMask circuit breaker
        // Only use MetaMask provider for transactions (signing)
        const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const useProvider = rpcProvider; // Force RPC for reads
        
        console.log(`✅ [LendModal] Using direct RPC provider: ${CONFIG.RPC_URL} (avoids circuit breaker)`);

        // Validate network connection
        try {
          const network = await useProvider.getNetwork();
          const chainId = Number(network.chainId);
          console.log(`🔗 [LendModal] Network Chain ID: ${chainId}, Expected: ${CONFIG.CHAIN_ID}`);
          
          if (chainId !== CONFIG.CHAIN_ID) {
            console.error(`❌ [LendModal] Network mismatch! Expected Chain ID ${CONFIG.CHAIN_ID}, got ${chainId}`);
            console.error(`💡 [LendModal] Please switch to Chain ID ${CONFIG.CHAIN_ID} in MetaMask or check Ganache is running on port 7545`);
            setBalance('0');
            setAllowance('0');
            setIsLoadingBalance(false);
            return;
          }
          console.log(`✅ [LendModal] Network Chain ID correct!`);
        } catch (networkError: any) {
          console.error(`❌ [LendModal] Error checking network:`, networkError);
          console.error(`💡 [LendModal] Make sure Ganache is running on ${CONFIG.RPC_URL}`);
          setBalance('0');
          setAllowance('0');
          setIsLoadingBalance(false);
          return;
        }

        // Check if token contract has code before calling
        try {
          const tokenCode = await useProvider.getCode(token.address);
          if (!tokenCode || tokenCode === '0x') {
            console.error(`❌ [LendModal] Token contract has no code at ${token.address}`);
            console.error(`💡 [LendModal] Token may not be deployed. Check addresses.js or run deploy script.`);
            setBalance('0');
            setAllowance('0');
            setIsLoadingBalance(false);
            return;
          }
          console.log(`✅ [LendModal] Token contract code exists (${tokenCode.length} bytes)`);
        } catch (codeError: any) {
          console.error(`❌ [LendModal] Error checking token code:`, {
            error: codeError.message,
            code: codeError.code,
            tokenAddress: token.address
          });
          setBalance('0');
          setAllowance('0');
          setIsLoadingBalance(false);
          return;
        }

        // Validate poolAddress before checking allowance
        if (!poolAddress || poolAddress === ethers.ZeroAddress) {
          console.error(`❌ [LendModal] Invalid poolAddress: ${poolAddress}`);
          setBalance('0');
          setAllowance('0');
          setIsLoadingBalance(false);
          return;
        }
        console.log(`✅ [LendModal] Pool address valid: ${poolAddress}`);

        // Check if pool contract has code
        try {
          const poolCode = await useProvider.getCode(poolAddress);
          if (!poolCode || poolCode === '0x') {
            console.error(`❌ [LendModal] Pool contract has no code at ${poolAddress}`);
            console.error(`💡 [LendModal] LendingPool may not be deployed. Check addresses.js or run deploy script.`);
            setBalance('0');
            setAllowance('0');
            setIsLoadingBalance(false);
            return;
          }
          console.log(`✅ [LendModal] Pool contract code exists (${poolCode.length} bytes)`);
        } catch (poolCodeError: any) {
          console.error(`❌ [LendModal] Error checking pool code:`, {
            error: poolCodeError.message,
            code: poolCodeError.code,
            poolAddress
          });
          setBalance('0');
          setAllowance('0');
          setIsLoadingBalance(false);
          return;
        }

        // Load real on-chain balance and allowance for ALL tokens (including WETH)
        console.log(`📊 [LendModal] Fetching balance and allowance...`);
        console.log(`📊 [LendModal] Checking allowance for spender (LendingPool): ${poolAddress}`);
        const [balanceStr, allowanceStr] = await Promise.all([
          getTokenBalance(useProvider, token.address, userAddress, token.decimals),
          getTokenAllowance(useProvider, token.address, userAddress, poolAddress, token.decimals)
        ]);

        console.log(`✅ [LendModal] Balance: ${balanceStr} ${token.symbol}, Allowance: ${allowanceStr} ${token.symbol}`);
        
        // Log allowance explanation
        if (parseFloat(allowanceStr) === 0 && parseFloat(balanceStr) > 0) {
          console.log(`ℹ️ [LendModal] Allowance is 0 - this is normal. User hasn't approved yet.`);
          console.log(`ℹ️ [LendModal] When user clicks "Supply", approval will happen automatically (2-step process).`);
        }

        // Store raw numeric string for calculations; avoid currency formatting here
        setBalance(balanceStr);
        setAllowance(allowanceStr);
        
        // Fetch USD price from on-chain oracle (1e18)
        try {
          // Validate PRICE_ORACLE address before creating contract
          if (!CONFIG.PRICE_ORACLE || CONFIG.PRICE_ORACLE === ethers.ZeroAddress) {
            console.warn(`⚠️ [LendModal] PRICE_ORACLE is not set or is zero address`);
            setPriceUSD(0);
          } else {
            const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, useProvider);
          const p = await oracle.getAssetPrice1e18(token.address);
          const price = Number(ethers.formatUnits(p, 18));
          if (Number.isFinite(price) && price > 0) setPriceUSD(price);
          }
        } catch (e) {
          // If oracle not available or token not mapped, keep priceUSD=0 to avoid NaN
          console.warn(`⚠️ [LendModal] Could not fetch price from oracle:`, e);
          setPriceUSD(0);
        }
        
      } catch (error: any) {
        console.error('❌ [LendModal] Error loading token data:', {
          error: error.message,
          code: error.code,
          token: token.symbol,
          address: token.address,
          stack: error.stack
        });
        // Fallback to simulation for WETH
        if (token.symbol === 'WETH') {
          const userBalance = token.userBalance || simulatedBalance || 0;
          const formattedBalance = formatCurrency(userBalance);
          setBalance(formattedBalance);
          setAllowance('1000000');
        } else {
          // For other tokens, set to 0 but log the error
          setBalance('0');
          setAllowance('0');
        }
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadData();
  }, [open, signer, provider, token.address, token.decimals, poolAddress, simulatedBalance]);

  const handleMaxClick = () => {
    // Use the original userBalance value for max amount
    const originalBalance = token.userBalance || simulatedBalance || 0;
    setAmount(originalBalance.toString());
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };


  const handleLend = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);

    try {
      // Validate amount before parsing to avoid overflow
      const amountNum = parseFloat(amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        showToast({
          type: 'error',
          title: 'Invalid amount',
          message: 'Please enter a valid amount'
        });
        setIsLoading(false);
        return;
      }
      
      // Check if amount is reasonable (not exceeding a very large limit)
      // Note: We don't use Number.MAX_SAFE_INTEGER here because it's too small for tokens with many decimals
      // Instead, we use a reasonable limit (1 billion tokens) which is more than enough for any real use case
      const MAX_REASONABLE_AMOUNT = 1000000000; // 1 billion tokens
      if (amountNum > MAX_REASONABLE_AMOUNT) {
        showToast({
          type: 'error',
          title: 'Amount too large',
          message: `Maximum amount is ${MAX_REASONABLE_AMOUNT.toLocaleString()} ${token.symbol}. Please enter a smaller amount.`
        });
        setIsLoading(false);
        return;
      }
      
      // Additional check: ensure the amount can be safely parsed to BigInt
      // For tokens with 18 decimals, the maximum safe amount before BigInt parsing issues
      // is much larger than Number.MAX_SAFE_INTEGER / 10^18
      // We'll let parseTokenAmount handle the actual parsing and throw if there's an issue
      
      // Parse amount with error handling for overflow
      let amountBN: bigint;
      try {
        amountBN = parseTokenAmount(amount, token.decimals);
      } catch (error: any) {
        console.error('❌ Error parsing token amount:', error);
        showToast({
          type: 'error',
          title: 'Invalid amount',
          message: error?.message || 'Failed to parse amount. Please check the value and try again.'
        });
        setIsLoading(false);
        return;
      }
      
      // Additional validation: check if parsed amount is valid
      if (amountBN === BigInt(0)) {
        showToast({
          type: 'error',
          title: 'Invalid amount',
          message: 'Amount must be greater than 0'
        });
        setIsLoading(false);
        return;
      }
      
      // Log parsed amount for debugging
      console.log('📊 Parsed amount:', {
        input: amount,
        decimals: token.decimals,
        parsed: amountBN.toString(),
        formatted: ethers.formatUnits(amountBN, token.decimals)
      });
      
      // Create toast callback to show transaction progress
      const toastCallback = (toast: { type: 'success' | 'error' | 'pending'; title: string; message: string; hash?: string }) => {
        showToast({
          type: toast.type,
          title: toast.title,
          message: toast.message,
          hash: toast.hash
        });
      };
      
      // Use transaction service with toast callback
      // This will handle both approval and supply toasts automatically
      const result = await lend(signer, token.address, amountBN, toastCallback);
      
      // Note: Success toast is already shown by sendWithToast via toastCallback
      // Only show final success toast if it wasn't already shown
      console.log('✅ Supply transaction completed:', result.hash);
      
      // Reset form and close
      setAmount('');
      onClose();
      
      // Call onSuccess to trigger refresh
      setTimeout(() => {
        console.log("🔄 Refreshing data after supply...");
        onSuccess?.();
      }, 1000);

    } catch (error: any) {
      console.error('Error lending:', error);
      
      // Don't show error toast for user rejection - they already know they cancelled
      if (isUserRejection(error) || error.message === 'USER_CANCELLED') {
        // User rejected, no need to show error
        return;
      }
      
      // Show friendly error message for other errors
      const friendlyMessage = getFriendlyErrorMessage(error);
      showToast({
        type: 'error',
        title: 'Supply Failed',
        message: friendlyMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !signer || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Supply {token.symbol}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Deposit {token.symbol} to earn interest
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Balance Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Your Balance</span>
              <span className="text-sm font-mono text-gray-900">
                {balance} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Allowance</span>
              <span className={`text-sm font-mono ${
                parseFloat(allowance) === 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatNumber(parseFloat(allowance), 4)} {token.symbol}
              </span>
            </div>
            
            {/* Show info about allowance */}
            {/* {parseFloat(allowance) === 0 && parseFloat(balance) > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">ℹ️</span>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Approval Required
                    </p>
                    <p className="text-xs text-blue-700">
                      Allowance is currently 0. When you click "Supply", you'll need to approve the transaction first, then supply.
                    </p>
                    <p className="text-xs text-blue-600 mt-1 font-mono">
                      Flow: Approve token → Supply to pool (2 steps)
                    </p>
                  </div>
                </div>
              </div>
            )} */}
            
            {parseFloat(allowance) > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✅</span>
                  <p className="text-xs text-green-700">
                    Approved! You can supply tokens directly.
                  </p>
                </div>
              </div>
            )}
            {parseFloat(balance) === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  {token.symbol === 'WETH' 
                    ? '⚠️ You need to wrap ETH to WETH first to use as collateral'
                    : `⚠️ You don't have any ${token.symbol} in your wallet`
                  }
                </p>
                {token.symbol === 'WETH' && onWrapEth && (
                 <Button
                 size="sm"
                 onClick={onWrapEth}
                 className="w-full bg-gradient-to-r from-purple-500 to-purple-600 
                            hover:from-purple-600 hover:to-purple-700 text-black"
               >
                 🔄 Wrap ETH to WETH
               </Button>
               
                )}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Supply
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pr-20 text-lg"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3"
                onClick={handleMaxClick}
                disabled={isLoading || parseFloat(balance) <= 0}
              >
                MAX
              </Button>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                {parseFloat(amount) > 0 && priceUSD > 0
                  ? `≈ $${(parseFloat(amount) * priceUSD).toFixed(2)} USD`
                  : ' '}
              </span>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLend}
              disabled={isDisabled}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isLoading ? 'Processing...' : 'Supply'}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            {parseFloat(amount) > 0 && (
              <p>Ready to supply {amount} {token.symbol} to the pool.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
