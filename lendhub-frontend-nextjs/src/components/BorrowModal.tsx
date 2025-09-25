import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber } from '../lib/math';
import { borrow, parseTokenAmount } from '../lib/tx';
import { useToast } from './ui/Toast';

interface BorrowModalProps {
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
  price: number;
  poolLiquidity: string;
  collateralUSD: number;
  debtUSD: number;
  onSuccess?: () => void;
}

export function BorrowModal({
  open,
  onClose,
  token,
  poolAddress,
  signer,
  provider,
  price,
  poolLiquidity,
  collateralUSD,
  debtUSD,
  onSuccess
}: BorrowModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [poolValid, setPoolValid] = useState<boolean>(true);
  const { showToast } = useToast();
  // Validate pool address is a contract to avoid CALL_EXCEPTION from wrong address
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!provider) return;
        const code = await provider.getCode(poolAddress);
        if (mounted) setPoolValid(!!code && code !== '0x');
      } catch {
        if (mounted) setPoolValid(false);
      }
    })();
    return () => { mounted = false; };
  }, [provider, poolAddress]);

  // Calculate HF_after
  const calculateHFAfter = (borrowAmount: number) => {
    if (price === 0) return 0;
    
    const debtAfterUSD = debtUSD + (borrowAmount * price);
    if (debtAfterUSD === 0) return Number.MAX_SAFE_INTEGER;
    
    return collateralUSD / debtAfterUSD;
  };

  const hfAfter = calculateHFAfter(parseFloat(amount) || 0);
  const isHealthyAfter = hfAfter >= 1;
  // Protect against empty or zero liquidity
  const poolLiquidityNum = Math.max(0, parseFloat(poolLiquidity || '0'));
  const collateralCap = price > 0 ? (collateralUSD * 0.8) / price : 0; // 80% LTV cap for UI
  const maxBorrow = Math.max(0, Math.min(poolLiquidityNum, collateralCap));

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    setAmount(maxBorrow.toFixed(6));
  };

  const handleBorrow = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);

    try {
      const amountBN = parseTokenAmount(amount, token.decimals);
      
      // Use transaction service
      const result = await borrow(signer, token.address, amountBN);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Borrow Successful!',
        message: `Successfully borrowed ${amount} ${token.symbol}`,
        hash: result.hash
      });
      
      // Reset form and close
      setAmount('');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error borrowing:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = error.message || 'Transaction failed';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('not borrowable')) {
        errorMessage = 'This asset is not available for borrowing. Please select a borrowable asset.';
      } else if (errorMessage.includes('no liquidity')) {
        errorMessage = 'Pool has no liquidity for this asset. Please try another asset or add liquidity first.';
      } else if (errorMessage.includes('exceeds available')) {
        errorMessage = 'Amount exceeds available liquidity. Please reduce the amount.';
      } else if (errorMessage.includes('No collateral')) {
        errorMessage = 'No collateral provided. Please supply assets first to use as collateral.';
      } else if (errorMessage.includes('Health factor')) {
        errorMessage = 'Health factor too low. Please supply more collateral or reduce borrow amount.';
      } else if (errorMessage.includes('not a contract')) {
        errorMessage = 'Invalid contract address. Please check your network connection.';
      }
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Borrow Failed',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEth = token.symbol === 'ETH' || token.symbol === 'WETH' || token.address === ethers.ZeroAddress;
  const noLiquidity = poolLiquidityNum <= 0;
  const bannerText = !poolValid
    ? 'LendingPool address is not a contract on the current network. Update addresses.js.'
    : isEth
      ? 'Cannot borrow native ETH or WETH. Borrow DAI/USDC instead.'
      : (noLiquidity ? 'Pool has zero liquidity for this asset.' : undefined);
  const isDisabled = !signer || isEth || !poolValid || noLiquidity || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxBorrow || !isHealthyAfter;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Borrow {token.symbol}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Borrow {token.symbol} against your collateral
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Position Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Collateral USD</span>
              <span className="text-sm font-mono text-gray-900">
                {formatCurrency(collateralUSD)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Current Debt USD</span>
              <span className="text-sm font-mono text-gray-900">
                {formatCurrency(debtUSD)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Pool Liquidity</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(poolLiquidityNum, 0)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Max Borrow</span>
              <span className="text-sm font-mono text-blue-600">
                {formatNumber(maxBorrow, 4)} {token.symbol}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Borrow
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
                disabled={isLoading}
              >
                MAX
              </Button>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                ≈ {formatCurrency(parseFloat(amount) * price)} USD
              </span>
            </div>
          </div>

          {/* Health Factor Preview */}
          <div className={`p-4 rounded-lg ${
            isHealthyAfter ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className={`text-sm font-medium mb-2 ${
              isHealthyAfter ? 'text-green-800' : 'text-red-800'
            }`}>
              Health Factor After Borrow
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className={isHealthyAfter ? 'text-green-700' : 'text-red-700'}>
                  Current HF:
                </span>
                <span className={isHealthyAfter ? 'text-green-700' : 'text-red-700'}>
                  {debtUSD > 0 ? formatNumber(collateralUSD / debtUSD, 2) : '∞'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isHealthyAfter ? 'text-green-700' : 'text-red-700'}>
                  HF After:
                </span>
                <span className={`font-medium ${isHealthyAfter ? 'text-green-700' : 'text-red-700'}`}>
                  {formatNumber(hfAfter, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isHealthyAfter ? 'text-green-700' : 'text-red-700'}>
                  Status:
                </span>
                <span className={`font-medium ${isHealthyAfter ? 'text-green-700' : 'text-red-700'}`}>
                  {isHealthyAfter ? '✅ Safe' : '⚠️ At Risk'}
                </span>
              </div>
            </div>
          </div>

          {/* Banner for pool issues */}
          {bannerText && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              {bannerText}
            </div>
          )}

          {/* Warning for unhealthy position */}
          {!isHealthyAfter && parseFloat(amount) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">Position Would Be At Risk</p>
                  <p className="text-xs text-red-600 mt-1">
                    Health Factor would drop below 1.0. Reduce borrow amount.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              onClick={handleBorrow}
              disabled={isDisabled}
              className={`flex-1 ${
                isHealthyAfter 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Borrowing...</span>
                </div>
              ) : (
                'Borrow'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
