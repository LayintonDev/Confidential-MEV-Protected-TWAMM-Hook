/**
 * Monitors withdrawal transaction receipt
 * Separated from WithdrawalSection to ensure it runs within WagmiProvider context
 */

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useWithdrawalTracking } from '@/hooks/useAnalytics';

interface WithdrawalTransactionMonitorProps {
  transactionHash: `0x${string}` | undefined;
  orderId: bigint;
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}

export function WithdrawalTransactionMonitor({
  transactionHash,
  orderId,
  onSuccess,
  onError,
}: WithdrawalTransactionMonitorProps) {
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });
  const { trackWithdrawalCompleted, trackWithdrawalFailed } = useWithdrawalTracking();

  useEffect(() => {
    if (!txReceipt) return;

    if (txReceipt.status === 'success' && transactionHash) {
      trackWithdrawalCompleted(orderId.toString(), '0', transactionHash);
      onSuccess(transactionHash);
    } else if (txReceipt.status === 'reverted') {
      const errorMessage = 'Transaction reverted';
      trackWithdrawalFailed(orderId.toString(), errorMessage);
      onError(errorMessage);
    }
  }, [txReceipt, transactionHash, orderId, trackWithdrawalCompleted, trackWithdrawalFailed, onSuccess, onError]);

  return null;
}
