import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Badge } from './ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/Tooltip';
import { formatCurrency, formatNumber, formatBalance, formatWETHBalance } from '../lib/math';
import { repay, getTokenBalance, parseTokenAmount } from '../lib/tx';
import { useToast } from './ui/Toast';
import { 
  toUnitsCeil, 
  formatHuman, 
  getCurrentDebt, 
  repayAllUnlimited, 
  repayExactWithBuffer, 
  isDebtCleared 
} from '../lib/repayHelpers';

interface RepayModalProps {
  open: boolean;
  onClose: () => void;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  poolAddress: string;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  userDebt: string;
  price: number;
  onSuccess: () => void;
}

// Helper function to format debt with dust detection
function formatDebtWithDust(debtRaw: bigint, decimals: number, symbol: string): {
  display: string;
  isDust: boolean;
  tooltip?: string;
} {
  const humanAmount = parseFloat(formatHuman(debtRaw, decimals));
  const displayThreshold = 0.0001;
  
  if (debtRaw === 0n) {
    return { display: `0 ${symbol}`, isDust: false };
  }
  
  if (humanAmount < displayThreshold) {
    return {
      display: `< ${displayThreshold} ${symbol}`,
      isDust: true,
      tooltip: `Raw: ${debtRaw.toString()} wei`
    };
  }
  
  return {
    display: `${formatCurrency(humanAmount, 4)} ${symbol}`,
    isDust: false
  };
}

// Helper function to format percentage without K/M abbreviations
function formatPercentage(value: number): string {
  if (value >= 100) {
    return `${value.toFixed(1)}%`;
  } else if (value >= 1) {
    return `${value.toFixed(2)}%`;
  } else {
    return `${value.toFixed(4)}%`;
  }
}

