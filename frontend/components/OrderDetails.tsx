'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useFHE } from '@/hooks/useFHE';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Copy, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { WithdrawalSection } from './WithdrawalSection';
import { CancelOrderButton } from './CancelOrderButton';

interface OrderDetailsProps {
  orderId: string;
  poolAddress?: string;
  onClose?: () => void;
}

interface OrderData {
  id: string;
  owner: string;
  poolAddress: string;
  encryptedAmount: string;
  encryptedDuration: string;
  encryptedDirection: string;
  decryptedAmount?: string;
  decryptedDuration?: string;
  decryptedDirection?: string;
  status: 'active' | 'completed' | 'cancelled';
  startBlock: number;
  createdAt: Date;
  executedAmount?: string;
  totalSlices?: number;
  executedSlices?: number;
  lastExecuted?: Date;
  remainingBalance?: string;
}

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const { address } = useAccount();
  const { isReady: isFHEReady, initialize, error: fheError } = useFHE();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with real contract data
  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      try {
        // Simulate contract call delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockOrder: OrderData = {
          id: orderId,
          owner: address || '0x0000',
          poolAddress: '0x1234567890123456789012345678901234567890',
          encryptedAmount: '0x' + 'a'.repeat(64),
          encryptedDuration: '0x' + 'b'.repeat(32),
          encryptedDirection: '0x' + 'c'.repeat(32),
          status: 'active',
          startBlock: 123456,
          createdAt: new Date(),
          totalSlices: 10,
          executedSlices: 3,
          lastExecuted: new Date(Date.now() - 3600000),
        };

        setOrder(mockOrder);
      } catch (error) {
        console.error('Error loading order:', error);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, address]);

  const handleDecrypt = async () => {
    if (!order || !isFHEReady) {
      toast.error('FHE not ready');
      return;
    }

    setIsDecrypting(true);
    try {
      await initialize();

      // Mock decryption - replace with real decryption
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              decryptedAmount: '100.5 ETH',
              decryptedDuration: '100 blocks (~20 min)',
              decryptedDirection: 'SELL',
            }
          : null
      );

      setShowDecrypted(true);
      toast.success('Order decrypted successfully');
    } catch (error) {
      console.error('Decryption error:', error);
      toast.error('Failed to decrypt order');
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle>Loading Order Details...</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400">
          <div className="animate-pulse space-y-4">
            <div className="h-4 rounded bg-slate-800 w-3/4"></div>
            <div className="h-4 rounded bg-slate-800 w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            Order Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400">Order ID {orderId} could not be loaded.</CardContent>
      </Card>
    );
  }

  const isOwner = address?.toLowerCase() === order.owner.toLowerCase();
  const progressPercent = order.totalSlices ? ((order.executedSlices ?? 0) / order.totalSlices) * 100 : 0;

  return (
    <Card className="border-slate-700 bg-slate-900">
      <CardHeader className="border-b border-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Order Details</CardTitle>
            <CardDescription>Order ID: {orderId}</CardDescription>
          </div>
          <Badge
            variant={
              order.status === 'active' ? 'default' : order.status === 'completed' ? 'secondary' : 'destructive'
            }
          >
            {order.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Order Metadata */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between rounded bg-slate-800/50 p-3">
              <span className="text-slate-400">Owner Address</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-slate-200">
                  {order.owner.substring(0, 10)}...
                </code>
                <button
                  onClick={() => copyToClipboard(order.owner)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between rounded bg-slate-800/50 p-3">
              <span className="text-slate-400">Pool Address</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-slate-200">
                  {order.poolAddress.substring(0, 10)}...
                </code>
                <button
                  onClick={() => copyToClipboard(order.poolAddress)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between rounded bg-slate-800/50 p-3">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-200">{order.createdAt.toLocaleString()}</span>
            </div>

            <div className="flex justify-between rounded bg-slate-800/50 p-3">
              <span className="text-slate-400">Start Block</span>
              <span className="text-slate-200">#{order.startBlock.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Encrypted Parameters */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Lock className="h-4 w-4" />
            Encrypted Parameters
          </h3>
          <div className="space-y-2 text-sm">
            <div className="rounded border border-slate-700 bg-slate-800/50 p-3">
              <div className="text-xs text-slate-400 mb-1">Amount (Encrypted)</div>
              <code className="break-all font-mono text-xs text-slate-300">
                {order.encryptedAmount}
              </code>
            </div>

            <div className="rounded border border-slate-700 bg-slate-800/50 p-3">
              <div className="text-xs text-slate-400 mb-1">Duration (Encrypted)</div>
              <code className="break-all font-mono text-xs text-slate-300">
                {order.encryptedDuration}
              </code>
            </div>

            <div className="rounded border border-slate-700 bg-slate-800/50 p-3">
              <div className="text-xs text-slate-400 mb-1">Direction (Encrypted)</div>
              <code className="break-all font-mono text-xs text-slate-300">
                {order.encryptedDirection}
              </code>
            </div>
          </div>
        </div>

        {/* Decrypted Parameters (Owner Only) */}
        {isOwner && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Unlock className="h-4 w-4" />
                Decrypted Parameters (Owner Only)
              </h3>
              {!showDecrypted && (
                <button
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDecrypt}
                  disabled={isDecrypting || !isFHEReady}
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                </button>
              )}
            </div>

            {showDecrypted && order.decryptedAmount ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded bg-green-900/20 p-3">
                  <span className="text-slate-400">Amount</span>
                  <span className="font-semibold text-green-400">{order.decryptedAmount}</span>
                </div>

                <div className="flex justify-between rounded bg-green-900/20 p-3">
                  <span className="text-slate-400">Duration</span>
                  <span className="font-semibold text-green-400">{order.decryptedDuration}</span>
                </div>

                <div className="flex justify-between rounded bg-green-900/20 p-3">
                  <span className="text-slate-400">Direction</span>
                  <span className="font-semibold text-green-400">{order.decryptedDirection}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Execution Progress */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Execution Progress</h3>
          <div className="space-y-3">
            <div className="rounded bg-slate-800/50 p-3">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">Slices Executed</span>
                <span className="font-mono text-slate-200">
                  {order.executedSlices} / {order.totalSlices}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-400 transition-all"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {order.lastExecuted && (
              <div className="flex justify-between rounded bg-slate-800/50 p-3 text-sm">
                <span className="text-slate-400">Last Executed</span>
                <span className="text-slate-200">
                  {Math.floor((Date.now() - order.lastExecuted.getTime()) / 60000)} min ago
                </span>
              </div>
            )}

            {order.remainingBalance && (
              <div className="flex justify-between rounded bg-slate-800/50 p-3 text-sm">
                <span className="text-slate-400">Remaining Balance</span>
                <span className="font-semibold text-amber-400">{order.remainingBalance}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isOwner && order.status === 'active' && (
          <div className="border-t border-slate-700 pt-6 space-y-6">
            <CancelOrderButton
              orderId={BigInt(order.id)}
              poolKey={{
                currency0: '0x0' as `0x${string}`,
                currency1: '0x0' as `0x${string}`,
                fee: 3000,
                tickSpacing: 60,
                hooks: '0x0' as `0x${string}`,
              }}
              owner={order.owner}
              status={order.status as 'active' | 'completed' | 'cancelled'}
            />
            <WithdrawalSection
              orderId={BigInt(order.id)}
              poolKey={{
                currency0: '0x0' as `0x${string}`,
                currency1: '0x0' as `0x${string}`,
                fee: 3000,
                tickSpacing: 60,
                hooks: '0x0' as `0x${string}`,
              }}
            />
          </div>
        )}

        {order.status === 'completed' && (
          <div className="rounded border border-green-700/50 bg-green-900/20 p-3">
            <p className="text-sm text-green-400">
              ✓ This order has been completed and all tokens have been distributed.
            </p>
          </div>
        )}

        {fheError && (
          <div className="rounded border border-red-700/50 bg-red-900/20 p-3">
            <p className="text-sm text-red-400">Error: {fheError.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
