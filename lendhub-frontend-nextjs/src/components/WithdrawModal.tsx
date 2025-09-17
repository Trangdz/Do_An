import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber, calculateMaxWithdraw } from '../lib/math';
import { withdraw, parseTokenAmount } from '../lib/tx';
import { useToast } from './ui/Toast';

interface WithdrawModalProps {
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
  userSupply: string;
  poolLiquidity: string;
  price: number;
  liquidationThreshold: number;
  collateralUSD: number;
  debtUSD: number;
  onSuccess?: () => void;
}

export function WithdrawModal({
  open,
  onClose,
  token,
  poolAddress,
  signer,
  provider,
  userSupply,
  poolLiquidity,
  price,
  liquidationThreshold,
  collateralUSD,
  debtUSD,
  onSuccess
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Calculate x_max based on Health Factor and liquidity
  const calculateXMax = () => {
    if (price === 0 || liquidationThreshold === 0) return 0;
    
    // x_max = ((CollateralUSD - DebtUSD) * 10000) / (Price * liqThresholdBps)
    const maxWithdrawUSD = calculateMaxWithdraw(
      collateralUSD * 1e18, // Convert to wei
      debtUSD * 1e18, // Convert to wei
      price,
      liquidationThreshold
    );
    
    // Convert back to token units
    const maxWithdrawTokens = maxWithdrawUSD / price;
    
    // Clamp by user supply and pool liquidity
    const userSupplyNum = parseFloat(userSupply);
    const poolLiquidityNum = parseFloat(poolLiquidity);
    
    return Math.min(maxWithdrawTokens, userSupplyNum, poolLiquidityNum);
  };

  const xMax = calculateXMax();
  const isHealthy = collateralUSD > debtUSD;
  const canWithdraw = isHealthy && xMax > 0;

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    if (canWithdraw) {
      setAmount(xMax.toFixed(6));
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);

    try {
      const amountBN = parseTokenAmount(amount, token.decimals);
      
      // Use transaction service
      const result = await withdraw(signer, token.address, amountBN);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Withdraw Successful!',
        message: `Successfully withdrew ${amount} ${token.symbol}`,
        hash: result.hash
      });
      
      // Reset form and close
      setAmount('');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error withdrawing:', error);
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Withdraw Failed',
        message: error.message || 'Transaction failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !signer || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > xMax || !canWithdraw;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Withdraw {token.symbol}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Withdraw your supplied {token.symbol} tokens
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Position Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">You Supply</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(parseFloat(userSupply), 4)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Pool Liquidity</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(parseFloat(poolLiquidity), 0)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Max Withdraw (x_max)</span>
              <span className={`text-sm font-mono ${canWithdraw ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(xMax, 4)} {token.symbol}
              </span>
            </div>
          </div>

          {/* Health Factor Warning */}
          {!isHealthy && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">Position at Risk</p>
                  <p className="text-xs text-red-600 mt-1">
                    Your debt exceeds collateral. Cannot withdraw safely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Withdraw
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pr-20 text-lg"
                disabled={isLoading || !canWithdraw}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3"
                onClick={handleMaxClick}
                disabled={isLoading || !canWithdraw}
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

          {/* Calculation Details */}
          {canWithdraw && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Withdraw Calculation</h4>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Collateral USD:</span>
                  <span>{formatCurrency(collateralUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Debt USD:</span>
                  <span>{formatCurrency(debtUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Collateral:</span>
                  <span>{formatCurrency(collateralUSD - debtUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Liquidation Threshold:</span>
                  <span>{(liquidationThreshold / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Max Withdraw:</span>
                  <span>{formatNumber(xMax, 4)} {token.symbol}</span>
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
              onClick={handleWithdraw}
              disabled={isDisabled}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Withdrawing...</span>
                </div>
              ) : (
                'Withdraw'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}