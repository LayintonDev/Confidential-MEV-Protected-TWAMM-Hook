'use client';

import { useWatchContractEvent } from 'wagmi';
import { CONFIDENTIAL_TWAMM_ABI } from '@/lib/contracts/abi';
import { TWAMM_HOOK_ADDRESS, type PoolKey } from '@/lib/contracts/addresses';
import { useState, useEffect } from 'react';

export interface TokenWithdrawalEvent {
  orderId: bigint;
  owner: string;
  currency: `0x${string}`;
  amount: bigint;
  timestamp: number;
  transactionHash?: string | null;
}

interface UseOrderBalancesProps {
  poolKey?: PoolKey;
  orderId?: bigint;
  enabled?: boolean;
}

/**
 * Hook to track token balances for an order
 * Listens to TokensWithdrawn events and calculates available balances
 */
export function useOrderBalances({ poolKey, orderId, enabled = true }: UseOrderBalancesProps) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [withdrawalHistory, setWithdrawalHistory] = useState<TokenWithdrawalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize with mock balance data
  useEffect(() => {
    if (!poolKey || !orderId || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Initialize balances from pool currencies
      // In production, these would come from contract state
      const initialBalances: Record<string, bigint> = {
        [poolKey.currency0.toLowerCase()]: BigInt(0),
        [poolKey.currency1.toLowerCase()]: BigInt(0),
      };

      setBalances(initialBalances);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load balances'));
    } finally {
      setIsLoading(false);
    }
  }, [poolKey, orderId, enabled]);

  // Listen for TokensWithdrawn events to track withdrawals
  useWatchContractEvent({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    eventName: 'TokensWithdrawn',
    enabled: enabled && !!poolKey && !!orderId,
    onLogs(logs) {
      console.log('Tokens withdrawn:', logs);

      logs.forEach((log) => {
        const logData = log as { args?: { orderId?: bigint; owner?: string; currency?: `0x${string}`; amount?: bigint }; transactionHash?: string | null };
        const args = logData.args;
        
        if (!args || args.orderId !== orderId) {
          return;
        }

        // Add to withdrawal history
        const withdrawal: TokenWithdrawalEvent = {
          orderId: args.orderId || BigInt(0),
          owner: args.owner || '',
          currency: args.currency || ('0x' as `0x${string}`),
          amount: args.amount || BigInt(0),
          timestamp: Date.now(),
          transactionHash: logData.transactionHash || undefined,
        };

        setWithdrawalHistory((prev) => [withdrawal, ...prev]);

        // Update running balances
        if (args.currency && args.amount) {
          setBalances((prev) => {
            const currencyKey = (args.currency as `0x${string}`).toLowerCase();
            return {
              ...prev,
              [currencyKey]: (prev[currencyKey] || BigInt(0)) + (args.amount as bigint),
            };
          });
        }
      });
    },
  });

  // Calculate total withdrawn per currency
  const totalWithdrawn = withdrawalHistory.reduce(
    (acc, withdrawal) => {
      const key = withdrawal.currency.toLowerCase();
      return {
        ...acc,
        [key]: (acc[key] || BigInt(0)) + withdrawal.amount,
      };
    },
    {} as Record<string, bigint>
  );

  return {
    balances,
    withdrawalHistory,
    totalWithdrawn,
    isLoading,
    error,
  };
}
