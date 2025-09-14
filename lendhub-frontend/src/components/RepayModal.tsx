import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber } from '../lib/math';
import { repay, getTokenBalance, parseTokenAmount } from '../lib/tx';
import { useToast } from './ui/Toast';

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
  onSuccess?: () => void;
}

export function RepayModal({
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
  const { showToast } = useToast();

  // Load user token balance
  useEffect(() => {
    if (!open || !signer || !provider) return;

    const loadBalance = async () => {
      try {
        const userAddress = await signer.getAddress();
        const balanceStr = await getTokenBalance(provider, token.address, userAddress, token.decimals);
        setBalance(balanceStr);
      } catch (error) {
        console.error('Error loading token balance:', error);
        setBalance('0');
      }
    };

    loadBalance();
  }, [open, signer, provider, token.address, token.decimals]);

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    // MAX = min(userDebt, userBalance)
    const debtNum = parseFloat(userDebt);
    const balanceNum = parseFloat(balance);
    const maxAmount = Math.min(debtNum, balanceNum);
    setAmount(maxAmount.toFixed(6));
  };

  const handleRepay = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);

    try {
      const amountBN = parseTokenAmount(amount, token.decimals);
      
      // Use transaction service
      const result = await repay(signer, token.address, amountBN);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Repay Successful!',
        message: `Successfully repaid ${amount} ${token.symbol}`,
        hash: result.hash
      });
      
      // Reset form and close
      setAmount('');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error repaying:', error);
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Repay Failed',
        message: error.message || 'Transaction failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const debtNum = parseFloat(userDebt);
  const balanceNum = parseFloat(balance);
  const amountNum = parseFloat(amount) || 0;
  const isDisabled = !signer || !amount || amountNum <= 0 || amountNum > debtNum || amountNum > balanceNum;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Repay {token.symbol}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Repay your borrowed {token.symbol} tokens
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Position Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">You Owe</span>
              <span className="text-sm font-mono text-red-600">
                {formatNumber(debtNum, 4)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Your Balance</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(balanceNum, 4)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Max Repay</span>
              <span className="text-sm font-mono text-blue-600">
                {formatNumber(Math.min(debtNum, balanceNum), 4)} {token.symbol}
              </span>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {balanceNum < debtNum && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-500">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Insufficient Balance</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    You need {formatNumber(debtNum - balanceNum, 4)} more {token.symbol} to repay in full.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Repay
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
                ≈ {formatCurrency(amountNum * price)} USD
              </span>
            </div>
          </div>

          {/* Repay Calculation */}
          {amountNum > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Repay Calculation</h4>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Current Debt:</span>
                  <span>{formatNumber(debtNum, 4)} {token.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Repay Amount:</span>
                  <span>{formatNumber(amountNum, 4)} {token.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Debt:</span>
                  <span className="font-medium">
                    {formatNumber(Math.max(0, debtNum - amountNum), 4)} {token.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Repay Percentage:</span>
                  <span className="font-medium">
                    {debtNum > 0 ? ((amountNum / debtNum) * 100).toFixed(1) : 0}%
                  </span>
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
              onClick={handleRepay}
              disabled={isDisabled}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Repaying...</span>
                </div>
              ) : (
                'Repay'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
