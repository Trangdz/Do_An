// 🎯 QUICK EXAMPLE: How to display APR & Utilization
// Copy this example and modify for your UI component

import { useReserveAPR } from '@/hooks/useReserveAPR';
import { formatAPR, formatUtilization } from '@/lib/aprCalculations';

interface Props {
  token: {
    symbol: string;
    address: string;
    decimals: number;
  };
  provider: any;
  poolAddress: string;
}

export function TokenCard({ token, provider, poolAddress }: Props) {
  // ✅ Fetch APR data - auto-refresh every 30s
  const {
    supplyAPR,      // e.g., 3.5 (means 3.5%)
    borrowAPR,      // e.g., 5.2 (means 5.2%)
    utilization,    // e.g., 75.5 (means 75.5%)
    totalSupplied,  // e.g., "1000.50"
    totalBorrowed,  // e.g., "755.00"
    isLoading,
    error
  } = useReserveAPR(provider, poolAddress, token.address);

  if (error) {
    return <div>Error loading APR data</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Token Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{token.symbol}</h2>
        <span className="text-gray-500">$1</span>
      </div>

      {/* Position Info */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-600 mb-2">Your Position</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-lg font-semibold text-blue-600">1.0490M</div>
            <div className="text-xs text-gray-500">Wallet</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">1.0K</div>
            <div className="text-xs text-gray-500">Supplied</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">0</div>
            <div className="text-xs text-gray-500">Borrowed</div>
          </div>
        </div>
      </div>

      {/* APR & Utilization - ⭐ THIS IS WHAT YOU ASKED FOR */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Supply APR */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-600 text-2xl font-bold">
            {isLoading ? '...' : formatAPR(supplyAPR)}
          </div>
          <div className="text-sm text-gray-600">Supply APR</div>
        </div>

        {/* Borrow APR */}
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-green-600 text-2xl font-bold">
            {isLoading ? '...' : formatAPR(borrowAPR)}
          </div>
          <div className="text-sm text-gray-600">Borrow APR</div>
        </div>
      </div>

      {/* Utilization & Available */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Utilization */}
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-purple-600 text-2xl font-bold">
            {isLoading ? '...' : formatUtilization(utilization)}
          </div>
          <div className="text-sm text-gray-600">Utilization</div>
        </div>

        {/* Available */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-800 text-2xl font-bold">
            {isLoading ? '...' : totalSupplied}
          </div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
          Supply {token.symbol}
        </button>
        <button className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">
          Borrow {token.symbol}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button className="bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
          Withdraw
        </button>
        <button className="bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
          Repay
        </button>
      </div>
    </div>
  );
}

// 🎯 HOW IT WORKS:
// 
// 1. useReserveAPR() hook fetches data from contract
// 2. Data auto-refreshes every 30 seconds
// 3. formatAPR() & formatUtilization() format numbers nicely
// 4. isLoading shows "..." while fetching
// 
// 🔢 EXAMPLE VALUES:
// - Supply APR: 3.5% (people who lend get 3.5% interest per year)
// - Borrow APR: 5.2% (people who borrow pay 5.2% interest per year)
// - Utilization: 75.5% (75.5% of supplied tokens are being borrowed)
// 
// ⚡ VALUES UPDATE WHEN:
// - Someone lends → Utilization ↓ → APR ↓
// - Someone borrows → Utilization ↑ → APR ↑
// - Someone withdraws → Utilization ↑ → APR ↑
// - Someone repays → Utilization ↓ → APR ↓

