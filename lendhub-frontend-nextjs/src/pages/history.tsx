import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { useMongoTransactions, MongoTransaction } from '@/hooks/useMongoTransactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/math';

export default function HistoryPage() {
  const { metamaskDetails } = useLendContext();
  
  const isConnected = !!metamaskDetails.currentAccount;
  const userAddress = metamaskDetails.currentAccount;

  // Use MongoDB transactions - only show transactions for connected wallet
  const { 
    transactions, 
    isLoading, 
    error, 
    refetch, 
    totalVolume, 
    totalFees, 
    transactionStats 
  } = useMongoTransactions(
    isConnected && userAddress ? userAddress : null,
    true,  // Enable auto-refresh
    60000  // Refresh every 60 seconds
  );

  // Normalize/standardize transaction types coming from DB/indexer
  const normalizeType = (rawType: any): 'Lend' | 'Withdraw' | 'Borrow' | 'Repay' | 'Liquidate' | 'Other' => {
    if (typeof rawType !== 'string') return 'Other';
    const t = rawType.trim().toLowerCase();
    if (t === 'lend' || t === 'supply' || t === 'supplied' || t === 'deposit' || t === 'deposited') return 'Lend';
    if (t === 'withdraw' || t === 'withdrawn' || t === 'redeem' || t === 'redeemed') return 'Withdraw';
    if (t === 'borrow' || t === 'borrowed') return 'Borrow';
    if (t === 'repay' || t === 'repaid' || t === 'repayment') return 'Repay';
    if (t === 'liquidate' || t === 'liquidated' || t === 'liquidation') return 'Liquidate';
    return 'Other';
  };

  // Helper function to safely format addresses
  const formatAddress = (addr: any) => {
    if (typeof addr === 'string' && addr.length > 10) {
      return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    }
    return 'Unknown';
  };

  // Helper function to safely format hash
  const formatHash = (hash: any) => {
    if (typeof hash === 'string' && hash.length > 20) {
      return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
    }
    return 'Unknown';
  };

  // Get transaction type emoji
  const getTransactionTypeEmoji = (type: string) => {
    switch (normalizeType(type)) {
      case 'Lend': return '💰';
      case 'Withdraw': return '⬅️';
      case 'Borrow': return '📤';
      case 'Repay': return '✅';
      case 'Liquidate': return '⚡';
      default: return '📄';
    }
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: string) => {
    switch (normalizeType(type)) {
      case 'Lend': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Withdraw': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Borrow': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Repay': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Liquidate': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-foreground">Transaction History</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your wallet to view transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <p className="text-foreground font-semibold mb-2">Wallet Not Connected</p>
              <p className="text-muted-foreground mb-6">Please connect your wallet to view your transaction history</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Transaction History</h1>
            <p className="text-muted-foreground">View all your lending and borrowing transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Auto-refresh: 60s</span>
            </div>
            <Button 
              onClick={refetch}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Transactions</div>
                <div className="text-2xl font-bold text-foreground">{transactions.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Volume (USD)</div>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(totalVolume)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Fees (USD)</div>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(totalFees)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Transaction Types</div>
                <div className="text-lg font-bold text-foreground">
                  Lend: {transactionStats.totalLend} | Borrow: {transactionStats.totalBorrow}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions List */}
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            <CardDescription className="text-muted-foreground">
              {transactions.length > 0 
                ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} found`
                : 'No transactions yet'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">❌ Error: {error}</div>
                <Button onClick={refetch} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground mb-6">Start using LendHub to see your transaction history here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx: MongoTransaction, index: number) => (
                  <div 
                    key={tx._id || tx.hash || index} 
                    className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl border ${getTransactionTypeColor(tx.type)}`}>
                          {getTransactionTypeEmoji(tx.type)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-lg">{normalizeType(tx.type) === 'Other' ? 'Other' : normalizeType(tx.type)}</div>
                          <div className="text-sm text-muted-foreground">
                            {tx.asset?.symbol || 'Unknown'} Transaction
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground text-xl">
                          {tx.amount} {tx.asset?.symbol || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(tx.amountUSD || '0'))} USD
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">User Address</div>
                        <div className="text-sm font-mono text-foreground">
                          {formatAddress(tx.user)}
                        </div>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Block Number</div>
                        <div className="text-sm font-mono text-foreground">
                          #{typeof tx.blockNumber === 'number' ? tx.blockNumber.toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
                        <div className="text-sm font-mono text-foreground">
                          {formatHash(tx.hash)}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                      <div>
                        {typeof tx.timestamp === 'number' 
                          ? new Date(tx.timestamp * 1000).toLocaleString()
                          : 'Unknown time'
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          tx.status === 'success' ? 'bg-green-400' :
                          tx.status === 'pending' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}></span>
                        <span className="capitalize">{tx.status || 'success'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}