export default function RepayModalImproved({
  open,
  onClose,
  token,
  poolAddress,
  signer,
  provider,
  userDebt,
  price,
  onSuccess
}: RepayModalProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDebt, setCurrentDebt] = useState<{ debtRaw: bigint; debtHuman: string; decimals: number } | null>(null);
  const [repayMode, setRepayMode] = useState<'unlimited' | 'exact'>('unlimited');
  const { showToast } = useToast();

  // Load user token balance and current debt
  useEffect(() => {
    if (!open || !signer || !provider) return;

    const loadData = async () => {
      try {
        const userAddress = await signer.getAddress();
        
        // Load balance
        const balanceStr = await getTokenBalance(provider, token.address, userAddress, token.decimals);
        setBalance(balanceStr);
        
        // Load current debt
        const poolContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '',
          ['function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'],
          provider
        );
        
        const debtData = await getCurrentDebt(poolContract, userAddress, token.address);
        setCurrentDebt(debtData);
      } catch (error) {
        console.error('Error loading data:', error);
        setBalance('0');
        setCurrentDebt(null);
      }
    };

    loadData();
  }, [open, signer, provider, token.address, token.decimals]);

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMax = () => {
    if (currentDebt) {
      setAmount(currentDebt.debtHuman);
    }
  };

  const handleRepayAll = async () => {
    if (!signer || !currentDebt || currentDebt.debtRaw === 0n) {
      showToast({
        type: 'error',
        title: 'No Debt to Repay',
        message: 'You have no debt to repay for this token.',
      });
      return;
    }

    setIsLoading(true);
    setAmount("MAX");

    try {
      const userAddress = await signer.getAddress();
      const poolAddress = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '';

      try {
        // Try RepayAllUnlimited mode first
        console.log('Attempting RepayAllUnlimited mode...');
        const result = await repayAllUnlimited(signer, token.address, poolAddress, userAddress);
        
        showToast({
          type: 'success',
          title: 'Repay All Successful!',
          message: 'Debt cleared using unlimited mode',
          hash: result.hash
        });
        
        // Verify debt is cleared
        const poolContract = new ethers.Contract(poolAddress, [
          'function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
        ], signer);
        
        const isCleared = await isDebtCleared(poolContract, userAddress, token.address);
        if (isCleared) {
          showToast({
            type: 'success',
            title: '✅ Debt Cleared!',
            message: 'All debt has been successfully cleared!',
          });
        }
        
      } catch (unlimitedError) {
        console.log('RepayAllUnlimited failed, falling back to RepayExactWithBuffer:', unlimitedError);
        
        // Fallback to RepayExactWithBuffer mode
        const result = await repayExactWithBuffer(
          signer, 
          token.address, 
          poolAddress, 
          userAddress, 
          currentDebt.debtRaw, 
          currentDebt.decimals
        );
        
        showToast({
          type: 'success',
          title: 'Repay All Successful!',
          message: 'Debt cleared using exact mode with buffer',
          hash: result.hash
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Repay All error:', error);
      showToast({
        type: 'error',
        title: 'Repay All Failed',
        message: error.message || 'Transaction failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!signer || !amount) return;

    setIsLoading(true);

    try {
      const userAddress = await signer.getAddress();
      const poolAddress = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '';
      
      if (amount === "MAX") {
        await handleRepayAll();
        return;
      } else {
        // Normal repay with specific amount
        const amountNum = parseFloat(amount);
        if (amountNum <= 0) return;
        
        // Convert human input to BigInt using proper parsing
        const amountBN = toUnitsCeil(amount, token.decimals);
        
        if (amountBN === 0n) {
          showToast({
            type: 'error',
            title: 'Invalid Amount',
            message: `Amount too small. Minimum is ${1 / (10 ** token.decimals)}`,
          });
          return;
        }
        
        // Check balance
        const balanceNum = parseFloat(balance);
        if (amountNum > balanceNum) {
          showToast({
            type: 'error',
            title: 'Insufficient Balance',
            message: `You have ${balance} ${token.symbol}, but trying to repay ${amount} ${token.symbol}`,
          });
          return;
        }
        
        // Execute repay
        const result = await repay(signer, token.address, amountBN);
        
        showToast({
          type: 'success',
          title: 'Repay Successful!',
          message: `Successfully repaid ${amount} ${token.symbol}`,
          hash: result.hash
        });
        
        onClose();
      }
    } catch (error: any) {
      console.error('Repay error:', error);
      
      let errorMessage = 'Repay failed';
      if (error.message) {
        errorMessage = error.message;
      }
      
      showToast({
        type: 'error',
        title: 'Repay Failed',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const debtNum = parseFloat(userDebt);
  const balanceNum = parseFloat(balance);
  const amountNum = parseFloat(amount) || 0;
  const isRepayAll = amount === "MAX";

  // Calculate step based on token decimals
  const step = 1 / (10 ** token.decimals);

  // Calculate repay percentage
  const repayPercentage = debtNum > 0 ? Math.min((amountNum / debtNum) * 100, 100) : 0;

  // Calculate remaining debt after repay
  const remainingDebt = Math.max(0, debtNum - amountNum);

  // Calculate USD values
  const amountUSD = amountNum * price;
  const remainingDebtUSD = remainingDebt * price;

  // Format current debt with dust detection
  const debtDisplay = currentDebt ? formatDebtWithDust(currentDebt.debtRaw, currentDebt.decimals, token.symbol) : null;

  const isDisabled = isLoading || amountNum <= 0 || amountNum > balanceNum;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Repay {token.symbol}
            {debtDisplay?.isDust && (
              <Badge variant="destructive" className="text-xs">
                Dust not zero
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Repay your {token.symbol} debt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Debt Info with Dust Detection */}
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-red-600 mb-1">Current Debt</div>
            <div className="text-lg font-bold text-red-600 flex items-center gap-2">
              {debtDisplay ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{debtDisplay.display}</span>
                    </TooltipTrigger>
                    {debtDisplay.tooltip && (
                      <TooltipContent>
                        <p>{debtDisplay.tooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ) : (
                `${formatCurrency(debtNum, 4)} ${token.symbol}`
              )}
            </div>
            <div className="text-xs text-red-600/70">
              ${formatCurrency(debtNum * price)}
            </div>
          </div>

          {/* Balance Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Your Balance</div>
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(balanceNum, 4)} {token.symbol}
            </div>
            <div className="text-xs text-blue-600/70">
              ${formatCurrency(balanceNum * price)}
            </div>
          </div>

          {/* Amount Input with Proper Step */}
          <div className="space-y-2">
            <Label htmlFor="amount">Repay Amount</Label>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                step={step}
                min="0"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleMax}
                disabled={isLoading || !currentDebt}
                className="px-3"
              >
                Max
              </Button>
              <Button
                variant="outline"
                onClick={handleRepayAll}
                disabled={isLoading}
                className="px-3"
              >
                ALL
              </Button>
            </div>
          </div>

          {/* Repay Mode Selection */}
          <div className="space-y-2">
            <Label>Repay Mode</Label>
            <div className="flex space-x-2">
              <Button
                variant={repayMode === 'unlimited' ? 'default' : 'outline'}
                onClick={() => setRepayMode('unlimited')}
                disabled={isLoading}
                className="flex-1"
              >
                Unlimited
              </Button>
              <Button
                variant={repayMode === 'exact' ? 'default' : 'outline'}
                onClick={() => setRepayMode('exact')}
                disabled={isLoading}
                className="flex-1"
              >
                Exact + Buffer
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              {repayMode === 'unlimited' 
                ? 'Approve MaxUint256 and repay MaxUint256 (clears all debt)'
                : 'Calculate exact debt + 1% buffer for interest'
              }
            </div>
          </div>

          {/* Repay Calculation */}
          {amount && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="text-sm font-medium">Repay Calculation</div>
              
              <div className="flex justify-between text-sm">
                <span>Repay Amount:</span>
                <span className="font-medium">
                  {isRepayAll ? 'All Debt' : `${formatCurrency(amountNum, 4)} ${token.symbol}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>USD Value:</span>
                <span className="font-medium">
                  {isRepayAll ? 'All Debt Value' : `$${formatCurrency(amountUSD)}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Repay Percentage:</span>
                <span className="font-medium">
                  {isRepayAll ? '100.0% (Full Repay)' : `${formatPercentage(repayPercentage)}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Remaining Debt:</span>
                <span className="font-medium">
                  {isRepayAll ? 'Fully Repaid' : `${formatCurrency(remainingDebt, 4)} ${token.symbol}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Remaining USD:</span>
                <span className="font-medium">
                  {isRepayAll ? '$0.00' : `$${formatCurrency(remainingDebtUSD)}`}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRepay}
              disabled={isDisabled}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : isRepayAll ? 'Repay All' : 'Repay'}
            </Button>
          </div>

          {/* Warning for overpayment */}
          {amountNum > debtNum && !isRepayAll && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <div className="text-sm text-yellow-800">
                ⚠️ You're trying to repay more than your debt. The amount will be capped to your debt amount.
              </div>
            </div>
          )}

          {/* Dust Warning */}
          {debtDisplay?.isDust && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
              <div className="text-sm text-orange-800">
                ⚠️ Your debt contains dust amounts. Use "Repay All" to clear completely.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
