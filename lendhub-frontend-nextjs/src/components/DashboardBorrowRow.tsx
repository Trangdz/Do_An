import { formatCurrency, formatNumber, formatPercentage } from '@/lib/math';
import { Button } from './ui/Button';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface DashboardBorrowRowProps {
  borrow: {
    address: string;
    symbol: string;
    borrowBalance?: number;
    borrowBalanceUSD?: number;
    available?: number; // available to borrow in tokens (market mode)
  };
  onRepayClick: () => void; // reused as onBorrowClick in market mode
  provider: ethers.Provider | null;
  isConnected: boolean;
}

export function DashboardBorrowRow({ borrow, onRepayClick, provider, isConnected }: DashboardBorrowRowProps) {
  const router = useRouter();
  
  // Get icon path
  const getIconPath = (symbol: string): string => {
    const symbolLower = symbol.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'eth': '/image/eth.svg',
      'weth': '/image/weeth.svg',
      'dai': '/image/dai.svg',
      'usdc': '/image/usdc.svg',
      'link': '/image/link.svg',
    };
    return iconMap[symbolLower] || '/image/eth.svg';
  };
  
  // Use same logic as TokenCard - useSharedAPR instead of useReserveAPR
  const shouldFetchAPR = borrow.symbol !== 'ETH' && isConnected && provider !== null;
  
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    CONFIG.LENDING_POOL,
    borrow.address,
    30000
  );
  
  // Use APR data from hook (same as TokenCard)
  const borrowAPR = aprData?.borrowAPR || 0;

  const isMarketMode = typeof borrow.available === 'number';
  const displayAmount = isMarketMode ? (borrow.available || 0) : (borrow.borrowBalance || 0);
  const displayAmountUSD = isMarketMode ? 0 : (borrow.borrowBalanceUSD || 0);
  const hasBalance = isMarketMode ? displayAmount > 0 : (displayAmount > 0 || displayAmountUSD > 0);

  const handleRowClick = () => {
    if (!isMarketMode && hasBalance) {
      // Navigate to detail page for borrowed assets
      router.push(`/borrow/${borrow.symbol}`);
    }
  };

  return (
    <tr 
      className={`border-b border-border/60 hover:bg-accent/50 ${!isMarketMode && hasBalance ? 'cursor-pointer' : ''}`}
      onClick={handleRowClick}
    >
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <Image 
            src={getIconPath(borrow.symbol)} 
            alt={borrow.symbol} 
            width={32} 
            height={32}
            className="rounded-full"
          />
          <span className="font-medium">{borrow.symbol}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <div className={hasBalance ? '' : 'text-muted-foreground'}>
          {formatNumber(displayAmount, 4)} {borrow.symbol}
        </div>
        {displayAmountUSD > 0 && (
          <div className="text-xs text-muted-foreground">
            {formatCurrency(displayAmountUSD)}
          </div>
        )}
      </td>
      <td className="py-3 px-2">
        {aprData?.isLoading ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-red-600 font-medium">
            {borrowAPR > 0 ? formatPercentage(borrowAPR) : '—'}
          </span>
        )}
      </td>
      <td className="py-3 px-2">
        {isMarketMode ? (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onRepayClick();
            }}
            disabled={!hasBalance}
          >
            Borrow
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground">Click to view details</div>
        )}
      </td>
    </tr>
  );
}
