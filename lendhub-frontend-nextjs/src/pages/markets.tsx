import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { CONFIG } from '@/config/contracts';
import { PriceOracleAddress, LendingPoolAddress } from '@/addresses';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { useReserveAPR } from '@/hooks/useReserveAPR';
import { useChainlinkPrice } from '@/hooks/useChainlinkPrice';
import useMultiPriceAggregator from '@/hooks/useMultiPriceAggregator';
import { formatPercentage } from '@/lib/math';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

// Get icon path for token
function getIconPath(symbol: string): string {
  const symbolLower = symbol.toLowerCase();
  const iconMap: { [key: string]: string } = {
    'eth': '/image/eth.svg',
    'weth': '/image/weeth.svg',
    'dai': '/image/dai.svg',
    'usdc': '/image/usdc.svg',
    'link': '/image/link.svg',
  };
  return iconMap[symbolLower] || '/image/eth.svg';
}

// Token icon component using actual images
function TokenIcon({ symbol }: { symbol: string }) {
  const [imageError, setImageError] = useState(false);
  const colors: Record<string, string> = {
    ETH: 'from-blue-500 to-purple-600',
    WETH: 'from-blue-400 to-purple-500',
    DAI: 'from-yellow-400 to-orange-500',
    USDC: 'from-blue-500 to-blue-600',
    LINK: 'from-blue-600 to-indigo-700',
  };
  
  // If image failed to load, show gradient fallback
  if (imageError) {
    return (
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[symbol] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
        {symbol.substring(0, 1)}
      </div>
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-muted">
      <Image
        src={getIconPath(symbol)}
        alt={symbol}
        width={40}
        height={40}
        className="rounded-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

// Market row component with APY/APR
function MarketRow({ token, poolAddress }: any) {
  // Get APR data for this token (hooks now use direct RPC to avoid circuit breaker)
  // getReserveAPRData will handle zero address (ETH) gracefully and return default values
  // Refresh every 10 seconds to update after transactions
  const { supplyAPR, borrowAPR, utilization, totalSupplied, totalBorrowed, isLoading } = useReserveAPR(
    null, // Provider no longer needed - hook uses direct RPC
    poolAddress,
    token.address, // Zero address for ETH is handled gracefully in getReserveAPRData
    10000 // Refresh every 10s to update quickly after transactions
  );
  
  // Prefer MultiPriceAggregator if configured, otherwise fallback to per-token aggregator
  const multiAddr = (CONFIG as any).MULTI_PRICE_AGGREGATOR || '';
  const { price: multiPrice, isLoading: multiLoading, error: multiError } = useMultiPriceAggregator(
    multiAddr,
    token.symbol,
    60000 // Update every 1 minute (60000ms)
  );

  // Only call per-token Chainlink hook when MultiPriceAggregator is not configured
  const enablePerToken = !multiAddr;
  const perToken = enablePerToken
    ? useChainlinkPrice(token.aggregatorAddress || '', 30000)
    : { price: 0, isLoading: false, error: null as any };
  const chainlinkPrice = perToken.price;
  const priceLoading = perToken.isLoading;
  const priceError = perToken.error as any;
  
  // Use Chainlink price if available, otherwise fallback to 0
  // If there's an error but it's a NoData error, still show 0 (not an error)
  const price = multiAddr
    ? (multiError ? 0 : (multiPrice || 0))
    : ((priceError && !priceError.includes('NoData')) ? 0 : (chainlinkPrice || 0));
  
  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
    return `${(num / 1000000).toFixed(2)}M`;
  };
  
  return (
    <tr className="border-b border-border hover:bg-accent/5 transition-colors">
      {/* Asset */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <TokenIcon symbol={token.symbol} />
          <div>
            <div className="font-semibold text-foreground">{token.symbol}</div>
            <div className="text-xs text-muted-foreground">{token.name}</div>
          </div>
        </div>
      </td>
      
      {/* Price */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          {multiLoading ? (
            <div className="animate-pulse bg-muted h-5 w-16 rounded"></div>
          ) : (
            <span className="font-semibold text-foreground">
              {price && price > 0 ? `$${price.toFixed(2)}` : '—'}
            </span>
          )}
        </div>
      </td>
      
      {/* Total Supplied */}
      <td className="py-4 px-4">
        <div className="text-foreground">
          {isLoading ? (
            <div className="animate-pulse bg-muted h-5 w-20 rounded"></div>
          ) : (
            <div>
              <div className="font-medium">{formatNumber(totalSupplied)} {token.symbol}</div>
              <div className="text-xs text-muted-foreground">
                ${formatNumber(parseFloat(totalSupplied) * (price || 0))}
              </div>
            </div>
          )}
        </div>
      </td>
      
      {/* Supply APY */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          {isLoading ? (
            <div className="animate-pulse bg-muted h-5 w-16 rounded"></div>
          ) : (
            <span className="font-semibold text-green-600">
              {formatPercentage(supplyAPR)}
            </span>
          )}
        </div>
      </td>
      
      {/* Total Borrowed */}
      <td className="py-4 px-4">
        <div className="text-foreground">
          {isLoading ? (
            <div className="animate-pulse bg-muted h-5 w-20 rounded"></div>
          ) : (
            <div>
              <div className="font-medium">{formatNumber(totalBorrowed)} {token.symbol}</div>
              <div className="text-xs text-muted-foreground">
                ${formatNumber(parseFloat(totalBorrowed) * (price || 0))}
              </div>
            </div>
          )}
        </div>
      </td>
      
      {/* Borrow APR */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-500" />
          {isLoading ? (
            <div className="animate-pulse bg-muted h-5 w-16 rounded"></div>
          ) : token.isBorrowable === false ? (
            <span className="text-xs text-muted-foreground">N/A</span>
          ) : (
            <span className="font-semibold text-red-600">
              {formatPercentage(borrowAPR)}
            </span>
          )}
        </div>
      </td>
      
      {/* Utilization */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          {isLoading ? (
            <div className="animate-pulse bg-muted h-5 w-16 rounded"></div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {formatPercentage(utilization / 100)}
              </span>
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    utilization > 80 ? 'bg-red-500' : 
                    utilization > 60 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function MarketsPage() {
  const { metamaskDetails } = useLendContext();
  const isConnected = !!metamaskDetails.currentAccount;
  
  // Get all tokens including ETH (ETH price is available from MultiPriceAggregator)
  const tokens = CONFIG.TOKENS;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Markets</h1>
          <p className="text-muted-foreground">
            Overview
          </p>
        </div>

        {/* Connection Warning */}
        {!isConnected && (
          <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
                <Activity className="w-5 h-5" />
                <span className="font-medium">
                  Connect your wallet to see real-time data
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Markets Table */}
        <Card className="bg-card/80 backdrop-blur">
        <CardHeader>
            <CardTitle className="text-xl text-foreground">All Markets</CardTitle>
            <CardDescription className="text-muted-foreground">
              
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Asset</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Price (USD)</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Total Supplied</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Supply APY</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Total Borrowed</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Borrow APR</th>
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <MarketRow
                      key={token.address}
                      token={token}
                      poolAddress={LendingPoolAddress}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                  <div>
                    <div className="font-medium text-foreground">Supply APY</div>
                    <div className="text-xs text-muted-foreground">Interest earned on deposits</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                  <div>
                    <div className="font-medium text-foreground">Borrow APR</div>
                    <div className="text-xs text-muted-foreground">Interest paid on loans</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div>
                    <div className="font-medium text-foreground">Utilization</div>
                    <div className="text-xs text-muted-foreground">Borrowed / Supplied ratio</div>
                  </div>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                Price Oracle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All prices are fetched from Chainlink Oracle in real-time. 
                Prices update automatically every 1 minute.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Dynamic Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Interest rates adjust automatically based on supply and demand. 
                Higher utilization = higher rates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
