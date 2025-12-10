/**
 * Error types and utilities for the TWAMM application
 */

export enum ErrorType {
  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_DISCONNECTED = 'WALLET_DISCONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',

  // Balance errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',

  // Encryption errors
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  FHE_INITIALIZATION_FAILED = 'FHE_INITIALIZATION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',

  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_PENDING = 'TRANSACTION_PENDING',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',

  // Contract errors
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',
  INVALID_ORDER = 'INVALID_ORDER',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_NOT_ACTIVE = 'ORDER_NOT_ACTIVE',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',

  // Validation errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_POOL_KEY = 'INVALID_POOL_KEY',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Unknown errors
  UNKNOWN = 'UNKNOWN',
}

export const ErrorMessages: Record<ErrorType, string> = {
  [ErrorType.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue',
  [ErrorType.WALLET_DISCONNECTED]: 'Your wallet has been disconnected. Please reconnect.',
  [ErrorType.WRONG_NETWORK]: 'Please switch to Sepolia testnet',

  [ErrorType.INSUFFICIENT_BALANCE]: 'Insufficient token balance for this transaction',
  [ErrorType.INSUFFICIENT_GAS]: 'Insufficient gas to complete this transaction',

  [ErrorType.ENCRYPTION_FAILED]: 'Encryption failed. Please try again.',
  [ErrorType.FHE_INITIALIZATION_FAILED]: 'FHE initialization failed. Please refresh the page.',
  [ErrorType.DECRYPTION_FAILED]: 'Failed to decrypt order data. You may not be the order owner.',

  [ErrorType.TRANSACTION_FAILED]: 'Transaction failed. Please check the error details and try again.',
  [ErrorType.TRANSACTION_REJECTED]: 'Transaction rejected by user',
  [ErrorType.TRANSACTION_PENDING]: 'Transaction is still pending. Please wait...',
  [ErrorType.TRANSACTION_TIMEOUT]: 'Transaction timeout. Please check your transaction status.',

  [ErrorType.CONTRACT_ERROR]: 'Contract error occurred. Please try again.',
  [ErrorType.CONTRACT_CALL_FAILED]: 'Failed to call contract function',
  [ErrorType.INVALID_ORDER]: 'Invalid order data',
  [ErrorType.ORDER_NOT_FOUND]: 'Order not found',
  [ErrorType.ORDER_NOT_ACTIVE]: 'Order is not active',
  [ErrorType.ORDER_ALREADY_CANCELLED]: 'Order has already been cancelled',

  [ErrorType.INVALID_AMOUNT]: 'Invalid amount entered',
  [ErrorType.INVALID_DURATION]: 'Invalid duration entered',
  [ErrorType.INVALID_POOL_KEY]: 'Invalid pool key',

  [ErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
  [ErrorType.RPC_ERROR]: 'RPC endpoint error. Please try again.',
  [ErrorType.TIMEOUT]: 'Request timeout. Please try again.',

  [ErrorType.UNKNOWN]: 'An unknown error occurred. Please try again later.',
};

export class TWAMMError extends Error {
  constructor(
    public readonly type: ErrorType,
    message?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly originalError?: any
  ) {
    super(message || ErrorMessages[type]);
    this.name = 'TWAMMError';
  }

  isRetryable(): boolean {
    const retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.RPC_ERROR,
      ErrorType.TIMEOUT,
      ErrorType.TRANSACTION_TIMEOUT,
      ErrorType.TRANSACTION_PENDING,
    ];
    return retryableErrors.includes(this.type);
  }

  isFatal(): boolean {
    const fatalErrors = [
      ErrorType.WALLET_NOT_CONNECTED,
      ErrorType.WRONG_NETWORK,
      ErrorType.INVALID_ORDER,
      ErrorType.ORDER_NOT_FOUND,
    ];
    return fatalErrors.includes(this.type);
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Parse errors from various sources and convert to TWAMMError
 */
export function parseError(error: unknown): TWAMMError {
  if (error instanceof TWAMMError) {
    return error;
  }

  // Handle plain objects with message property
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const message = String(obj.message || obj.reason || JSON.stringify(obj)).toLowerCase();

    // Wallet errors
    if (message.includes('user rejected') || message.includes('user denied')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.TRANSACTION_REJECTED, String(obj.message || obj.reason), error as any);
    }

    if (message.includes('wallet not connected') || message.includes('no provider')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.WALLET_NOT_CONNECTED, undefined, error as any);
    }

    if (message.includes('wrong network') || message.includes('chain mismatch')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.WRONG_NETWORK, undefined, error as any);
    }

    // Balance errors
    if (message.includes('insufficient') && message.includes('balance')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.INSUFFICIENT_BALANCE, undefined, error as any);
    }

    if (message.includes('insufficient') && message.includes('gas')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.INSUFFICIENT_GAS, undefined, error as any);
    }

    // Encryption errors
    if (message.includes('encryption') || message.includes('encrypt')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.ENCRYPTION_FAILED, undefined, error as any);
    }

    if (message.includes('decryption') || message.includes('decrypt')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.DECRYPTION_FAILED, undefined, error as any);
    }

    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.NETWORK_ERROR, undefined, error as any);
    }

    if (message.includes('timeout')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.TIMEOUT, undefined, error as any);
    }

    // Transaction errors
    if (message.includes('transaction') && message.includes('failed')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.TRANSACTION_FAILED, undefined, error as any);
    }

    // Default to contract error for known Solidity errors
    if (message.includes('revert') || message.includes('contract')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new TWAMMError(ErrorType.CONTRACT_ERROR, String(obj.message || obj.reason), error as any);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new TWAMMError(ErrorType.UNKNOWN, String(obj.message || obj.reason || 'Unknown error'), error as any);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Wallet errors
    if (message.includes('user rejected') || message.includes('user denied')) {
      return new TWAMMError(ErrorType.TRANSACTION_REJECTED, undefined, error);
    }

    if (message.includes('wallet not connected') || message.includes('no provider')) {
      return new TWAMMError(ErrorType.WALLET_NOT_CONNECTED, undefined, error);
    }

    if (message.includes('wrong network') || message.includes('chain mismatch')) {
      return new TWAMMError(ErrorType.WRONG_NETWORK, undefined, error);
    }

    // Balance errors
    if (message.includes('insufficient') && message.includes('balance')) {
      return new TWAMMError(ErrorType.INSUFFICIENT_BALANCE, undefined, error);
    }

    if (message.includes('insufficient') && message.includes('gas')) {
      return new TWAMMError(ErrorType.INSUFFICIENT_GAS, undefined, error);
    }

    // Encryption errors
    if (message.includes('encryption') || message.includes('encrypt')) {
      return new TWAMMError(ErrorType.ENCRYPTION_FAILED, undefined, error);
    }

    if (message.includes('decryption') || message.includes('decrypt')) {
      return new TWAMMError(ErrorType.DECRYPTION_FAILED, undefined, error);
    }

    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      return new TWAMMError(ErrorType.NETWORK_ERROR, undefined, error);
    }

    if (message.includes('timeout')) {
      return new TWAMMError(ErrorType.TIMEOUT, undefined, error);
    }

    // Transaction errors
    if (message.includes('transaction') && message.includes('failed')) {
      return new TWAMMError(ErrorType.TRANSACTION_FAILED, undefined, error);
    }

    // Default to contract error for known Solidity errors
    if (message.includes('revert') || message.includes('contract')) {
      return new TWAMMError(ErrorType.CONTRACT_ERROR, error.message, error);
    }

    return new TWAMMError(ErrorType.UNKNOWN, error.message, error);
  }

  if (typeof error === 'string') {
    return new TWAMMError(ErrorType.UNKNOWN, error);
  }

  return new TWAMMError(ErrorType.UNKNOWN, 'An unknown error occurred');
}

/**
 * Helper to check if error is a specific type
 */
export function isErrorType(error: unknown, type: ErrorType): boolean {
  if (error instanceof TWAMMError) {
    return error.type === type;
  }
  return false;
}

/**
 * Helper to check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TWAMMError) {
    return error.isRetryable();
  }
  return false;
}
