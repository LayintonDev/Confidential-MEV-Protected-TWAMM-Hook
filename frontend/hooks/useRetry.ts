'use client';

import { useState, useCallback, useRef } from 'react';
import { parseError, isRetryable } from '@/lib/errors';

interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  error: Error | null;
  nextRetryTime: number | null;
}

/**
 * Hook for handling retryable operations with exponential backoff
 */
export function useRetry(
  config: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  }
) {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    error: null,
    nextRetryTime: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const retry = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2, onRetry } = config;

      let lastError: Error | null = null;
      let lastResult: T | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          setState({
            isRetrying: attempt > 0,
            attempt: attempt + 1,
            error: null,
            nextRetryTime: null,
          });

          lastResult = await operation();
          setState({
            isRetrying: false,
            attempt: attempt + 1,
            error: null,
            nextRetryTime: null,
          });
          return lastResult;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const parsedError = parseError(lastError);

          // Don't retry if error is not retryable
          if (!isRetryable(parsedError)) {
            setState({
              isRetrying: false,
              attempt: attempt + 1,
              error: lastError,
              nextRetryTime: null,
            });
            throw lastError;
          }

          // Calculate delay for next attempt
          if (attempt < maxAttempts - 1) {
            const delay = delayMs * Math.pow(backoffMultiplier, attempt);
            const nextRetryTime = Date.now() + delay;

            setState({
              isRetrying: true,
              attempt: attempt + 1,
              error: lastError,
              nextRetryTime,
            });

            onRetry?.(attempt + 1, lastError);

            // Wait before next attempt
            await new Promise((resolve) => {
              retryTimeoutRef.current = setTimeout(resolve, delay);
            });
          }
        }
      }

      // All attempts failed
      setState({
        isRetrying: false,
        attempt: maxAttempts,
        error: lastError,
        nextRetryTime: null,
      });

      throw lastError || new Error('All retry attempts failed');
    },
    [config]
  );

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      isRetrying: false,
      attempt: 0,
      error: null,
      nextRetryTime: null,
    });
  }, []);

  return {
    retry,
    reset,
    ...state,
  };
}

/**
 * Hook for retrying a function with exponential backoff
 */
export function useRetryableOperation<T>(
  operation: () => Promise<T>,
  config?: RetryConfig
) {
  const [result, setResult] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { retry, reset, ...retryState } = useRetry(config);

  const execute = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await retry(operation);
      if (res !== null) {
        setResult(res);
      }
    } catch {
      // Error is in retryState
    } finally {
      setIsLoading(false);
    }
  }, [operation, retry]);

  return {
    result,
    isLoading,
    execute,
    reset,
    ...retryState,
  };
}
