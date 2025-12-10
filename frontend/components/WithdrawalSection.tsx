'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { useConfidentialTWAMM } from '@/hooks/useConfidentialTWAMM';
import { useOrderBalances } from '@/hooks/useOrderBalances';
import { useWithdrawalTracking } from '@/hooks/useAnalytics';
import { WithdrawalTransactionMonitor } from './WithdrawalTransactionMonitor';
import { type PoolKey } from '@/lib/contracts/addresses';

interface WithdrawalSectionProps {
  orderId: bigint;
  poolKey: PoolKey;
  onWithdrawSuccess?: () => void;
}

export function WithdrawalSection({
  orderId,
  poolKey,
  onWithdrawSuccess,
}: WithdrawalSectionProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { withdrawTokens, hash: withdrawHash, isPending } = useConfidentialTWAMM();
  const { balances, totalWithdrawn, isLoading: balancesLoading, error: balancesError } = useOrderBalances({
    poolKey,
    orderId,
    enabled: true,
  });
  const { trackWithdrawalInitiated, trackWithdrawalFailed } = useWithdrawalTracking();

  const handleTransactionSuccess = (txHash: string) => {
    setSuccessMessage('Withdrawal confirmed successfully!');
    setTransactionHash(txHash);
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);

    onWithdrawSuccess?.();
    setIsWithdrawing(false);
  };

  const handleTransactionError = (error: string) => {
    setWithdrawError(error);
    setIsWithdrawing(false);
  };

  const handleWithdraw = async (currency: string) => {
    try {
      setWithdrawError(null);
      setSuccessMessage(null);
      setIsWithdrawing(true);

      // Track withdrawal initiation
      const amount = balances[currency]?.toString() || '0';
      trackWithdrawalInitiated(orderId.toString(), amount);

      // Call withdrawTokens - wagmi will handle the transaction
      await withdrawTokens(poolKey, orderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      setWithdrawError(errorMessage);
      trackWithdrawalFailed(orderId.toString(), errorMessage);
      setIsWithdrawing(false);
    }
  };

  const handleWithdrawAll = async () => {
    try {
      setWithdrawError(null);
      setSuccessMessage(null);
      setIsWithdrawing(true);

      // Withdraw from both currencies
      const currencies = Object.keys(balances);
      for (const currency of currencies) {
        const amount = balances[currency];
        if (amount > BigInt(0)) {
          await withdrawTokens(poolKey, orderId);
        }
      }

      setSuccessMessage('All withdrawals initiated successfully');
      if (withdrawHash) {
        setTransactionHash(withdrawHash);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      onWithdrawSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      setWithdrawError(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (balancesLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-400">Loading balances...</span>
      </div>
    );
  }

  const hasBalances = Object.values(balances).some((balance) => balance > BigInt(0));

  return (
    <div className="border-t border-slate-700 pt-6">
      {withdrawHash && (
        <WithdrawalTransactionMonitor
          transactionHash={withdrawHash as `0x${string}`}
          orderId={orderId}
          onSuccess={handleTransactionSuccess}
          onError={handleTransactionError}
        />
      )}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Wallet className="w-5 h-5 mr-2 text-green-500" />
          Token Withdrawal
        </h3>

        {balancesError && (
          <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
            <p className="text-red-200 text-sm">Failed to load balances: {balancesError.message}</p>
          </div>
        )}

        {withdrawError && (
          <div className="bg-red-900 border border-red-700 rounded p-3 mb-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 shrink-0" />
            <p className="text-red-200 text-sm">{withdrawError}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900 border border-green-700 rounded p-3 mb-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-200 text-sm">{successMessage}</p>
              {transactionHash && (
                <p className="text-green-300 text-xs mt-1">Hash: {transactionHash.slice(0, 10)}...</p>
              )}
            </div>
          </div>
        )}

        {!hasBalances ? (
          <div className="bg-slate-800 rounded p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">No available balances to withdraw</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display balances */}
            <div className="bg-slate-800 rounded p-4 border border-slate-700">
              <p className="text-gray-300 text-sm font-medium mb-3">Available Balances:</p>
              <div className="space-y-2">
                {Object.entries(balances).map(([currency, balance]) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded hover:bg-slate-600 transition"
                  >
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm font-mono">{currency.slice(0, 8)}...</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Balance: {balance.toString()} units
                      </p>
                    </div>
                    <button
                      onClick={() => handleWithdraw(currency)}
                      disabled={isWithdrawing || isPending}
                      className={`px-4 py-2 rounded text-sm font-medium transition ${
                        isWithdrawing || isPending
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isWithdrawing || isPending ? (
                        <Loader2 className="w-4 h-4 inline animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Withdraw All Button */}
            <button
              onClick={handleWithdrawAll}
              disabled={isWithdrawing || isPending}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                isWithdrawing || isPending
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isWithdrawing || isPending ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                'Withdraw All'
              )}
            </button>

            {/* Withdrawal History */}
            {Object.keys(totalWithdrawn).length > 0 && (
              <div className="bg-slate-800 rounded p-4 border border-slate-700 mt-6">
                <p className="text-gray-300 text-sm font-medium mb-3">Withdrawal History:</p>
                <div className="space-y-2 text-xs">
                  {Object.entries(totalWithdrawn).map(([currency, amount]) => (
                    <div key={`history-${currency}`} className="flex justify-between text-gray-400">
                      <span>{currency.slice(0, 8)}...</span>
                      <span className="text-green-400 font-mono">{amount.toString()} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
