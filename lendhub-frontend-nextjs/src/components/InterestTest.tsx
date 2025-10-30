/**
 * Test Component để kiểm tra interest system
 */

import { useRealtimeInterestPersistent } from '../hooks/useRealtimeInterestPersistent';

export function InterestTest() {
  const {
    displayBalance,
    interestEarned,
    liquidityIndex,
    isLoading,
    error
  } = useRealtimeInterestPersistent({
    userAddress: '0x2a8e735cc4ea2f6e6d7d6e4ae0f1d6b8639aa10e', // Test address
    assetSymbol: 'USDC',
    scaledBalance: 100.0, // $100 initial
    initialLiquidityIndex: 1.0,
    currentLiquidityRate: 0.05 // 5% APR
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4 border-2 border-blue-500 rounded-lg m-4">
      <h2 className="text-xl font-bold mb-2">Interest Test</h2>
      <div className="space-y-2">
        <div>
          <strong>Balance:</strong> {displayBalance.toFixed(6)} USDC
        </div>
        <div>
          <strong>Interest Earned:</strong> {interestEarned.toFixed(6)} USDC
        </div>
        <div>
          <strong>Liquidity Index:</strong> {liquidityIndex.toFixed(8)}
        </div>
        <div className="text-sm text-gray-500">
          Watch console for update logs every second
        </div>
      </div>
    </div>
  );
}



