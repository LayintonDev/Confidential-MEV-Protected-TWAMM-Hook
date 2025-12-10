/**
 * Analytics and monitoring utilities for tracking user interactions and performance metrics
 * Events are logged to console in development and can be extended to send to analytics services
 */

export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  userId?: string;
  properties: Record<string, string | number | boolean | undefined>;
}

export interface PerformanceMetrics {
  encryptionTime?: number;
  transactionTime?: number;
  decryptionTime?: number;
  pageLoadTime?: number;
}

// Event types
export enum EventType {
  // Order lifecycle
  ORDER_SUBMITTED = 'order_submitted',
  ORDER_EXECUTED = 'order_executed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_SLICED = 'order_sliced',

  // Withdrawal lifecycle
  WITHDRAWAL_INITIATED = 'withdrawal_initiated',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_FAILED = 'withdrawal_failed',

  // Encryption/Decryption
  ENCRYPTION_STARTED = 'encryption_started',
  ENCRYPTION_COMPLETED = 'encryption_completed',
  ENCRYPTION_FAILED = 'encryption_failed',
  DECRYPTION_STARTED = 'decryption_started',
  DECRYPTION_COMPLETED = 'decryption_completed',
  DECRYPTION_FAILED = 'decryption_failed',

  // Error handling
  ERROR_OCCURRED = 'error_occurred',
  ERROR_RETRY_ATTEMPTED = 'error_retry_attempted',
  ERROR_RETRY_SUCCEEDED = 'error_retry_succeeded',
  ERROR_RETRY_FAILED = 'error_retry_failed',

  // User interactions
  USER_CONNECTED_WALLET = 'user_connected_wallet',
  USER_DISCONNECTED_WALLET = 'user_disconnected_wallet',
  USER_NAVIGATED = 'user_navigated',

  // Transaction events
  TRANSACTION_CONFIRMED = 'transaction_confirmed',
  TRANSACTION_FAILED = 'transaction_failed',
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private performanceMarkers: Map<string, number> = new Map();
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Track an analytics event
   */
  trackEvent(
    eventType: EventType | string,
    properties: Record<string, string | number | boolean | undefined> = {},
    userId?: string
  ): void {
    const event: AnalyticsEvent = {
      name: eventType,
      timestamp: Date.now(),
      userId,
      properties,
    };

    this.events.push(event);

    // Log in development mode
    if (this.isDevelopment) {
      console.log('[Analytics]', event.name, event.properties);
    }

    // In production, send to analytics service (e.g., Mixpanel, Amplitude, etc.)
    // Example: this.sendToAnalyticsService(event);
  }

  /**
   * Start a performance measurement
   */
  startPerformanceMeasure(label: string): void {
    this.performanceMarkers.set(label, performance.now());
  }

