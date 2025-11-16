import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLENDXToken } from '@/hooks/useLENDXToken';
import { useRewardDistributor } from '@/hooks/useRewardDistributor';
import { useToast } from '@/components/ui/Toast';
import useLendContext from '@/context/useLendContext';
import { isUserRejection, getFriendlyErrorMessage } from '@/lib/errorHandler';
import { Coins, Gift, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function LENDXRewardCard() {
  const { metamaskDetails } = useLendContext();
  const { balance: lendxBalance, loading: balanceLoading } = useLENDXToken();
  const { claimableReward, pendingReward, totalReward, loading: rewardLoading, claiming, claimReward, error } = useRewardDistributor();
  const { showToast } = useToast();
  
  // Check if signer is available for transactions
  const hasSigner = !!metamaskDetails.signer;
  const isConnected = !!metamaskDetails.currentAccount;

  // Debug logs - More detailed
  useEffect(() => {
    console.log('🎁 ===== LENDXRewardCard Component =====');
    console.log('🎁 Component rendered with state:', {
      lendxBalance,
      claimableReward,
      pendingReward,
      totalReward,
      balanceLoading,
      rewardLoading,
      error
    });
    console.log('🎁 Parsed values:', {
      balance: parseFloat(lendxBalance || '0'),
      claimable: parseFloat(claimableReward || '0'),
      pending: parseFloat(pendingReward || '0'),
      total: parseFloat(totalReward || '0')
    });
    console.log('🎁 ======================================');
  }, [lendxBalance, claimableReward, pendingReward, totalReward, balanceLoading, rewardLoading, error]);

  const handleClaim = async () => {
    try {
      const tx = await claimReward();
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Reward claimed successfully!',
        hash: tx.hash
      });
      // Transaction will be handled by the hook
    } catch (err: any) {
      // Don't show toast for user rejection - they already know they cancelled
      if (isUserRejection(err) || err.name === 'UserRejection' || err.message === 'Transaction cancelled') {
        // User rejected, no need to show error toast
        return;
      }
      
      // Show friendly error message for other errors
      const friendlyMessage = getFriendlyErrorMessage(err);
      showToast({
        type: 'error',
        title: 'Error',
        message: friendlyMessage
      });
    }
  };

  const hasReward = parseFloat(claimableReward || '0') > 0;
  const canClaim = hasReward && hasSigner && isConnected && !claiming;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          LENDX Token Rewards
        </CardTitle>
        <CardDescription>
          Earn LENDX tokens by using the protocol. Use them to vote on governance proposals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LENDX Balance */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Your LENDX Balance</p>
            <p className="text-2xl font-bold">
              {balanceLoading ? (
                <Loader2 className="w-6 h-6 animate-spin inline" />
              ) : (
                parseFloat(lendxBalance || '0').toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              )}
            </p>
          </div>
          <Coins className="w-8 h-8 text-primary" />
        </div>

        {/* Claimable Reward */}
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Claimable Reward
            </p>
            <p className="text-2xl font-bold text-primary">
              {rewardLoading ? (
                <Loader2 className="w-6 h-6 animate-spin inline" />
              ) : (
                parseFloat(claimableReward || '0').toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })
              )}
            </p>
            {parseFloat(pendingReward || '0') > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                + {parseFloat(pendingReward || '0').toFixed(4)} pending (will be accumulated on next interaction)
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Earn rewards by supplying, borrowing, and using the protocol
            </p>
          </div>
        </div>

        {/* Claim Button */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim}
          className="w-full"
          size="lg"
        >
          {claiming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Gift className="w-4 h-4 mr-2" />
              Claim {parseFloat(claimableReward || '0').toFixed(4)} LENDX
            </>
          )}
        </Button>
        
        {parseFloat(pendingReward || '0') > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: Interact with the protocol (supply/borrow) to accumulate {parseFloat(pendingReward || '0').toFixed(4)} pending LENDX
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {!hasSigner && isConnected && hasReward && (
          <p className="text-sm text-yellow-500 text-center">
            ⚠️ Wallet signer not ready. Please wait a moment or refresh the page to claim rewards.
          </p>
        )}

        {!hasReward && !rewardLoading && (
          <p className="text-sm text-muted-foreground text-center">
            No rewards available yet. Start using the protocol to earn LENDX!
          </p>
        )}
      </CardContent>
    </Card>
  );
}










































