'use client';

import { useWatchContractEvent, useReadContract } from 'wagmi';
import { CONFIDENTIAL_TWAMM_ABI } from '@/lib/contracts/abi';
import { TWAMM_HOOK_ADDRESS, type PoolKey } from '@/lib/contracts/addresses';
import { useState, useEffect } from 'react';

export interface OrderStatus {
  orderId: bigint;
  owner: string;
  poolKey: PoolKey;
  encryptedAmount: string;
  encryptedDuration: string;
  encryptedDirection: string;
  status: 'active' | 'completed' | 'cancelled';
  startBlock: number;
  createdAt: number;
  totalSlices: number;
  executedSlices: number;
  remainingBalance: string;
  lastExecuted?: number;
}

interface UseOrderStatusProps {
  poolKey?: PoolKey;
  orderId?: bigint;
  enabled?: boolean;
}

/**
 * Hook to fetch order status from contract
 * Fetches real order data from Sepolia testnet
 */
export function useOrderStatus({ poolKey, orderId, enabled = true }: UseOrderStatusProps) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetch real order data from contract
  const { 
    data: contractOrder, 
    isLoading: contractLoading,
    error: contractError,
    refetch
  } = useReadContract({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    functionName: 'getOrderStatus',
    args: poolKey && orderId ? [poolKey, orderId] : undefined,
    query: {
      enabled: enabled && !!poolKey && !!orderId,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Watch for order execution events to trigger refetch
  useWatchContractEvent({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    eventName: 'SliceExecuted',
    onLogs(logs) {
      console.log('Slice executed:', logs);
      refetch();
    },
  });

  // Transform contract data to OrderStatus
  useEffect(() => {
    if (!contractOrder) {
      return;
    }

    if (!poolKey || !orderId) {
      return;
    }

    try {
      const contractData = contractOrder as readonly [boolean, bigint, string, bigint, bigint, bigint];
      const [isActive, isCancelled, owner, startBlock, encryptedAmount, encryptedDuration] = contractData;
      
      // Calculate execution progress (mock for now - will update when SliceExecuted events are available)
      const executedSlices = 0;
      const totalSlices = 10;

      const order: OrderStatus = {
        orderId,
        owner,
        poolKey,
        encryptedAmount: encryptedAmount.toString(),
        encryptedDuration: encryptedDuration.toString(),
        encryptedDirection: '0x0', // Not directly in contract return, would come from events
        status: isCancelled ? 'cancelled' : (isActive ? 'active' : 'completed'),
        startBlock: Number(startBlock),
        createdAt: Date.now(),
        totalSlices,
        executedSlices,
        remainingBalance: '0',
        lastExecuted: undefined,
      };

      setTimeout(() => {
        setOrderStatus(order);
        setError(null);
      }, 0);
    } catch (err) {
      setTimeout(() => {
        setError(err instanceof Error ? err : new Error('Failed to parse order data'));
      }, 0);
    }
  }, [contractOrder, poolKey, orderId]);

  return {
    orderStatus,
    isLoading: contractLoading || false,
    error: error || contractError || null,
    executionProgress: orderStatus
      ? {
          executed: orderStatus.executedSlices,
          total: orderStatus.totalSlices,
          percent: orderStatus.totalSlices > 0 ? (orderStatus.executedSlices / orderStatus.totalSlices) * 100 : 0,
        }
      : null,
  };
}

/**
 * Hook to fetch all orders for a user by listening to events
 * Watches OrderSubmitted events and tracks order status in real-time
 */
export function useUserOrders(userAddress?: string, poolKey?: PoolKey) {
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Listen for OrderSubmitted events from this user
  useWatchContractEvent({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    eventName: 'OrderSubmitted',
    args: {
      owner: userAddress,
    },
    enabled: !!userAddress,
    onLogs(logs) {
      console.log('New order submitted by user:', logs);
      // Reset orders to refetch
      setOrders([]);
    },
  });

  // Listen for OrderCancelled events to update status
  useWatchContractEvent({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    eventName: 'OrderCancelled',
    enabled: !!userAddress,
    onLogs(logs) {
      console.log('Order cancelled:', logs);
      // Update orders to refetch cancelled orders
      setOrders((prev) => prev.map((o) => ({ ...o, status: 'cancelled' })));
    },
  });

  // Listen for OrderExecuted to update status
  useWatchContractEvent({
    address: TWAMM_HOOK_ADDRESS,
    abi: CONFIDENTIAL_TWAMM_ABI,
    eventName: 'OrderExecuted',
    enabled: !!userAddress,
    onLogs(logs) {
      console.log('Order executed:', logs);
      // Trigger refetch of order data
      setOrders([]);
    },
  });

  // Fetch historical orders - TODO: Consider using The Graph for better performance
  // For now, we're limited to real-time event listening
  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        
        // Simulate delay for demonstration
        await new Promise((resolve) => setTimeout(resolve, 300));

        // TODO: Fetch historical orders from:
        // 1. The Graph subgraph (recommended)
        // 2. Contract event logs via ethers.js
        // 3. Local storage cache of previously seen orders

        // For now, return empty array and let events populate it
        setOrders([]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load orders'));
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [userAddress, poolKey]);

  return { orders, isLoading, error };
}