  /**
   * End a performance measurement and track the duration
   */
  endPerformanceMeasure(
    label: string,
    eventType: EventType | string,
    properties: Record<string, string | number | boolean | undefined> = {}
  ): number {
    const startTime = this.performanceMarkers.get(label);
    if (!startTime) {
      console.warn(`[Analytics] No start marker found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceMarkers.delete(label);

    this.trackEvent(eventType, {
      ...properties,
      duration: Math.round(duration),
    });

    return duration;
  }

  /**
   * Track order submission event
   */
  trackOrderSubmitted(
    orderId: string,
    poolId: string,
    amount: string,
    encryptionTime: number
  ): void {
    this.trackEvent(EventType.ORDER_SUBMITTED, {
      orderId,
      poolId,
      amount,
      encryptionTime: Math.round(encryptionTime),
    });
  }

  /**
   * Track order execution event
   */
  trackOrderExecuted(orderId: string, executedAmount: string): void {
    this.trackEvent(EventType.ORDER_EXECUTED, {
      orderId,
      executedAmount,
    });
  }

  /**
   * Track order cancellation event
   */
  trackOrderCancelled(orderId: string, reason?: string): void {
    this.trackEvent(EventType.ORDER_CANCELLED, {
      orderId,
      reason,
    });
  }

  /**
   * Track order slicing event
   */
  trackOrderSliced(orderId: string, sliceAmount: string): void {
    this.trackEvent(EventType.ORDER_SLICED, {
      orderId,
      sliceAmount,
    });
  }

  /**
   * Track withdrawal initiation
   */
  trackWithdrawalInitiated(orderId: string, amount: string): void {
    this.trackEvent(EventType.WITHDRAWAL_INITIATED, {
      orderId,
      amount,
    });
  }

  /**
   * Track withdrawal completion
   */
  trackWithdrawalCompleted(
    orderId: string,
    amount: string,
    txHash: string
  ): void {
    this.trackEvent(EventType.WITHDRAWAL_COMPLETED, {
      orderId,
      amount,
      txHash,
    });
  }

  /**
   * Track withdrawal failure
   */
  trackWithdrawalFailed(orderId: string, error: string): void {
    this.trackEvent(EventType.WITHDRAWAL_FAILED, {
      orderId,
      error,
    });
  }

  /**
   * Track encryption event
   */
  trackEncryption(
    success: boolean,
    duration: number,
    dataSize?: number,
    error?: string
  ): void {
    const eventType = success
      ? EventType.ENCRYPTION_COMPLETED
      : EventType.ENCRYPTION_FAILED;

    this.trackEvent(eventType, {
      duration: Math.round(duration),
      dataSize,
      error,
    });
  }

  /**
   * Track decryption event
   */
  trackDecryption(
    success: boolean,
    duration: number,
    dataSize?: number,
    error?: string
  ): void {
    const eventType = success
      ? EventType.DECRYPTION_COMPLETED
      : EventType.DECRYPTION_FAILED;

    this.trackEvent(eventType, {
      duration: Math.round(duration),
      dataSize,
      error,
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, message: string, stackTrace?: string): void {
    this.trackEvent(EventType.ERROR_OCCURRED, {
      errorType,
      message,
      stackTrace,
    });
  }

  /**
   * Track error retry attempt
   */
  trackErrorRetry(
    errorType: string,
    attempt: number,
    willRetry: boolean
  ): void {
    const eventType = willRetry
      ? EventType.ERROR_RETRY_ATTEMPTED
      : EventType.ERROR_RETRY_FAILED;

    this.trackEvent(eventType, {
      errorType,
      attempt,
    });
  }

  /**
   * Track wallet connection
   */
  trackWalletConnected(walletType: string, address: string): void {
    this.trackEvent(EventType.USER_CONNECTED_WALLET, {
      walletType,
      address: `${address.slice(0, 6)}...${address.slice(-4)}`,
    });
  }

  /**
   * Track wallet disconnection
   */
  trackWalletDisconnected(): void {
    this.trackEvent(EventType.USER_DISCONNECTED_WALLET, {});
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string): void {
    this.trackEvent(EventType.USER_NAVIGATED, {
      from,
      to,
    });
  }

  /**
   * Track transaction confirmation
   */
  trackTransactionConfirmed(txHash: string, type: string): void {
    this.trackEvent(EventType.TRANSACTION_CONFIRMED, {
      txHash,
      type,
    });
  }

  /**
   * Track transaction failure
   */
  trackTransactionFailed(txHash: string, type: string, error: string): void {
    this.trackEvent(EventType.TRANSACTION_FAILED, {
      txHash,
      type,
      error,
    });
  }

  /**
   * Get all tracked events
   */
  getAllEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all tracked events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Get event count by type
   */
  getEventCount(eventType: EventType | string): number {
    return this.events.filter((e) => e.name === eventType).length;
  }

  /**
   * Get average duration for a specific event type
   */
  getAverageDuration(eventType: EventType | string): number {
    const filteredEvents = this.events.filter((e) => e.name === eventType);
    if (filteredEvents.length === 0) return 0;

    const totalDuration = filteredEvents.reduce((sum, event) => {
      const duration = event.properties.duration;
      return sum + (typeof duration === 'number' ? duration : 0);
    }, 0);

    return Math.round(totalDuration / filteredEvents.length);
  }

  /**
   * Generate a summary report
   */
  generateReport(): Record<string, string | number | Record<string, Record<string, number>>> {
    const eventCounts = Object.values(EventType).reduce(
      (acc, type) => {
        const count = this.getEventCount(type);
        if (count > 0) {
          acc[type] = {
            count,
            avgDuration: this.getAverageDuration(type),
          };
        }
        return acc;
      },
      {} as Record<string, Record<string, number>>
    );

    return {
      totalEvents: this.events.length,
      eventCounts,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const analytics = new Analytics();

/**
 * Hook to track analytics events from React components
 */
export function useAnalytics() {
  return analytics;
}
