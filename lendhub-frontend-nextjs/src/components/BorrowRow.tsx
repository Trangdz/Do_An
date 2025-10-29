import { formatCurrency, formatPercentage } from '@/lib/math';
import { Button } from './ui/Button';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';

interface BorrowRowProps {
  asset: {
    address: string;
    symbol: string;
    reserveCash: string;
  };
  onClick: () => void;
  provider: ethers.Provider | null;
  isConnected: boolean;
}

export function BorrowRow({ asset, onClick, provider, isConnected }: BorrowRowProps) {
  // Use same logic as TokenCard - useSharedAPR with same conditions
  const shouldFetchAPR = asset.symbol !== 'ETH' && isConnected && provider !== null && CONFIG.LENDING_POOL && CONFIG.LENDING_POOL !== '0x0000000000000000000000000000000000000000';
  
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    CONFIG.LENDING_POOL,
    asset.address,
    30000
  );
  
  // Use APR data from hook (same as TokenCard)
  const borrowAPR = aprData?.borrowAPR || 0;

  return (
    <tr className="border-b border-border/60 hover:bg-accent/50 transition-colors">
      <td className="py-4 font-medium">{asset.symbol}</td>
      <td className="py-4">{formatCurrency(parseFloat(asset.reserveCash || '0'))}</td>
      <td className="py-4">
        {aprData?.isLoading ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-primary font-medium">
            {borrowAPR > 0 ? formatPercentage(borrowAPR) : '—'}
          </span>
        )}
      </td>
      <td className="py-4 text-muted-foreground">—</td>
      <td className="py-4 text-right">
        <Button size="sm" variant="secondary" onClick={onClick}>Borrow</Button>
      </td>
    </tr>
  );
}
