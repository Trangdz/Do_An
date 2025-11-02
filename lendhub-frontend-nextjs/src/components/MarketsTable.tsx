import React from 'react';
import { ethers } from 'ethers';
import { useChainlinkPrice } from '@/hooks/useChainlinkPrice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface MarketAsset {
  symbol: string;
  name: string;
  address: string;
  icon: string;
  aggregatorAddress?: string;
  supplyAPR?: number;
  borrowAPR?: number;
  totalSupply?: string;
  totalBorrow?: string;
  utilization?: number;
}

interface MarketsTableProps {
  assets: MarketAsset[];
}

function AssetRow({ asset }: { asset: MarketAsset }) {
  // Đọc giá từ Chainlink Aggregator (nếu có)
  const chainlinkPrice = useChainlinkPrice(
    asset.aggregatorAddress || ethers.ZeroAddress,
    30000 // Cập nhật mỗi 30s
  );

  const price = chainlinkPrice.price || 0;
  const isLive = !chainlinkPrice.isLoading && !chainlinkPrice.error && price > 0;

  return (
    <div className="grid grid-cols-7 gap-4 p-4 border-b border-border hover:bg-muted/50 transition-colors">
      {/* Asset info */}
      <div className="col-span-2 flex items-center gap-3">
        <img 
          src={asset.icon} 
          alt={asset.symbol} 
          className="w-10 h-10 rounded-full"
          onError={(e) => { e.currentTarget.src = '/image/eth.svg'; }}
        />
        <div>
          <div className="font-semibold text-foreground">{asset.symbol}</div>
          <div className="text-xs text-muted-foreground">{asset.name}</div>
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col justify-center">
        <div className="text-sm font-medium text-foreground">
          {isLive ? (
            <span className="flex items-center gap-1">
              ${price.toFixed(2)}
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live from Chainlink Oracle"></span>
            </span>
          ) : chainlinkPrice.isLoading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        {isLive && (
          <div className="text-xs text-muted-foreground">
            {chainlinkPrice.updatedAt.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Supply APR */}
      <div className="flex flex-col justify-center">
        <div className="text-sm font-medium text-green-600">
          {asset.supplyAPR ? `${asset.supplyAPR.toFixed(2)}%` : '—'}
        </div>
        <div className="text-xs text-muted-foreground">Supply APR</div>
      </div>

      {/* Borrow APR */}
      <div className="flex flex-col justify-center">
        <div className="text-sm font-medium text-orange-600">
          {asset.borrowAPR ? `${asset.borrowAPR.toFixed(2)}%` : '—'}
        </div>
        <div className="text-xs text-muted-foreground">Borrow APR</div>
      </div>

      {/* Total Supply */}
      <div className="flex flex-col justify-center">
        <div className="text-sm font-medium text-foreground">
          {asset.totalSupply || '—'}
        </div>
        <div className="text-xs text-muted-foreground">
          {price > 0 && asset.totalSupply ? 
            `$${(parseFloat(asset.totalSupply.replace(/,/g, '')) * price).toLocaleString()}` 
            : '—'}
        </div>
      </div>

      {/* Utilization */}
      <div className="flex flex-col justify-center">
        <div className="text-sm font-medium text-foreground">
          {asset.utilization !== undefined ? `${asset.utilization.toFixed(1)}%` : '—'}
        </div>
        <div className="text-xs text-muted-foreground">Utilization</div>
      </div>
    </div>
  );
}

export function MarketsTable({ assets }: MarketsTableProps) {
  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Markets Overview</CardTitle>
        <CardDescription className="text-muted-foreground">
          Real-time prices from Chainlink Oracle • APR/APY dynamically calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-7 gap-4 p-4 border-b-2 border-border bg-muted/30">
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Asset</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">Price</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">Supply APR</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">Borrow APR</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">Total Supply</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">Utilization</div>
        </div>

        {/* Rows */}
        {assets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No assets available
          </div>
        ) : (
          assets.map((asset) => (
            <AssetRow key={asset.address} asset={asset} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

