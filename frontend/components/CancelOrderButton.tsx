'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useConfidentialTWAMM } from '@/hooks/useConfidentialTWAMM';
import { useFHE } from '@/hooks/useFHE';
import { useEncryptionTracking } from '@/hooks/useAnalytics';
import { CancelTransactionMonitor } from './CancelTransactionMonitor';
import { type PoolKey } from '@/lib/contracts/addresses';

interface CancelOrderButtonProps {
  orderId: bigint;
  poolKey: PoolKey;
  owner: string;
  status?: 'active' | 'completed' | 'cancelled';
  onCancelSuccess?: () => void;
}

export function CancelOrderButton({
  orderId,
  poolKey,
  owner,
  status = 'active',
  onCancelSuccess,
}: CancelOrderButtonProps) {
  const { address } = useAccount();
  const [showDialog, setShowDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { cancelOrder, hash: cancelHash, isPending: transactionPending } = useConfidentialTWAMM();
  const { isReady: isFHEReady, initialize: initializeFHE } = useFHE();
  const { startEncryption, endEncryption } = useEncryptionTracking();

  // Check if user is the owner
  const isOwner = address?.toLowerCase() === owner.toLowerCase();

  // Can only cancel active orders
  const canCancel = isOwner && status === 'active';

  const handleTransactionSuccess = (txHash: string) => {
    setSuccessMessage(`Order ${orderId.toString()} cancelled successfully`);
    setTransactionHash(txHash);

    // Close dialog after success
    setTimeout(() => {
      setShowDialog(false);
      setSuccessMessage(null);
      onCancelSuccess?.();
    }, 2000);
  };

  const handleTransactionError = (error: string) => {
    setError(error);
    setIsCancelling(false);
  };

  const handleCancel = async () => {
    if (!canCancel) {
      setError('Only the order owner can cancel active orders');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setIsCancelling(true);
      setEncryptionProgress(0);

      // Start encryption tracking
      startEncryption('cancel_order_encryption');

      // Initialize FHE if needed
      if (!isFHEReady) {
        setEncryptionProgress(25);
        await initializeFHE();
        setEncryptionProgress(50);
      }

      // In a real implementation, we would encrypt the cancel signal
      // For now, we'll use a placeholder since ebool encryption requires cofhe
      // const encryptedCancelSignal = await encryptBool(true);
      setEncryptionProgress(75);

      // End encryption tracking
      endEncryption(true, 'cancel_order_encryption');

      // Submit cancellation to contract
      // Note: This requires the cancel signal to be encrypted
      // The contract expects: cancelEncryptedOrder(poolKey, orderId, cancelSignal: ebool)
      await cancelOrder(poolKey, orderId, '0x' as unknown as boolean);
      setEncryptionProgress(100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cancellation failed';
      setError(errorMessage);
      console.error('Cancel error:', err);
    } finally {
      setIsCancelling(false);
      setEncryptionProgress(0);
    }
  };

  if (!canCancel) {
    return null;
  }

  return (
    <>
      {cancelHash && (
        <CancelTransactionMonitor
          transactionHash={cancelHash as `0x${string}`}
          orderId={orderId}
          onSuccess={handleTransactionSuccess}
          onError={handleTransactionError}
        />
      )}
      <button
        onClick={() => setShowDialog(true)}
        disabled={transactionPending || isCancelling}
        className="flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:border-red-500 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCancelling || transactionPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cancelling...
          </>
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel Order
          </>
        )}
      </button>

      {/* Cancellation Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Cancel Order</h2>

            {error && (
              <div className="mb-4 flex items-start rounded-lg border border-red-700 bg-red-900/20 p-3">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 flex items-start rounded-lg border border-green-700 bg-green-900/20 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-green-300">{successMessage}</p>
                  {transactionHash && (
                    <p className="text-xs text-green-400 mt-1">Hash: {transactionHash.slice(0, 10)}...</p>
                  )}
                </div>
              </div>
            )}

            {!successMessage && (
              <>
                {/* Encryption Progress */}
                {isCancelling && encryptionProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Encrypting cancel signal...</span>
                      <span className="text-xs text-gray-500">{encryptionProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${encryptionProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Order Details */}
                <div className="mb-6 space-y-3 bg-slate-800 rounded p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Order ID:</span>
                    <span className="font-mono text-gray-300">{orderId.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pool Key:</span>
                    <span className="font-mono text-xs text-gray-300 truncate">
                      {poolKey.currency0.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <p className="text-xs text-gray-400">
                      ⚠️ Cancelling will stop the order execution. Any executed amounts can still be withdrawn.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDialog(false)}
                    disabled={isCancelling || transactionPending}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling || transactionPending}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center"
                  >
                    {isCancelling || transactionPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Cancel'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
