'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useFHE } from '@/hooks/useFHE';
import { useConfidentialTWAMM } from '@/hooks/useConfidentialTWAMM';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useEncryptionTracking, useOrderTracking } from '@/hooks/useAnalytics';
import { parseError } from '@/lib/errors';
import { toast } from 'sonner';
import { SEPOLIA_TOKENS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, CheckCircle, ChevronDown } from 'lucide-react';

interface SimpleOrderFormProps {
  poolAddress?: string;
  onOrderSubmitted?: (orderId: string) => void;
}

// Available pools on Sepolia Testnet
// Update these with actual deployed pools from your Sepolia Uniswap v4 deployment
const MOCK_POOLS = [
  {
    id: '1',
    name: 'USDC/EUR',
    currency0: SEPOLIA_TOKENS.USDC,
    currency1: SEPOLIA_TOKENS.EURC,
    fee: 3000,
    tickSpacing: 60,
  },


];

/**
 * Simplified OrderForm with minimal dependencies
 * This version is designed to work without causing Turbopack hangs
 */
export function SimpleOrderForm({ poolAddress }: SimpleOrderFormProps) {
  const { isConnected, address } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { isReady: isFHEReady, initialize, encryptOrderData, error: fheError } = useFHE();
  const { submitOrder, hash, isPending, isSuccess, isError, failureReason, receipt, error: contractError } = useConfidentialTWAMM();
  const { showError, showSuccess } = useErrorHandler();
  const { startEncryption, endEncryption } = useEncryptionTracking();
  const { trackOrderSubmitted } = useOrderTracking();

  const [selectedPoolId, setSelectedPoolId] = useState('1');
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [direction, setDirection] = useState<'0' | '1'>('0');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState('');
  const [hasError, setHasError] = useState(false);

  // Track when contract error occurs from failed transactions
  useEffect(() => {
    if (contractError) {
      setHasError(true);
    }
  }, [contractError]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Unknown error occurred';
    
    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message || '';
      
      // Check for specific error patterns
      if (message.includes('RPC Request failed')) {
        return 'RPC call failed. Check that the contract is properly initialized on the network.';
      }
      
      if (message.includes('Execution reverted')) {
        // For execution reverted without details, likely FHE or pool validation issue
        return 'Contract execution reverted. Possible causes: (1) Pool does not exist or has different fee/tickSpacing than configured, (2) Token pair mismatch, (3) Encryption format incompatible, (4) Contract not properly initialized. Try: refreshing page, re-selecting pool, or checking Sepolia is selected.';
      }
      
      if (message.includes('execution reverted')) {
        return 'Execution reverted. Possible causes: (1) Pool does not exist or has different fee/tickSpacing than configured, (2) Token pair mismatch, (3) Encryption format incompatible, (4) Contract not properly initialized. Try: refreshing page, re-selecting pool, or checking Sepolia is selected.';
      }
      
      if (message.includes('CallExecutionError')) {
        // Provide more specific guidance
        return 'Contract execution failed. Likely causes: (1) Pool does not exist on this network, (2) Invalid encrypted parameters, (3) FHE library initialization issue.';
      }
      
      // Extract the first meaningful line
      const lines = message.split('\n').filter(line => line.trim().length > 0);
      const firstLine = lines[0]?.trim();
      
      if (firstLine && firstLine.length < 200) {
        return firstLine;
      }
      
      return 'Transaction execution failed. Check contract logic.';
    }
    
    // Handle string errors
    if (typeof error === 'string') {
      return error.substring(0, 150);
    }
    
    // Handle objects with message property
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorObj = error as Record<string, unknown>;
      return String(errorObj.message).substring(0, 150);
    }
    
    return 'An unexpected error occurred';
  };

  const selectedPool = MOCK_POOLS.find((p) => p.id === selectedPoolId) || MOCK_POOLS[0];
  const balance = balanceData ? (Number(balanceData.value) / 1e18).toFixed(4) : '0.0000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || !duration) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsEncrypting(true);
      setEncryptionProgress('Initializing FHE...');
      startEncryption('order_encryption');
     
      // Initialize if needed
      if (!isFHEReady) {
        
        console.log('Initializing FHE...');
        await initialize();
        console.log('FHE initialized');
      }

      setEncryptionProgress('Encrypting parameters...');
      const amountBigInt = BigInt(Math.floor(Number(amount) * 1e18));
      const durationBigInt = BigInt(Math.floor(Number(duration)));

      const encryptedParams = await encryptOrderData(
        amountBigInt,
        durationBigInt,
        Number(direction) as 0 | 1
      );

      const encryptionDuration = endEncryption(true, 'order_encryption');

      setEncryptionProgress('Submitting to blockchain...');

      const poolKey = {
        currency0: selectedPool.currency0 as `0x${string}`,
        currency1: selectedPool.currency1 as `0x${string}`,
        fee: 3000,
        tickSpacing: 60,
        hooks: (poolAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      };

      await submitOrder(poolKey, encryptedParams);

      // Track successful order submission
      const orderId = `${selectedPool.id}-${Date.now()}`;
      trackOrderSubmitted(orderId, selectedPool.id, amount, Math.round(encryptionDuration));

      setAmount('');
      setDuration('');
      setDirection('0');
      setEncryptionProgress('');
      showSuccess('Order submitted successfully!', 'Order Submitted');
    } catch (err) {
      const error = parseError(err);
      console.error('Order submission error:', error);
      setHasError(true);
      showError(error, {
        title: 'Order Submission Failed',
        retryable: error.isRetryable(),
        onRetry: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent),
      });
      setEncryptionProgress('');
    } finally {
      setIsEncrypting(false);
    }
  };

  const error = contractError || fheError;
  console.log('Order form error:', error);
  const isLoading = isPending || isEncrypting;

  return (
    <Card className="w-full border-slate-700 bg-slate-900">
      <CardHeader>
        <CardTitle>Submit Encrypted Order</CardTitle>
        <CardDescription>Create a privacy-preserving TWAMM order with FHE encryption</CardDescription>
      </CardHeader>

      <CardContent>
        {!isConnected ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Please connect your wallet to submit an order</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pool Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Select Pool</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPoolDropdown(!showPoolDropdown)}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-300 hover:border-slate-500"
                >
                  <span>{selectedPool.name}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPoolDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showPoolDropdown && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-slate-600 bg-slate-800 shadow-lg">
                    {MOCK_POOLS.map((pool) => (
                      <button
                        key={pool.id}
                        type="button"
                        onClick={() => {
                          setSelectedPoolId(pool.id);
                          setShowPoolDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {pool.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="rounded-lg bg-slate-800/50 p-2.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Wallet Balance</span>
                <span className="font-semibold text-slate-200">{balance} {balanceData?.symbol || 'ETH'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Order Amount (Token0)</label>
              <Input
                type="number"
                placeholder="1.5"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className="border-slate-600 bg-slate-800 text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Duration (Blocks)</label>
              <Input
                type="number"
                placeholder="100"
                step="1"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={isLoading}
                className="border-slate-600 bg-slate-800 text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Trade Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as '0' | '1')}
                disabled={isLoading}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              >
                <option value="0">Token0 → Token1</option>
                <option value="1">Token1 → Token0</option>
              </select>
            </div>

            {encryptionProgress && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-400">Encrypting & Submitting</p>
                    <p className="text-xs text-blue-300">{encryptionProgress}</p>
                  </div>
                </div>
              </div>
            )}

            {isPending && !hash && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-400">Awaiting Hash</p>
                    <p className="text-xs text-blue-300">Waiting for transaction hash from blockchain...</p>
                  </div>
                </div>
              </div>
            )}

            {hash && isPending && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Transaction Pending</p>
                      <p className="text-xs text-yellow-300">Waiting for blockchain confirmation...</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Transaction Hash</p>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-2">
                      <code className="text-xs font-mono text-slate-300 flex-1 truncate">{hash}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(hash)}
                        className="text-slate-400 hover:text-slate-300 transition-colors p-1"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {contractError && hasError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-red-400">Transaction Error</p>
                    <p className="text-xs text-red-300">{getErrorMessage(contractError)}</p>
                    {String(contractError).includes('RPC') && (
                      <p className="text-xs text-red-200 mt-2 p-2 bg-red-900/20 rounded">
                        💡 Tip: RPC errors can occur if the contract isn&apos;t properly initialized or there&apos;s a network issue. Try refreshing the page and ensuring your wallet is connected to Sepolia testnet.
                      </p>
                    )}
                    {String(contractError).includes('reverted') && !String(contractError).includes('RPC') && (
                      <p className="text-xs text-red-200 mt-2 p-2 bg-red-900/20 rounded">
                        💡 Debugging: Check that (1) the pool exists on Sepolia, (2) FHE encryption is working, (3) all parameters are valid. See console logs for more details.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        // Reset form state for retry
                        setAmount('');
                        setDuration('');
                        setDirection('0');
                        setEncryptionProgress('');
                        setHasError(false);
                      }}
                      className="mt-3 w-full px-3 py-2 text-xs font-medium rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 transition-colors"
                    >
                      Clear Error & Try Again
                    </button>
                    {hash && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-2">
                          <code className="text-xs font-mono text-slate-300 flex-1 truncate">{hash}</code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(hash)}
                            className="text-slate-400 hover:text-slate-300 transition-colors p-1"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isError && !contractError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-red-400">Receipt Error</p>
                    <p className="text-xs text-red-300">{getErrorMessage(failureReason)}</p>
                  </div>
                </div>
              </div>
            )}

            {hash && !isPending && !contractError && !isError && !hasError && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-400">Waiting for Confirmation</p>
                      <p className="text-xs text-blue-300">Transaction submitted, awaiting receipt...</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Transaction Hash</p>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-2">
                      <code className="text-xs font-mono text-slate-300 flex-1 truncate">{hash}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(hash)}
                        className="text-slate-400 hover:text-slate-300 transition-colors p-1"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSuccess && receipt && !isError && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-400">Order Confirmed</p>
                      <p className="text-xs text-green-300">Transaction successfully confirmed on blockchain!</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Block Number</p>
                      <p className="text-green-300 font-mono">{receipt.blockNumber.toString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Gas Used</p>
                      <p className="text-green-300 font-mono">{receipt.gasUsed.toString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !isConnected}
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEncrypting ? 'Encrypting...' : 'Submitting...'}
                </>
              ) : (
                'Submit Encrypted Order'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
