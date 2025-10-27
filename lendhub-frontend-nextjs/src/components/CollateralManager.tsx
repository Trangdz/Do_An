import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { formatCurrency, formatNumber } from '../lib/math';

interface CollateralManagerProps {
  poolAddress: string;
  provider: any;
  signer: any;
  onRefresh: () => void;
}

export function CollateralManager({ poolAddress, provider, signer, onRefresh }: CollateralManagerProps) {
  const { showToast } = useToast();
  const [collateralList, setCollateralList] = useState<string[]>([]);
  const [userUtilization, setUserUtilization] = useState<number>(0);
  const [maxBorrowable, setMaxBorrowable] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // ABI for new functions
  const poolABI = [
    'function getUserCollateral(address user) view returns (address[])',
    'function getDebtUtilization(address user) view returns (uint256)',
    'function getMaxBorrowable(address user, address asset) view returns (uint256)',
    'function canUseAsCollateral(address asset) view returns (bool)',
    'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
    'function setUserCollaterals(address[] memory assets, bool[] memory useAsCollaterals)',
  ];

  // Get user collateral list
  const fetchUserCollaterals = async () => {
    if (!provider || !signer) return;
    
    try {
      const pool = new ethers.Contract(poolAddress, poolABI, provider); // Use provider instead of signer
      const userAddress = await signer.getAddress();
      
      console.log('🔍 Fetching collaterals for user:', userAddress);
      console.log('🔍 Pool address:', poolAddress);
      
      // Try to call the function
      const collaterals = await pool.getUserCollateral(userAddress);
      setCollateralList(collaterals);
      
      // Get utilization
      try {
        const util = await pool.getDebtUtilization(userAddress);
        setUserUtilization(Number(util) / 100); // Convert bps to percentage
        console.log('📊 Utilization:', util.toString(), '%');
      } catch (utilError: any) {
        console.log('⚠️ Utilization call failed (might not be deployed):', utilError.message);
        setUserUtilization(0);
      }
      
      console.log('📊 Collaterals:', collaterals);
    } catch (error: any) {
      console.error('❌ Error fetching collaterals:', error);
      
      // If function doesn't exist, show warning
      if (error.message?.includes('no data present') || error.message?.includes('function')) {
        console.warn('⚠️ Collateral functions not available. Contract may need to be redeployed.');
        
        // Show toast warning
        showToast({
          type: 'warning',
          title: 'Contract Update Required',
          message: 'Please redeploy the LendingPool contract with new functions'
        });
        
        // Set empty list
        setCollateralList([]);
        setUserUtilization(0);
      }
    }
  };

  // Check if asset can be collateral
  const checkEligibility = async (assetAddress: string) => {
    try {
      const pool = new ethers.Contract(poolAddress, poolABI, provider);
      const canCollateral = await pool.canUseAsCollateral(assetAddress);
      return canCollateral;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return false;
    }
  };

  // Get max borrowable for each asset
  const fetchMaxBorrowable = async (assetAddress: string) => {
    if (!provider || !signer) return;
    
    try {
      const pool = new ethers.Contract(poolAddress, poolABI, provider); // Use provider
      const userAddress = await signer.getAddress();
      const max = await pool.getMaxBorrowable(userAddress, assetAddress);
      const formatted = ethers.formatEther(max);
      setMaxBorrowable(prev => ({
        ...prev,
        [assetAddress]: formatted
      }));
    } catch (error: any) {
      console.error('Error fetching max borrowable:', error);
      showToast({
        type: 'error',
        title: 'Calculation Failed',
        message: 'Unable to calculate max borrowable'
      });
    }
  };

  // Toggle collateral status
  const handleToggleCollateral = async (assetAddress: string, currentStatus: boolean) => {
    if (!signer) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please connect wallet'
      });
      return;
    }

    setLoading(true);
    try {
      const pool = new ethers.Contract(poolAddress, poolABI, signer);
      const tx = await pool.setUserUseReserveAsCollateral(assetAddress, !currentStatus);
      await tx.wait();
      
      showToast({
        type: 'success',
        title: 'Success',
        message: currentStatus ? 'Collateral disabled' : 'Collateral enabled'
      });
      
      await fetchUserCollaterals();
      onRefresh();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.reason || 'Failed to toggle collateral'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider && signer) {
      // Add small delay to ensure contract is ready
      const timer = setTimeout(() => {
        fetchUserCollaterals();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [provider, signer, poolAddress]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">
          🔐 Collateral Management
        </CardTitle>
        <CardDescription className="text-gray-600">
          Manage your collateral assets and monitor borrowing capacity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Debt Utilization */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Debt Utilization</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(userUtilization, 2)}%
              </p>
            </div>
            <div className="w-32">
              <div className="w-full bg-blue-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(userUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {userUtilization > 80 && (
            <p className="text-xs text-red-600 mt-2">⚠️ High utilization - Risk of liquidation</p>
          )}
        </div>

        {/* Collateral Assets */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Collateral Assets
          </h3>
          {collateralList.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No collateral assets enabled</p>
              <p className="text-sm text-gray-400 mt-2">Supply assets to use them as collateral</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collateralList.map((address, index) => (
                <div 
                  key={address}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{address.slice(0, 6)}...{address.slice(-4)}</p>
                      <p className="text-xs text-gray-500">Collateral Active</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {maxBorrowable[address] && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Max Borrowable</p>
                        <p className="text-sm font-semibold text-blue-600">
                          {formatNumber(parseFloat(maxBorrowable[address]), 4)}
                        </p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchMaxBorrowable(address)}
                      className="ml-2"
                    >
                      Calculate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <strong>Tip:</strong> Keep your debt utilization below 80% to avoid liquidation risk.
            You can manage collateral for each asset in your supply list.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

