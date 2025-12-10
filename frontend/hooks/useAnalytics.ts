/**
 * React hook for analytics integration in components
 * Tracks encryption, transactions, and user interactions
 */

import { useEffect, useCallback } from 'react';
import { analytics, EventType } from '@/lib/analytics';

export function useAnalytics() {
  return analytics;
}

/**
 * Hook to track component lifecycle and performance
 */
export function useAnalyticsPageView(pageName: string) {
  useEffect(() => {
    analytics.trackNavigation('', pageName);
    return () => {
      // Optional: track page exit
    };
  }, [pageName]);
}

/**
 * Hook to track encryption performance
 */
export function useEncryptionTracking() {
  const startEncryption = useCallback((label: string = 'encryption') => {
    analytics.startPerformanceMeasure(label);
  }, []);

  const endEncryption = useCallback(
    (success: boolean = true, label: string = 'encryption', error?: string) => {
      try {
        const duration = analytics.endPerformanceMeasure(
          label,
          success
            ? EventType.ENCRYPTION_COMPLETED
            : EventType.ENCRYPTION_FAILED,
          { error }
        );
        return duration;
      } catch {
        return 0;
      }
    },
    []
  );

  return { startEncryption, endEncryption };
}

/**
 * Hook to track transaction performance
 */
export function useTransactionTracking() {
  const trackTransactionStart = useCallback(
    (txType: string = 'transaction') => {
      analytics.startPerformanceMeasure(`tx_${txType}`);
    },
    []
  );

  const trackTransactionEnd = useCallback(
    (
      txHash: string,
      txType: string = 'transaction',
      success: boolean = true,
      error?: string
    ) => {
      try {
        analytics.endPerformanceMeasure(
          `tx_${txType}`,
          success
            ? EventType.TRANSACTION_CONFIRMED
            : EventType.TRANSACTION_FAILED,
          {
            txHash,
            error,
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { trackTransactionStart, trackTransactionEnd };
}

/**
 * Hook to track decryption performance
 */
export function useDecryptionTracking() {
  const startDecryption = useCallback((label: string = 'decryption') => {
    analytics.startPerformanceMeasure(label);
  }, []);

  const endDecryption = useCallback(
    (success: boolean = true, label: string = 'decryption', error?: string) => {
      try {
        const duration = analytics.endPerformanceMeasure(
          label,
          success
            ? EventType.DECRYPTION_COMPLETED
            : EventType.DECRYPTION_FAILED,
          { error }
        );
        return duration;
      } catch {
        return 0;
      }
    },
    []
  );

  return { startDecryption, endDecryption };
}

/**
 * Hook to track order lifecycle events
 */
export function useOrderTracking() {
  const trackOrderSubmitted = useCallback(
    (orderId: string, poolId: string, amount: string, encryptionTime: number) => {
      analytics.trackOrderSubmitted(orderId, poolId, amount, encryptionTime);
    },
    []
  );

  const trackOrderExecuted = useCallback(
    (orderId: string, executedAmount: string) => {
      analytics.trackOrderExecuted(orderId, executedAmount);
    },
    []
  );

  const trackOrderCancelled = useCallback(
    (orderId: string, reason?: string) => {
      analytics.trackOrderCancelled(orderId, reason);
    },
    []
  );

  return {
    trackOrderSubmitted,
    trackOrderExecuted,
    trackOrderCancelled,
  };
}

/**
 * Hook to track withdrawal events
 */
export function useWithdrawalTracking() {
  const trackWithdrawalInitiated = useCallback(
    (orderId: string, amount: string) => {
      analytics.trackWithdrawalInitiated(orderId, amount);
    },
    []
  );

  const trackWithdrawalCompleted = useCallback(
    (orderId: string, amount: string, txHash: string) => {
      analytics.trackWithdrawalCompleted(orderId, amount, txHash);
    },
    []
  );

  const trackWithdrawalFailed = useCallback(
    (orderId: string, error: string) => {
      analytics.trackWithdrawalFailed(orderId, error);
    },
    []
  );

  return {
    trackWithdrawalInitiated,
    trackWithdrawalCompleted,
    trackWithdrawalFailed,
  };
}

/**
 * Hook to track error events
 */
export function useErrorTracking() {
  const trackError = useCallback(
    (errorType: string, message: string, stackTrace?: string) => {
      analytics.trackError(errorType, message, stackTrace);
    },
    []
  );

  const trackErrorRetry = useCallback(
    (errorType: string, attempt: number, willRetry: boolean) => {
      analytics.trackErrorRetry(errorType, attempt, willRetry);
    },
    []
  );

  return { trackError, trackErrorRetry };
}

/**
 * Hook to track wallet events
 */
export function useWalletTracking() {
  const trackWalletConnected = useCallback(
    (walletType: string, address: string) => {
      analytics.trackWalletConnected(walletType, address);
    },
    []
  );

  const trackWalletDisconnected = useCallback(() => {
    analytics.trackWalletDisconnected();
  }, []);

  return { trackWalletConnected, trackWalletDisconnected };
}
