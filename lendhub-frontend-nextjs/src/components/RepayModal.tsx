import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber, formatBalance, formatWETHBalance } from '../lib/math';
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
      // If value has decimal point, check and truncate to token decimals
      if (value.includes('.')) {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > token.decimals) {
          // Truncate to token decimals
          value = parts[0] + '.' + parts[1].substring(0, token.decimals);
        }
      }
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    // Nếu số quá nhỏ (< 0.000001), cho bằng 0
    const MIN_REPAY_AMOUNT = 0.000001;
    
    // Parse userDebt để check
    const debtValue = parseFloat(userDebt) || 0;
    
    // Check nếu số quá nhỏ
    if (debtValue < MIN_REPAY_AMOUNT || debtValue === 0 || isNaN(debtValue)) {
      setAmount('0');
      return;
    }
    
    // Lấy balance
    const balanceNum = parseFloat(balance) || 0;
    
    // Tính max amount (min của debt và balance)
    const maxAmount = Math.min(debtValue, balanceNum);
    
    // Check lại maxAmount
    if (maxAmount < MIN_REPAY_AMOUNT || maxAmount === 0 || isNaN(maxAmount)) {
      setAmount('0');
      return;
    }
    
    // Ưu tiên: Dùng userDebt string trực tiếp nếu:
    // 1. maxAmount = debtValue (có đủ balance để trả hết)
    // 2. userDebt là string hợp lệ (không có scientific notation)
    const isMaxAmountEqualsDebt = Math.abs(maxAmount - debtValue) < 1e-10;
    const isUserDebtValid = userDebt && 
                            userDebt.trim() !== '' &&
                            userDebt !== '0' && 
                            !userDebt.includes('e') && 
                            !userDebt.includes('E') && 
                            !isNaN(parseFloat(userDebt)) &&
                            parseFloat(userDebt) > 0;
    
    if (isMaxAmountEqualsDebt && isUserDebtValid) {
      // Dùng userDebt string trực tiếp để giữ nguyên precision
      setAmount(userDebt);
      return;
    }
    
    // Fallback: Format từ maxAmount
    // Format với đủ precision (tối đa 18 decimals cho DAI)
    const maxDecimals = Math.min(token.decimals, 18);
    const formatted = maxAmount.toFixed(maxDecimals);
    
    // Check lại sau khi format
    const finalAmount = parseFloat(formatted);
    if (finalAmount < MIN_REPAY_AMOUNT || finalAmount === 0 || isNaN(finalAmount)) {
      setAmount('0');
      return;
    }
    
    // Remove trailing zeros nhưng giữ lại precision
    let trimmed = formatted;
    if (trimmed.includes('.')) {
      trimmed = trimmed.replace(/\.?0+$/, '');
    }
    
    // Check lại một lần nữa
    const finalCheck = parseFloat(trimmed);
    if (finalCheck < MIN_REPAY_AMOUNT || finalCheck === 0 || isNaN(finalCheck)) {
      setAmount('0');
      return;
    }
    
    // Nếu trimmed có scientific notation, set về 0
    if (trimmed.includes('e') || trimmed.includes('E')) {
      setAmount('0');
      return;
    }
    
    setAmount(trimmed);
  };

  const handleRepay = async () => {
    if (!signer || !amount) return;

    setIsLoading(true);

    try {
      const userAddress = await signer.getAddress();
      let amountBN: bigint;
      let displayAmount: string;

      // Check if user wants to repay all (amount equals debt or very close)
      const debtNum = parseFloat(userDebt) || 0;
      const amountNum = parseFloat(amount) || 0;
      
      // Nếu số quá nhỏ (< 0.000001), cho bằng 0 và return
      const MIN_REPAY_AMOUNT = 0.000001;
      if (debtNum < MIN_REPAY_AMOUNT || amountNum < MIN_REPAY_AMOUNT) {
        showToast({
          type: 'info',
          title: 'Amount Too Small',
          message: 'Debt amount is too small (< 0.000001). No repayment needed.'
        });
        setIsLoading(false);
        return;
      }
      
      const isRepayAll = Math.abs(amountNum - debtNum) < 0.00000001 || amountNum >= debtNum;
      
      if (isRepayAll) {
        console.log('🔄 REPAY ALL MODE: Getting exact current debt including interest...');
        console.log('📊 User entered amount:', amountNum, 'Debt:', debtNum);
        
        // Get the lending pool contract
        const poolContract = new ethers.Contract(
          poolAddress,
          [
            'function getCurrentDebtBalance(address user, address asset) external view returns (uint256)'
          ],
          provider
        );

        // Get current debt balance INCLUDING interest (returns in 1e18 format)
        // Lấy debt ngay trước khi gửi transaction để tránh interest tăng trong lúc chờ
        const currentDebt1e18 = await poolContract.getCurrentDebtBalance(userAddress, token.address);
        
        console.log('📊 Current Debt (1e18, includes interest):', currentDebt1e18.toString());

        if (currentDebt1e18 === BigInt(0)) {
          showToast({
            type: 'info',
            title: 'No Debt',
            message: 'You have no debt to repay'
          });
          setIsLoading(false);
          return;
        }

        // Check user balance
        const tokenContract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const userBalance = await tokenContract.balanceOf(userAddress);
        
        // Convert from 1e18 internal precision to token decimals (ROUND UP!)
        const conversionFactor = BigInt(10 ** (18 - token.decimals));
        
        // Round UP division to ensure we don't lose precision
        let debtInTokenDecimals = currentDebt1e18 / conversionFactor;
        const remainder = currentDebt1e18 % conversionFactor;
        if (remainder > BigInt(0)) {
          debtInTokenDecimals += BigInt(1); // Round up if there's any remainder
        }

        // For very small debts, ensure minimum repay amount
        const minRepayAmount = BigInt(100); // Minimum 100 wei (0.0001 USDC for 6 decimals)
        if (debtInTokenDecimals < minRepayAmount) {
          debtInTokenDecimals = minRepayAmount;
        }

        // Thêm 15% buffer để handle interest accrual trong lúc transaction chờ
        // Buffer tăng từ 5% lên 15% để đảm bảo trả hết nợ
        const withBuffer = (debtInTokenDecimals * BigInt(115)) / BigInt(100);

        // Nếu user có đủ balance (bao gồm buffer) → Gửi MaxUint256, contract sẽ tự cap về currentDebt
        // Điều này đảm bảo trả hết nợ ngay cả khi interest tăng trong lúc transaction chờ
        if (userBalance >= withBuffer) {
          // Gửi MaxUint256, contract sẽ tự động cap về currentDebt (xem LendingPool.sol dòng 685)
          amountBN = ethers.MaxUint256;
          console.log('✅ User has sufficient balance, sending MaxUint256 (contract will auto-cap to currentDebt)');
          
          // Format display amount từ debtInTokenDecimals (không phải withBuffer)
          try {
            const formatted = ethers.formatUnits(debtInTokenDecimals, token.decimals);
            const rounded = parseFloat(formatted).toFixed(token.decimals);
            displayAmount = parseFloat(rounded).toString();
          } catch (e) {
            const divisor = Math.pow(10, token.decimals);
            const debtAsNumber = Number(debtInTokenDecimals) / divisor;
            displayAmount = debtAsNumber.toFixed(token.decimals);
            displayAmount = parseFloat(displayAmount).toString();
          }
        } else {
          // Nếu không đủ balance, gửi hết balance (với buffer nếu có thể)
          // Ưu tiên gửi withBuffer, nhưng nếu không đủ thì gửi hết balance
          if (userBalance >= debtInTokenDecimals) {
            // Có đủ để trả debt (không có buffer), gửi hết balance
            amountBN = userBalance;
            console.log('⚠️ User balance insufficient for buffer, sending full balance');
          } else {
            // Không đủ để trả debt, gửi hết balance
            amountBN = userBalance;
            console.log('⚠️ User balance insufficient to repay full debt, sending full balance');
          }
          
          // Format display amount từ userBalance
          try {
            const formatted = ethers.formatUnits(userBalance, token.decimals);
            const rounded = parseFloat(formatted).toFixed(token.decimals);
            displayAmount = parseFloat(rounded).toString();
          } catch (e) {
            const divisor = Math.pow(10, token.decimals);
            const balanceAsNumber = Number(userBalance) / divisor;
            displayAmount = balanceAsNumber.toFixed(token.decimals);
            displayAmount = parseFloat(displayAmount).toString();
          }
        }

      } else {
        // Normal amount input
        const amountNum = parseFloat(amount);
        
        // Nếu số quá nhỏ (< 0.000001), cho bằng 0 và return
        const MIN_REPAY_AMOUNT = 0.000001;
        if (amountNum < MIN_REPAY_AMOUNT) {
          showToast({
            type: 'info',
            title: 'Amount Too Small',
            message: 'Repay amount is too small (< 0.000001). Please enter a larger amount.'
          });
          setIsLoading(false);
          return;
        }
        
        if (amountNum <= 0) {
          setIsLoading(false);
          return;
        }
        
        // Round to token decimals to avoid "too many decimals" error
        // This prevents errors when user pastes or calculates amounts with too many decimal places
        const roundedAmount = amountNum.toFixed(token.decimals);
        // Convert scientific notation to decimal string if needed
        let trimmedAmount = parseFloat(roundedAmount).toString();
        
        // Nếu vẫn là scientific notation, convert về decimal
        if (trimmedAmount.includes('e') || trimmedAmount.includes('E')) {
          // Convert scientific notation to fixed decimal
          trimmedAmount = amountNum.toFixed(token.decimals);
        }
        
        try {
          amountBN = parseTokenAmount(trimmedAmount, token.decimals);
          displayAmount = trimmedAmount;
        } catch (parseError: any) {
          // If still fails, try with more aggressive rounding
          const moreRounded = amountNum.toFixed(Math.max(0, token.decimals - 1));
          let moreTrimmed = parseFloat(moreRounded).toString();
          
          // Convert scientific notation if needed
          if (moreTrimmed.includes('e') || moreTrimmed.includes('E')) {
            moreTrimmed = amountNum.toFixed(Math.max(0, token.decimals - 1));
          }
          
          amountBN = parseTokenAmount(moreTrimmed, token.decimals);
          displayAmount = moreTrimmed;
        }
      }
      
      // Use transaction service
      const result = await repay(signer, token.address, amountBN);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Repay Successful!',
        message: `Successfully repaid ${displayAmount} ${token.symbol}`,
        hash: result.hash
      });
      
      // Reset form and close
      setAmount('');
      
      // Wait for contract state to update before refreshing
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
      
      // Trigger refresh callback
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

  const debtNum = parseFloat(userDebt) || 0;
  const balanceNum = parseFloat(balance) || 0;
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
                {token.symbol === 'WETH' ? formatWETHBalance(balanceNum, 4) : formatBalance(balanceNum, 4)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Max Repay</span>
              <span className="text-sm font-mono text-blue-600">
                {token.symbol === 'WETH' ? formatWETHBalance(Math.min(debtNum, balanceNum), 4) : formatBalance(Math.min(debtNum, balanceNum), 4)} {token.symbol}
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
                    You need {token.symbol === 'WETH' ? formatWETHBalance(debtNum - balanceNum, 4) : formatBalance(debtNum - balanceNum, 4)} more {token.symbol} to repay in full.
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
