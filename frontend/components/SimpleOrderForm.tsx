'use client';

import { useState } from 'react';
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
    fee: 500,
    tickSpacing: 1,
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
  const { submitOrder, isPending, isSuccess, error: contractError } = useConfidentialTWAMM();
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
        currency0: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        currency1: '0x0000000000000000000000000000000000000002' as `0x${string}`,
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
              <div className="rounded-lg border border-slate-600 bg-slate-800 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  {encryptionProgress}
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Order submitted successfully!
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
