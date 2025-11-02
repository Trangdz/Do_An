import { formatCurrency, formatPercentage } from '@/lib/math';
import { Button } from './ui/Button';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';
import Image from 'next/image';

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
  
  // Use same logic as TokenCard - useSharedAPR with same conditions
  const shouldFetchAPR = asset.symbol !== 'ETH' && isConnected && provider !== null && !!CONFIG.LENDING_POOL;
  
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
