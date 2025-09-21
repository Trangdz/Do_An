import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatEther, parseEther } from 'ethers';
import { formatCurrency, formatNumber } from '../lib/math';
import { CONFIG } from '../config/contracts';
import { ORACLE_ABI, WETH_ABI } from '../config/abis';
import { useToast } from './ui/Toast';

interface WrapEthModalProps {
  open: boolean;
  onClose: () => void;
  signer: ethers.Signer | null;
  onSuccess?: (amount: number) => void;
  onBalanceUpdate?: () => void;
}

export function WrapEthModal({ open, onClose, signer, onSuccess, onBalanceUpdate }: WrapEthModalProps) {
  const [amount, setAmount] = useState('');
  const [ethBalance, setEthBalance] = useState('0');
  const [ethPrice, setEthPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load ETH balance and price
  useEffect(() => {
    if (!open || !signer) return;

    const loadData = async () => {
      try {
        const address = await signer.getAddress();
        const balance = await signer.provider!.getBalance(address);
        setEthBalance(formatEther(balance));

        // Load ETH price from oracle
        try {
          const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, signer.provider);
          const priceWei = await oracle.getAssetPrice1e18(CONFIG.WETH);
          const price = parseFloat(formatEther(priceWei));
          setEthPrice(price);
        } catch (oracleError) {
          console.log('Oracle price failed, using fallback:', oracleError.message);
          setEthPrice(1600); // Fallback price
        }

        console.log('ETH Price loaded:', ethPrice);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback price
        setEthPrice(150);
      }
    };

    loadData();
  }, [open, signer]);

  const handleMaxClick = () => {
    setAmount(ethBalance);
  };

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleWrap = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    setTxHash(null);

    try {
      const amountWei = parseEther(amount);

      // REAL TRANSACTION: Create actual ETH wrap transaction
      console.log('🔄 REAL TRANSACTION: Wrapping ETH to WETH');
      console.log('Amount:', amount, 'ETH');
      console.log('Amount (wei):', amountWei.toString());
      console.log('🔍 CONFIG.WETH address:', CONFIG.WETH);

      // Create WETH contract instance
      const wethContract = new ethers.Contract(CONFIG.WETH, WETH_ABI, signer);

      console.log('📤 Calling deposit() function on WETH contract...');
      const txResponse = await wethContract.deposit({ value: amountWei });
      setTxHash(txResponse.hash);

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await txResponse.wait();

      console.log('✅ REAL TRANSACTION: Wrap successful!');
      console.log('TX Hash:', txResponse.hash);
      console.log('Gas Used:', receipt?.gasUsed?.toString());

      // Check if Deposit event was emitted
      const depositEvent = receipt.logs.find(log => {
        try {
          const parsed = wethContract.interface.parseLog(log);
          return parsed.name === 'Deposit';
        } catch {
          return false;
        }
      });

      if (depositEvent) {
        console.log('✅ Deposit event found in transaction logs');
      }

      // Show success toast
      showToast({
        type: 'success',
        title: 'ETH Wrapped Successfully!',
        message: `${amount} ETH has been wrapped to WETH`,
        hash: txResponse.hash
      });

      // Success - update balances
      setTimeout(() => {
        setAmount('');
        setTxHash(null);
        onSuccess?.(parseFloat(amount));
        onBalanceUpdate?.(); // Trigger balance refresh
        onClose();
      }, 1000);

    } catch (error: any) {
      console.error('Error wrapping ETH:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Wrap ETH Failed',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !signer || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(ethBalance);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Wrap ETH to WETH
          </CardTitle>
          <CardDescription className="text-gray-600">
            Convert your ETH to WETH to use as collateral
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ETH Balance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Your ETH Balance</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(parseFloat(ethBalance), 4)} ETH
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Wrap
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pr-20 text-lg text-black"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3"
                onClick={handleMaxClick}
                disabled={isLoading || parseFloat(ethBalance) <= 0}
              >
                MAX
              </Button>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                ≈ {formatCurrency((parseFloat(amount) || 0) * ethPrice)} USD
              </span>
            </div>

          </div>

          {/* Transaction Status */}
          {txHash && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-700">Wrapping ETH...</p>
                <p className="text-xs text-blue-600 font-mono mt-1">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 text-gray-700"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWrap}
              disabled={isDisabled}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {isLoading ? 'Wrapping...' : 'Wrap ETH'}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            <p>WETH is required to use as collateral for borrowing.</p>
            <p>You can unwrap WETH back to ETH anytime.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
