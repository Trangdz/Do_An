/**
 * USAGE EXAMPLE: Real-time Interest Display
 * 
 * Complete example showing how to use the real-time interest components
 * in your LendHub v2 dashboard
 */

import React from 'react';
import { ethers } from 'ethers';
import { useRealtimeInterest } from './src/hooks/useRealtimeInterest';
import { 
  RealtimeInterestBalance, 
  RealtimeBalanceCompact 
} from './src/components/RealtimeInterestBalance';
import { useReserveAPR } from './src/hooks/useReserveAPR';

// ============================================================================
// EXAMPLE 1: Basic Usage in Token Card
// ============================================================================

function TokenCard({ token, provider, poolAddress, userAddress }: any) {
  // Fetch real-time interest data
  const interestData = useRealtimeInterest(
    provider,
    poolAddress,
    userAddress,
    token.address,
    5000, // Refresh every 5 seconds
    true  // isSupply position
  );

  // Fetch APR data
  const aprData = useReserveAPR(
    provider,
    poolAddress,
    token.address,
    5000 // Refresh every 5 seconds
  );

  // Show loading state
  if (interestData.isLoading) {
    return <div>Loading...</div>;
  }

  // Show error state
  if (interestData.error) {
    return <div>Error: {interestData.error}</div>;
  }

  return (
    <div className="token-card">
      <h3>{token.symbol}</h3>
      
      {/* Full Display */}
      <RealtimeInterestBalance
        principal={interestData.principal}
        snapshotIndex={BigInt(token.supplySnapshotIndex)}
        currentIndex={interestData.currentIndex}
        lastUpdateTimestamp={interestData.lastUpdate}
        ratePerSecond={interestData.ratePerSecond}
        tokenSymbol={token.symbol}
        priceUSD={token.price}
        decimals={2}
      />
      
      {/* APR Display */}
      <div className="apr-display">
        <div>Supply APR: {aprData.supplyAPR.toFixed(2)}%</div>
        <div>Borrow APR: {aprData.borrowAPR.toFixed(2)}%</div>
        <div>Utilization: {aprData.utilization.toFixed(2)}%</div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Compact Display for Dashboard
// ============================================================================

function DashboardSupplyRow({ asset, provider, poolAddress, userAddress }: any) {
  const interestData = useRealtimeInterest(
    provider,
    poolAddress,
    userAddress,
    asset.address,
    5000,
    true
  );

  return (
    <tr>
      <td>{asset.symbol}</td>
      <td>
        <RealtimeBalanceCompact
          principal={interestData.principal}
          snapshotIndex={BigInt(asset.snapshotIndex)}
          currentIndex={interestData.currentIndex}
          lastUpdateTimestamp={interestData.lastUpdate}
          ratePerSecond={interestData.ratePerSecond}
          tokenSymbol={asset.symbol}
          priceUSD={asset.price}
        />
      </td>
      <td>
        ${((Number(interestData.balanceWithInterest) / 1e18) * asset.price).toFixed(2)}
      </td>
      <td>
        Interest accrued: {Number(interestData.interestAccrued) / 1e18} {asset.symbol}
      </td>
    </tr>
  );
}

// ============================================================================
// EXAMPLE 3: Using with LendContext
// ============================================================================

function SupplyPanel({ provider, poolAddress, userAddress }: any) {
  const { supplyAssets } = useLendContext(); // Your existing context
  
  return (
    <div className="supply-panel">
      <h2>Your Supplies</h2>
      
      {supplyAssets.map(asset => (
        <div key={asset.address} className="supply-row">
          <div className="asset-info">
            <span>{asset.symbol}</span>
          </div>
          
          <div className="balance">
            {/* Use hook to get real-time balance */}
            <BalanceWithInterest
              asset={asset}
              provider={provider}
              poolAddress={poolAddress}
              userAddress={userAddress}
            />
          </div>
          
          <div className="actions">
            <button>Withdraw</button>
            <button>Use as Collateral</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BalanceWithInterest({ asset, provider, poolAddress, userAddress }: any) {
  const data = useRealtimeInterest(
    provider,
    poolAddress,
    userAddress,
    asset.address,
    5000,
    true
  );

  const balance = Number(data.balanceWithInterest) / 1e18;
  const interest = Number(data.interestAccrued) / 1e18;
  const valueUSD = balance * asset.price;

  return (
    <div className="balance-display">
      <div className="main-balance">
        {balance.toFixed(2)} {asset.symbol}
        {interest > 0 && (
          <span className="interest">(+{interest.toFixed(4)})</span>
        )}
      </div>
      <div className="usd-value">
        ${valueUSD.toFixed(2)}
      </div>
      <div className="apr">
        APR: {data.apr.toFixed(2)}%
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Custom Implementation
// ============================================================================

function CustomRealtimeDisplay({
  principal,
  snapshotIndex,
  currentIndex,
  lastUpdateTimestamp,
  ratePerSecond,
  tokenSymbol,
  priceUSD
}: {
  principal: bigint;
  snapshotIndex: bigint;
  currentIndex: bigint;
  lastUpdateTimestamp: number;
  ratePerSecond: bigint;
  tokenSymbol: string;
  priceUSD: number;
}) {
  const [balance, setBalance] = React.useState(0);
  const [animation, setAnimation] = React.useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const calculatedBalance = calculateInterestAccrued(
        principal,
        snapshotIndex,
        currentIndex
      );
      
      const newBalance = Number(calculatedBalance) / 1e18;
      
      // Trigger animation
      if (newBalance > balance) {
        setAnimation('up');
      } else if (newBalance < balance) {
        setAnimation('down');
      }
      
      setBalance(newBalance);
      
      // Clear animation after 1 second
      setTimeout(() => setAnimation(null), 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [principal, snapshotIndex, currentIndex]);

  const interest = balance - (Number(principal) / 1e18);

  return (
    <div className={`realtime-balance ${animation ? `animate-${animation}` : ''}`}>
      <div className="balance-main">
        <span className="amount">
          {balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
          })}
        </span>
        <span className="symbol">{tokenSymbol}</span>
      </div>
      
      {interest > 0 && (
        <div className="interest-accrued">
          <span className="plus">+</span>
          <span className="interest">
            {interest.toFixed(4)}
          </span>
        </div>
      )}
      
      <div className="usd-value">
        ${(balance * priceUSD).toFixed(2)}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateInterestAccrued(
  principal: bigint,
  snapshotIndex: bigint,
  currentIndex: bigint
): bigint {
  if (snapshotIndex === 0n || principal === 0n) {
    return principal;
  }
  
  return (principal * currentIndex) / snapshotIndex;
}

export {
  TokenCard,
  DashboardSupplyRow,
  SupplyPanel,
  BalanceWithInterest,
  CustomRealtimeDisplay
};

