import React from 'react';
import { useSharedAPR } from '../hooks/useSharedAPR';
import { useRealtimeInterest } from '../hooks/useRealtimeInterest';
import { RealtimeBalanceCompact } from './RealtimeInterestBalance';
import { OnChainRealtimeBalance } from './OnChainRealtimeBalance';
// import { DebugOnChain } from './DebugOnChain';
import { formatPercentage, formatNumber, formatCurrency, formatBalance } from '../lib/math';
import { Button } from './ui/Button';
import { ethers } from 'ethers';
import { getReadOnlyContract } from '@/lib/readProvider';

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
  signer?: ethers.JsonRpcSigner | null;
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
  onWrapEthClick,
  signer
}: TokenCardProps) {
  // Track price changes for animation
  const [prevPrice, setPrevPrice] = React.useState(token.price);
  const [priceChanged, setPriceChanged] = React.useState<'up' | 'down' | null>(null);
  
  // Collateral toggle state
  const [isCollateral, setIsCollateral] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  React.useEffect(() => {
    if (token.price !== prevPrice) {
      setPriceChanged(token.price > prevPrice ? 'up' : 'down');
      setPrevPrice(token.price);
      
      // Clear animation after 1 second
      const timer = setTimeout(() => setPriceChanged(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [token.price]);

  // Debug: Log signer info
  console.log('🔍 TokenCard signer debug:', {
    tokenSymbol: token.symbol,
    hasSigner: !!signer,
    signerType: typeof signer,
    signerAddress: signer?.address,
    signerAddressType: typeof signer?.address,
    signerAddressLength: signer?.address?.length
  });

  // Real-time interest data for supply position
  const supplyInterestData = useRealtimeInterest(
    provider,
    poolAddress,
    signer?.address || null,
    token.address,
    30000, // Refresh every 30 seconds (reduced to avoid circuit breaker)
    true  // isSupply
  );

  // Real-time interest data for borrow position
  const borrowInterestData = useRealtimeInterest(
    provider,
    poolAddress,
    signer?.address || null,
    token.address,
    30000, // Refresh every 30 seconds (reduced to avoid circuit breaker)
    false // isSupply = false for borrow
  );

  // Real-time APR data (fetch every 30 seconds)
  const shouldFetchAPR = token.symbol !== 'ETH' && provider !== null && poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000';
  
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    poolAddress,
    token.address,
    30000
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

  // Check collateral status
  React.useEffect(() => {
    const checkCollateralStatus = async () => {
      if (!provider || !signer || !poolAddress || token.userSupply <= 0) return;
      
      try {
        const abi = [
          'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
        ];
        const pool = getReadOnlyContract(poolAddress, abi, provider);
        const userAddress = await signer.getAddress();
        const userReserve = await pool.userReserves(userAddress, token.address);
        setIsCollateral(userReserve.useAsCollateral);
      } catch (error) {
        console.error('Error checking collateral status:', error);
      }
    };
    
    checkCollateralStatus();
  }, [provider, signer, poolAddress, token.address, token.userSupply]);

  // Toggle collateral with detailed error handling
  const handleToggleCollateral = async () => {
    if (!signer || !poolAddress) return;
    
    try {
      const abi = [
        'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
        'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
      ];
      const pool = new ethers.Contract(poolAddress, abi, signer);
      
      setIsToggling(true);
      
      // Pre-check: Get account data to show helpful message if needed
      try {
        const userAddress = await signer.getAddress();
        const accountData = await pool.getAccountData(userAddress);
        const { collateralValue1e18, debtValue1e18, healthFactor1e18 } = accountData;
        
        console.log('Current account:', {
          collateral: ethers.formatEther(collateralValue1e18),
          debt: ethers.formatEther(debtValue1e18),
          healthFactor: ethers.formatEther(healthFactor1e18)
        });
        
        // If disabling and user has debt with HF < 2, warn them
        if (!isCollateral && debtValue1e18 > BigInt(0) && healthFactor1e18 < ethers.parseEther('2.0')) {
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
      
      // Try to execute transaction with better gas estimation
      let estimatedGas;
      try {
        estimatedGas = await pool.setUserUseReserveAsCollateral.estimateGas(
          token.address, 
          !isCollateral
        );
        console.log('Estimated gas:', estimatedGas.toString());
      } catch (estError: any) {
        // If estimate fails, extract revert reason
        const estReason = estError?.reason || estError?.shortMessage || estError?.message || '';
        console.error('Gas estimation failed:', estReason);
        
        // Show specific error message based on revert reason
        if (estReason.includes('Health factor would be < 1') || estReason.includes('Health factor')) {
          alert('❌ CANNOT DISABLE COLLATERAL!\n\n⚠️ Safety Check Failed:\n\nYou have DEBT and this is your ONLY collateral.\n\nDisabling would make:\n• Health Factor < 1.00\n• Your position LIQUIDATABLE!\n\n✅ TO FIX:\n1. Repay ALL your debt first\n   OR\n2. Enable another asset as collateral\n3. Then disable this one\n\n🛡️ Protocol protects you!');
          setIsToggling(false);
          return;
        }
        
        if (estReason.includes('Asset cannot be used as collateral')) {
          alert('❌ Asset cannot be used as collateral\n\nThis asset has LTV = 0%.');
          setIsToggling(false);
          return;
        }
        
        if (estReason.includes('No supply balance')) {
          alert('❌ No supply balance\n\nYou must supply this asset first.');
          setIsToggling(false);
          return;
        }
        
        // For other revert reasons, still try to send tx
        console.warn('Continuing despite estimation failure');
      }
      
      const txOptions: any = {};
      if (estimatedGas) {
        txOptions.gasLimit = estimatedGas * BigInt(120) / BigInt(100); // Add 20% buffer
      }
      
      const tx = await pool.setUserUseReserveAsCollateral(
        token.address, 
        !isCollateral,
        txOptions
      );
      
      const receipt = await tx.wait();
      
      console.log('✅ Collateral toggle successful:', receipt);
      
      setIsCollateral(!isCollateral);
      
      if (window.location.reload) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      console.error('❌ Error toggling collateral:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Try to extract revert reason from error
      let revertReason = '';
      let errorCode = '';
      
      // Check different error structures
      if (error?.error?.message) {
        revertReason = error.error.message;
        errorCode = error.error.code;
      } else if (error?.data?.message) {
        revertReason = error.data.message;
      } else if (error?.reason) {
        revertReason = error.reason;
      } else if (error?.shortMessage) {
        // ethers v6 format
        revertReason = error.shortMessage;
        // Try to extract revert reason from data
        if (error.data) {
          try {
            const decoded = error.info?.error?.data;
            if (decoded && typeof decoded === 'string' && decoded.startsWith('0x08c379a0')) {
              // Error(string) selector - extract actual message
              revertReason = 'Transaction reverted';
            }
          } catch (e) {}
        }
      } else if (error?.message) {
        revertReason = error.message;
      } else if (typeof error === 'string') {
        revertReason = error;
      }
      
      console.log('Extracted revert reason:', revertReason);
      
      // Check for specific revert reasons
      if (revertReason.includes('Health factor would be < 1') || revertReason.includes('Health factor')) {
        alert('❌ CANNOT DISABLE COLLATERAL!\n\n⚠️ Safety Check Failed:\n\nYou have DEBT and this is your ONLY collateral.\n\nDisabling would make:\n• Health Factor < 1.00\n• Your position LIQUIDATABLE!\n\n✅ TO FIX:\n1. Repay ALL your debt first\n   OR\n2. Enable another asset as collateral\n3. Then disable this one\n\n🛡️ Protocol protects you!');
        return;
      }
      
      if (revertReason.includes('Asset cannot be used as collateral')) {
        alert('❌ Asset cannot be used as collateral\n\nThis asset has LTV = 0%.');
        return;
      }
      
      if (revertReason.includes('No supply balance')) {
        alert('❌ No supply balance\n\nYou must supply this asset first.');
        return;
      }
      
      if (errorCode === '-32603' || parseInt(errorCode) === -32603 || revertReason.includes('Internal JSON-RPC')) {
        // This usually means the transaction reverted but we couldn't get the reason
        alert('❌ TRANSACTION REVERTED!\n\n⚠️ Likely reason: You cannot disable this collateral.\n\nWhy?\n• You have DEBT\n• This is your only collateral\n• Disabling → Health Factor < 1\n\n✅ SOLUTIONS:\n1. Repay all debt\n2. Enable another asset as collateral first\n3. Then try again\n\n💡 Check the "Borrows" section for your current debt.');
        return;
      }
      
      // Generic error
      alert(`❌ Error toggling collateral\n\n${revertReason || 'Transaction failed'}\n\nSee console for details.`);
    } finally {
      setIsToggling(false);
    }
  };

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
            {/* Collateral Toggle Switch */}
            <div className="mt-2 flex items-center space-x-2">
              {token.userSupply > 0 ? (
                <>
                  <span className="text-xs text-gray-500">Collateral:</span>
                  <button
                    onClick={handleToggleCollateral}
                    disabled={isToggling}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
                  <span className={`text-xs font-medium ${
                    isCollateral ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {isToggling ? '⏳' : isCollateral ? 'ON' : 'OFF'}
                  </span>
                </>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                  📌 Supply to enable
                </span>
              )}
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
                {token.userSupply > 0 && signer?.address ? (
                  <OnChainRealtimeBalance
                    provider={provider}
                    poolAddress={poolAddress}
                    userAddress={signer.address}
                    assetAddress={token.address}
                    tokenSymbol={token.symbol}
                    priceUSD={token.price}
                    isSupply={true}
                    displayAPY={supplyAPR * 100}
                    decimals={typeof token.decimals === 'number' ? token.decimals : 18}
                  />
                ) : token.userSupply > 0 ? (
                  `${formatBalance(token.userSupply, 4)} ${token.symbol}`
                ) : (
                  `0.00 ${token.symbol}`
                )}
              </div>
              <div className="text-xs text-green-600/70">
                Supplied (${formatCurrency(token.userSupplyUSD || 0)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {borrowInterestData.balanceWithInterest > BigInt(0) && signer?.address ? (
                  <OnChainRealtimeBalance
                    provider={provider}
                    poolAddress={poolAddress}
                    userAddress={signer.address}
                    assetAddress={token.address}
                    tokenSymbol={token.symbol}
                    priceUSD={token.price}
                    isSupply={false}
                    displayAPY={borrowAPR * 100}
                    decimals={typeof token.decimals === 'number' ? token.decimals : 18}
                  />
                ) : token.userBorrow > 0 ? (
                  `${formatBalance(token.userBorrow, 4)} ${token.symbol}`
                ) : (
                  `0.00 ${token.symbol}`
                )}
              </div>
              <div className="text-xs text-red-600/70">
                Borrowed (${formatCurrency(token.userBorrowUSD || 0)})
              </div>
              {borrowAPR > 0 && borrowInterestData.balanceWithInterest > BigInt(0) && (
                <div className="text-xs text-red-500 mt-1 font-medium">
                  Borrow APR: {formatPercentage(borrowAPR)}
                </div>
              )}
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
            <span>Supply APY</span>
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

