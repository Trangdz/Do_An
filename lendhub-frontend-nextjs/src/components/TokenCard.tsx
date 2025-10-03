import React from 'react';
import { useReserveAPR } from '../hooks/useReserveAPR';
import { formatPercentage, formatNumber, formatCurrency, formatBalance } from '../lib/math';
import { Button } from './ui/Button';
import { ethers } from 'ethers';

interface TokenCardProps {
  token: any;
  index: number;
  provider: ethers.Provider | null;
  poolAddress: string;
  onSupplyClick: () => void;
  onBorrowClick: () => void;
  onWithdrawClick: () => void;
  onRepayClick: () => void;
  onWrapEthClick: () => void;
}

export function TokenCard({
  token,
  index,
  provider,
  poolAddress,
  onSupplyClick,
  onBorrowClick,
  onWithdrawClick,
  onRepayClick,
  onWrapEthClick
}: TokenCardProps) {
  // Track price changes for animation
  const [prevPrice, setPrevPrice] = React.useState(token.price);
  const [priceChanged, setPriceChanged] = React.useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    if (token.price !== prevPrice) {
      setPriceChanged(token.price > prevPrice ? 'up' : 'down');
      setPrevPrice(token.price);
      
      // Clear animation after 1 second
      const timer = setTimeout(() => setPriceChanged(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [token.price]);

  // Real-time APR data (fetch every 5 seconds)
  const shouldFetchAPR = token.symbol !== 'ETH' && provider !== null && poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000';
  
  const aprData = useReserveAPR(
    shouldFetchAPR ? provider : null,
    poolAddress,
    token.address,
    5000 // Refresh every 5 seconds for real-time updates
  );

  // Use APR data from hook
  const supplyAPR = aprData?.supplyAPR || 0;
  const borrowAPR = aprData?.borrowAPR || 0;
  const utilization = aprData?.utilization || 0;

  // Track APR changes for animation
  const [prevSupplyAPR, setPrevSupplyAPR] = React.useState(supplyAPR);
  const [prevBorrowAPR, setPrevBorrowAPR] = React.useState(borrowAPR);
  const [aprChanged, setAprChanged] = React.useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    if (supplyAPR !== prevSupplyAPR || borrowAPR !== prevBorrowAPR) {
      const avgChange = ((supplyAPR - prevSupplyAPR) + (borrowAPR - prevBorrowAPR)) / 2;
      setAprChanged(avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : null);
      setPrevSupplyAPR(supplyAPR);
      setPrevBorrowAPR(borrowAPR);
      
      // Clear animation after 1 second
      const timer = setTimeout(() => setAprChanged(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [supplyAPR, borrowAPR]);

  return (
    <div className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white/50 backdrop-blur-sm">
      {/* Token Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
            index === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
            'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}>
            {token.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-lg text-gray-900">{token.symbol}</div>
            <div className="text-sm text-gray-500 font-mono">
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold transition-all duration-300 ${
            priceChanged === 'up' ? 'text-green-600 scale-110' :
            priceChanged === 'down' ? 'text-red-600 scale-110' :
            'text-gray-900'
          }`}>
            ${token.price.toLocaleString()}
            {priceChanged && (
              <span className="ml-2 text-sm">
                {priceChanged === 'up' ? '↗' : '↘'}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Current Price {priceChanged && <span className="text-xs ml-1 animate-pulse">●</span>}
          </div>
        </div>
      </div>

      {/* User Position */}
      {(token.userBalance > 0 || token.userSupply > 0 || token.userBorrow > 0) && (
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
          <div className="text-sm font-semibold text-indigo-800 mb-2">Your Position</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {(() => {
                  const bal = token.userBalance || 0;
                  if (token.symbol === 'WETH') {
                    const adjusted = bal > 1000000 ? bal - 1000000 : bal;
                    return `${formatBalance(adjusted, 4)} ${token.symbol}`;
                  }
                  return `${formatBalance(bal, 4)} ${token.symbol}`;
                })()}
              </div>
              <div className="text-xs text-blue-600/70">
                Wallet (${formatCurrency(token.userBalanceUSD || 0)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatNumber(token.userSupply || 0, 4)} {token.symbol}
              </div>
              <div className="text-xs text-green-600/70">
                Supplied (${formatCurrency(token.userSupplyUSD || 0)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {formatBalance(token.userBorrow || 0, { decimals: 4 })} {token.symbol}
              </div>
              <div className="text-xs text-red-600/70">
                Borrowed (${formatCurrency(token.userBorrowUSD || 0)})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid with Real-time APR Data */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`text-center p-3 rounded-lg transition-all duration-300 ${
          aprChanged === 'up' ? 'bg-green-100 ring-2 ring-green-400' :
          aprChanged === 'down' ? 'bg-red-100 ring-2 ring-red-400' :
          'bg-blue-50'
        }`}>
          <div className={`text-lg font-bold transition-all duration-300 ${
            aprChanged === 'up' ? 'text-green-600 scale-110' :
            aprChanged === 'down' ? 'text-red-600 scale-110' :
            'text-blue-600'
          }`}>
            {formatPercentage(supplyAPR)}
            {aprChanged && aprData?.isLoading === false && (
              <span className="ml-1 text-xs">
                {aprChanged === 'up' ? '↗' : '↘'}
              </span>
            )}
          </div>
          <div className="text-xs text-blue-600/70 flex items-center justify-center space-x-1">
            <span>Supply APR</span>
            {aprData?.isLoading && <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />}
            {!aprData?.isLoading && aprChanged && <span className="animate-pulse">●</span>}
          </div>
        </div>
        <div className={`text-center p-3 rounded-lg transition-all duration-300 ${
          aprChanged === 'up' ? 'bg-green-100 ring-2 ring-green-400' :
          aprChanged === 'down' ? 'bg-red-100 ring-2 ring-red-400' :
          'bg-green-50'
        }`}>
          <div className={`text-lg font-bold transition-all duration-300 ${
            aprChanged === 'up' ? 'text-green-700 scale-110' :
            aprChanged === 'down' ? 'text-red-700 scale-110' :
            'text-green-600'
          }`}>
            {formatPercentage(borrowAPR)}
            {aprChanged && aprData?.isLoading === false && (
              <span className="ml-1 text-xs">
                {aprChanged === 'up' ? '↗' : '↘'}
              </span>
            )}
          </div>
          <div className="text-xs text-green-600/70 flex items-center justify-center space-x-1">
            <span>Borrow APR</span>
            {aprData?.isLoading && <div className="w-2 h-2 border border-green-500 border-t-transparent rounded-full animate-spin" />}
            {!aprData?.isLoading && aprChanged && <span className="animate-pulse">●</span>}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-purple-50">
          <div className="text-lg font-bold text-purple-600">
            {formatPercentage(utilization)}
          </div>
          <div className="text-xs text-purple-600/70">Utilization</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50">
          <div className="text-lg font-bold text-gray-600">
            {formatNumber(token.availableLiquidity, 0)}
          </div>
          <div className="text-xs text-gray-600/70">Available</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {token.symbol === 'ETH' ? (
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
              onClick={onWrapEthClick}
            >
              🔄 Wrap ETH
            </Button>
          ) : (
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
              onClick={onSupplyClick}
            >
              💰 Supply {token.symbol}
            </Button>
          )}
          {token.symbol === 'ETH' || token.symbol === 'WETH' ? (
            <Button disabled className="w-full bg-gray-300 text-gray-500">
              💸 Not Borrowable
            </Button>
          ) : (
            <Button 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
              onClick={onBorrowClick}
            >
              💸 Borrow {token.symbol}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {token.symbol === 'ETH' ? (
            <Button disabled variant="outline" className="w-full border-gray-200 text-gray-400">
              📤 N/A
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={onWithdrawClick}
              disabled={token.userSupply <= 0}
            >
              📤 Withdraw
            </Button>
          )}
          {token.symbol === 'ETH' ? (
            <Button disabled variant="outline" className="w-full border-gray-200 text-gray-400">
              💳 N/A
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-green-200 text-green-600 hover:bg-green-50"
              onClick={onRepayClick}
              disabled={token.userBorrow <= 0}
            >
              💳 Repay
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

