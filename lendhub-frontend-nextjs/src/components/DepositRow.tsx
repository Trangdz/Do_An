import { formatCurrency, formatPercentage, formatNumber } from '@/lib/math';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useRouter } from 'next/router';

interface DepositRowProps {
  asset: {
    address: string;
    symbol: string;
    balance: string;
    balanceUSD?: number | string;
  };
  provider: ethers.Provider | null;
  isConnected: boolean;
}

export function DepositRow({ asset, provider, isConnected }: DepositRowProps) {
  const router = useRouter();
  
  // Navigate to detail page instead of opening modal
  const handleClick = () => {
    router.push(`/deposit/${asset.symbol}`);
  };

  // Use same logic as TokenCard - useSharedAPR with same conditions
  const shouldFetchAPR = asset.symbol !== 'ETH' && isConnected && provider !== null;
  
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    CONFIG.LENDING_POOL,
    asset.address !== '0x0000000000000000000000000000000000000000' ? asset.address : '',
    30000
  );
  
  // Use APR data from hook (APR biến đổi theo cung cầu từ smart contract)
  const supplyAPR = aprData?.supplyAPR || 0;
  
  // Convert APR to APY with compound interest
  // APY = (1 + APR/n)^n - 1, where n = SECONDS_PER_YEAR (compound every second)
  const SECONDS_PER_YEAR = 31536000;
  const calculateAPY = (apr: number): number => {
    if (apr <= 0) return 0;
    const aprDecimal = apr / 100; // Convert percentage to decimal (1% = 0.01)
    // Compound every second: APY = (1 + APR/31536000)^31536000 - 1
    const apy = Math.pow(1 + aprDecimal / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
    return apy * 100; // Convert back to percentage
  };
  const supplyAPY = calculateAPY(supplyAPR);

  // Get icon path based on symbol
  const getIconPath = (symbol: string): string => {
    const symbolLower = symbol.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'eth': '/image/eth.svg',
      'weth': '/image/weeth.svg',
      'dai': '/image/dai.svg',
      'usdc': '/image/usdc.svg',
      'link': '/image/link.svg',
      'pepe': '/image/pepe.svg',
    };
    return iconMap[symbolLower] || '/image/eth.svg'; // fallback to ETH icon
  };

  return (
    <tr 
      className="border-b border-border/60 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <td className="py-4">
        <div className="flex items-center gap-2">
          <Image
            src={getIconPath(asset.symbol)}
            alt={asset.symbol}
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-medium">{asset.symbol}</span>
        </div>
      </td>
      <td className="py-4">
        <div>
          <div>
            {(() => {
              const balanceNum = parseFloat(asset.balance || '0');
              // Always show 4 decimals for token amounts
              const formatted = balanceNum === 0 ? '0.0000' : balanceNum.toFixed(4);
              return `${formatted} ${asset.symbol}`;
            })()}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(typeof asset.balanceUSD === 'number' ? asset.balanceUSD : parseFloat(String(asset.balanceUSD || 0)))}
          </div>
        </div>
      </td>
      <td className="py-4">
        {asset.symbol === 'ETH' ? (
          <span className="text-muted-foreground">—</span>
        ) : aprData?.isLoading ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-primary font-medium">
            {Number.isFinite(supplyAPY) ? formatPercentage(Math.max(0, supplyAPY)) : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}
