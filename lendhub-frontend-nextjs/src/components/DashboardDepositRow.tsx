import { formatCurrency, formatNumber, formatPercentage } from '@/lib/math';
import { Button } from './ui/Button';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DashboardDepositRowProps {
  deposit: {
    address: string;
    symbol: string;
    walletBalance?: number;
    walletBalanceUSD?: number;
    supplyBalance: number;
    supplyBalanceUSD: number;
  };
  onWithdrawClick: () => void;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  onRefresh?: () => void;
}

export function DashboardDepositRow({ deposit, onWithdrawClick, provider, signer, isConnected, onRefresh }: DashboardDepositRowProps) {
  const [isCollateral, setIsCollateral] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Use same logic as TokenCard - useSharedAPR instead of useReserveAPR
  const shouldFetchAPR = deposit.symbol !== 'ETH' && isConnected && provider !== null;
  
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    CONFIG.LENDING_POOL,
    deposit.address !== '0x0000000000000000000000000000000000000000' ? deposit.address : '',
    30000
  );
  
  // Use APR data from hook (APR biến đổi theo cung cầu từ smart contract)
  const supplyAPR = aprData?.supplyAPR || 0;
  
  // Convert APR to APY with compound interest
  // APY = (1 + APR/n)^n - 1, where n = SECONDS_PER_YEAR (compound every second)
  // For small APR values (< 10%), APY ≈ APR, but we calculate exactly
  const SECONDS_PER_YEAR = 31536000;
  const calculateAPY = (apr: number): number => {
    if (apr <= 0) return 0;
    const aprDecimal = apr / 100; // Convert percentage to decimal (1% = 0.01)
    // Compound every second: APY = (1 + APR/31536000)^31536000 - 1
    const apy = Math.pow(1 + aprDecimal / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
    return apy * 100; // Convert back to percentage
  };
  const supplyAPY = calculateAPY(supplyAPR);

  // Use wallet balance (deployed amount) as primary display, fallback to supply balance
  const currentBalance = deposit.walletBalance !== undefined ? deposit.walletBalance : deposit.supplyBalance;
  const currentBalanceUSD = deposit.walletBalanceUSD !== undefined ? deposit.walletBalanceUSD : deposit.supplyBalanceUSD;
  const hasBalance = currentBalance > 0 || currentBalanceUSD > 0;
  const hasSupply = deposit.supplyBalance > 0;

  // Check collateral status
  useEffect(() => {
    const checkCollateralStatus = async () => {
      if (!provider || !signer || !CONFIG.LENDING_POOL || !hasSupply) {
        setIsCollateral(false);
        return;
      }
      
      try {
        const abi = [
          'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
        ];
        const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, provider);
        const userAddress = await signer.getAddress();
        const userReserve = await pool.userReserves(userAddress, deposit.address);
        setIsCollateral(userReserve.useAsCollateral);
      } catch (error) {
        console.error('Error checking collateral status:', error);
        setIsCollateral(false);
      }
    };
    
    checkCollateralStatus();
  }, [provider, signer, deposit.address, hasSupply]);

  // Toggle collateral
  const handleToggleCollateral = async () => {
    if (!signer || !CONFIG.LENDING_POOL || !hasSupply) return;
    
    try {
      const abi = [
        'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, signer);
      
      setIsToggling(true);
      
      // Pre-check: Get account data to warn if needed
      try {
        const userAddress = await signer.getAddress();
        const accountData = await pool.getAccountData(userAddress);
        const { debtValue1e18, healthFactor1e18 } = accountData;
        
        // If disabling (currently ON, will turn OFF) and user has debt with HF < 2, warn them
        if (isCollateral && debtValue1e18 > BigInt(0) && healthFactor1e18 < ethers.parseEther('2.0')) {
          const confirmDisable = confirm(
            `⚠️ WARNING: Your Health Factor is ${(Number(healthFactor1e18) / 1e18).toFixed(2)}\n\n` +
            `Disabling this collateral may make your position LIQUIDATABLE!\n\n` +
            `Continue anyway?`
          );
          if (!confirmDisable) {
            setIsToggling(false);
            return;
          }
        }
      } catch (checkError) {
        console.warn('Could not check account data:', checkError);
      }
      
      // 1) Static call to surface revert reason clearly (instead of opaque estimateGas error)
      try {
        await pool.getFunction('setUserUseReserveAsCollateral').staticCall(
          deposit.address,
          !isCollateral
        );
      } catch (simError: any) {
        const simReason = simError?.reason || simError?.shortMessage || simError?.message || '';
        console.error('Static call failed (toggle collateral):', simReason);
        if (simReason) {
          alert(`❌ Cannot toggle collateral\n\n${simReason}`);
        } else {
          alert('❌ Cannot toggle collateral (simulation failed). Please ensure you have supply and correct network.');
        }
        setIsToggling(false);
        return;
      }

      // 2) Estimate gas (best effort). If node can\'t estimate, send with safe fallback.
      let estimatedGas;
      try {
        estimatedGas = await pool.setUserUseReserveAsCollateral.estimateGas(
          deposit.address,
          !isCollateral
        );
      } catch (estError: any) {
        console.warn('Gas estimation failed; using fallback gas limit. Error:', estError?.message || estError);
      }
      
      const txOptions: any = {};
      if (estimatedGas) {
        txOptions.gasLimit = estimatedGas * BigInt(120) / BigInt(100); // Add 20% buffer
      }
      
      const tx = await pool.setUserUseReserveAsCollateral(
        deposit.address, 
        !isCollateral,
        {
          ...(txOptions || {}),
          // If estimate failed, include a conservative fallback gasLimit
          gasLimit: (txOptions?.gasLimit as bigint) || (250000n)
        }
      );
      
      await tx.wait();
      
      setIsCollateral(!isCollateral);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('❌ Error toggling collateral:', error);
      
      const revertReason = error?.error?.message || error?.reason || error?.shortMessage || error?.message || '';
      
      if (revertReason.includes('Health factor would be < 1') || revertReason.includes('Health factor')) {
        alert('❌ CANNOT DISABLE COLLATERAL!\n\n⚠️ Safety Check Failed:\n\nYou have DEBT and this is your ONLY collateral.\n\nDisabling would make:\n• Health Factor < 1.00\n• Your position LIQUIDATABLE!\n\n✅ TO FIX:\n1. Repay ALL your debt first\n   OR\n2. Enable another asset as collateral\n3. Then disable this one\n\n🛡️ Protocol protects you!');
        return;
      }
      
      if (revertReason.includes('Asset cannot be used as collateral')) {
        alert('❌ Asset cannot be used as collateral\n\nThis asset has LTV = 0%.');
        return;
      }
      
      alert(`❌ Error toggling collateral\n\n${revertReason || 'Transaction failed'}\n\nSee console for details.`);
    } finally {
      setIsToggling(false);
    }
  };

  // Get icon path based on symbol
  const getIconPath = (symbol: string): string => {
    const symbolLower = symbol.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'eth': '/image/eth.svg',
      'weth': '/image/weeth.svg',
      'dai': '/image/dai.svg',
      'usdc': '/image/usdc.svg',
      'link': '/image/link.svg',
    };
    return iconMap[symbolLower] || '/image/eth.svg'; // fallback to ETH icon
  };

  return (
    <tr className="border-b border-border/60 hover:bg-accent/50">
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <Image
            src={getIconPath(deposit.symbol)}
            alt={deposit.symbol}
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="font-medium">{deposit.symbol}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <div className={hasBalance ? '' : 'text-muted-foreground'}>
          {formatNumber(currentBalance, 4)} {deposit.symbol}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(currentBalanceUSD)}
        </div>
      </td>
      <td className="py-3 px-2">
        {deposit.symbol === 'ETH' ? (
          <span className="text-muted-foreground">—</span>
        ) : aprData?.isLoading ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-primary font-medium">
            {Number.isFinite(supplyAPY) ? formatPercentage(Math.max(0, supplyAPY)) : '—'}
          </span>
        )}
      </td>
      <td className="py-3 px-2">
        {hasSupply ? (
          <button
            onClick={handleToggleCollateral}
            disabled={isToggling}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isCollateral ? 'bg-green-500' : 'bg-gray-300'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isCollateral ? 'Click to disable collateral' : 'Click to enable collateral'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                isCollateral ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3 px-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onWithdrawClick}
          disabled={false}
        >
          Supply
        </Button>
      </td>
    </tr>
  );
}

