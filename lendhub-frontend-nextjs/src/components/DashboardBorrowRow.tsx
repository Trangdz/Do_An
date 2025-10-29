import { formatCurrency, formatNumber, formatPercentage } from '@/lib/math';
import { Button } from './ui/Button';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';

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

  return (
    <tr className="border-b border-border/60 hover:bg-accent/50">
      <td className="py-3 px-2 font-medium">{borrow.symbol}</td>
      <td className="py-3 px-2">
        <div className={hasBalance ? '' : 'text-muted-foreground'}>
          {formatNumber(displayAmount, 4)} {borrow.symbol}
        </div>
        {!isMarketMode && (
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
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRepayClick}
          disabled={!hasBalance}
        >
          {isMarketMode ? 'Borrow' : 'Repay'}
        </Button>
      </td>
    </tr>
  );
}
