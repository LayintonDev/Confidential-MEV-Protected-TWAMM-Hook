/**
 * Monitors cancellation transaction receipt
 * Separated from CancelOrderButton to ensure it runs within WagmiProvider context
 */

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useOrderTracking } from '@/hooks/useAnalytics';

interface CancelTransactionMonitorProps {
  transactionHash: `0x${string}` | undefined;
  orderId: bigint;
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}

export function CancelTransactionMonitor({
  transactionHash,
  orderId,
  onSuccess,
  onError,
}: CancelTransactionMonitorProps) {
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });
  const { trackOrderCancelled } = useOrderTracking();

  useEffect(() => {
    if (!txReceipt) return;

    if (txReceipt.status === 'success' && transactionHash) {
      trackOrderCancelled(orderId.toString(), 'confirmed');
      onSuccess(transactionHash);
    } else if (txReceipt.status === 'reverted') {
      const errorMessage = 'Cancellation transaction reverted';
      onError(errorMessage);
    }
  }, [txReceipt, transactionHash, orderId, trackOrderCancelled, onSuccess, onError]);

  return null;
}
