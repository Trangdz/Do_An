interface LendContextValue {
  // State
  metamaskDetails: {
    provider: any;
    networkName: string | null;
    signer: any;
    currentAccount: string | null;
    chainId: number | null;
  };
  userAssets: any[];
  supplyAssets: any[];
  assetsToBorrow: any[];
  yourBorrows: any[];
  supplySummary: {
    totalUSDBalance: number;
    weightedAvgAPY: number;
    totalUSDCollateral: number;
  };
  borrowSummary: {
    totalUSDBalance: number;
    weightedAvgAPY: number;
    totalBorrowPowerUsed: number;
  };
  accountData: {
    collateralUSD: string;
    debtUSD: string;
    healthFactor: string;
  };
  contract: {
    lendingPoolContract: any;
    oracleContract: any;
  };

  // Functions
  connectWallet: () => Promise<void>;
  refresh: () => Promise<void>;
  getUserAssets: () => Promise<any[]>;
  getYourSupplies: () => Promise<any[]>;
  getYourBorrows: () => Promise<any[]>;
  getAssetsToBorrow: () => Promise<any[]>;
  getAccountData: (user?: string) => Promise<any>;
  ApproveToContinue: (tokenAddress: string, approveAmount: string) => Promise<any>;
  LendAsset: (token: string, supplyAmount: string) => Promise<any>;
  WithdrawAsset: (tokenAddress: string, withdrawAmount: string) => Promise<any>;
  borrowAsset: (token: string, borrowAmount: string) => Promise<any>;
  repayAsset: (tokenAddress: string, repayAmount: string) => Promise<any>;
  getContract: (address: string, abi: any) => Promise<any>;
  getPriceUSD: (asset: string) => Promise<string>;
  getAmountInUSD: (address: string, amount: string) => Promise<number>;
  numberToEthers: (number: any) => any;
  reportError: (error: any) => void;
  wrapEth: (amountEth: string) => Promise<any>;
  unwrapWeth: (amountEth: string) => Promise<any>;
  getUserTotalAvailableBalance: () => Promise<number>;
  getTokensPerUSDAmount: (token: string, amount: number) => Promise<number>;
  objectifySuppliedAssets: (assets: any[]) => Promise<any[]>;
  objectifyBorrowedAssets: (assets: any[]) => Promise<any[]>;
  mergeObjectifiedAssets: (assets: any[]) => any[];
  updateInterests: (asset: string) => Promise<any>;
}

declare const useLendContext: () => LendContextValue;
export default useLendContext;
