'use client';

import { useWriteContract,  useReadContract, useWatchContractEvent, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONFIDENTIAL_TWAMM_ABI } from '@/lib/contracts/abi';
import { TWAMM_HOOK_ADDRESS, type PoolKey } from '@/lib/contracts/addresses';
import type { EncryptedOrderParams } from '@/types/fhe';
import { validateAndConvertOrder } from '@/lib/fhenix-validation';

export function useConfidentialTWAMM() {
    const { writeContract, data: hash, isPending: isPendingWrite, error: errorWrite } = useWriteContract();
    const publicClient = usePublicClient();
    
    // Only fetch receipt if we have a hash AND no write error
    // This prevents polling after a transaction fails at submission
    const { 
        data: receipt, 
        isSuccess: isSuccessReceipt,
        isError: isErrorReceipt,
        failureReason,
        error: errorReceipt 
    } = useWaitForTransactionReceipt({
        hash: hash && !errorWrite ? hash : undefined,
        confirmations: 1,
    });

    /**
     * Submit an encrypted TWAMM order and wait for confirmation
     */
    const submitOrder = async (
        poolKey: PoolKey,
        encryptedParams: EncryptedOrderParams
    ) => {
        try {
            console.log('[TWAMM] Submitting encrypted order with params:', {
                amount: encryptedParams.amount,
                duration: encryptedParams.duration,
                direction: encryptedParams.direction,
                amountType: typeof encryptedParams.amount,
                durationType: typeof encryptedParams.duration,
                directionType: typeof encryptedParams.direction,
            });

            // Validate encrypted values before submission
            const validation = validateAndConvertOrder({
                amount: encryptedParams.amount,
                duration: encryptedParams.duration,
                direction: encryptedParams.direction,
            });

            if (!validation.valid) {
                console.error('[TWAMM] Order validation failed:', validation.errors);
                throw new Error(`Order validation failed: ${validation.errors.join('; ')}`);
            }

            if (validation.warnings.length > 0) {
                console.warn('[TWAMM] Order validation warnings:', validation.warnings);
            }

            console.log('[TWAMM] Order validation passed, converting to contract format');

            // Use validated data for contract submission
            const amount = validation.data!.amount;
            const duration = validation.data!.duration;
            const direction = validation.data!.direction;

            console.log('[TWAMM] Submitting to contract:', {
                amount: amount.toString().substring(0, 20) + '...',
                duration: duration.toString(),
                direction: direction.toString(),
            });

            // Submit the transaction
            const result = writeContract({
                address: TWAMM_HOOK_ADDRESS,
                abi: CONFIDENTIAL_TWAMM_ABI,
                functionName: 'submitEncryptedOrder',
                args: [
                    poolKey,
                    amount,
                    duration,
                    direction,
                ],
                gas: 500000n, // Set explicit gas limit to prevent overflow
            });

            // Wait for transaction hash to be available
            console.log('[TWAMM] Waiting for transaction hash...');

            return result;
        } catch (error) {
            console.error('[TWAMM] Error in submitOrder:', error);
            throw error;
        }
    };

    /**
     * Wait for a transaction to be confirmed (public helper function)
     */
    const waitForTransaction = async (txHash: `0x${string}` | undefined) => {
        if (!txHash) {
            throw new Error('No transaction hash available');
        }

        if (!publicClient) {
            throw new Error('Public client not available');
        }

        console.log('[TWAMM] Waiting for transaction confirmation:', txHash);

        try {
            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
                confirmations: 1,
                pollingInterval: 1000, // Poll every 1 second
            });

            console.log('[TWAMM] Transaction confirmed:', {
                hash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                status: receipt.status,
                gasUsed: receipt.gasUsed.toString(),
            });

            if (receipt.status === 'reverted') {
                throw new Error('Transaction reverted on-chain');
            }

            return receipt;
        } catch (error) {
            console.error('[TWAMM] Error waiting for transaction:', error);
            throw error;
        }
    };

    /**
     * Execute a TWAMM slice
     */
    const executeSlice = async (poolKey: PoolKey, orderId: bigint) => {
        return writeContract({
            address: TWAMM_HOOK_ADDRESS,
            abi: CONFIDENTIAL_TWAMM_ABI,
            functionName: 'executeTWAMMSlice',
            args: [poolKey, orderId],
            gas: 300000n, // Set explicit gas limit
        });
    };

    /**
     * Cancel an encrypted order
     */
    const cancelOrder = async (
        poolKey: PoolKey,
        orderId: bigint,
        cancelSignal: unknown
    ) => {
        return writeContract({
            address: TWAMM_HOOK_ADDRESS,
            abi: CONFIDENTIAL_TWAMM_ABI,
            functionName: 'cancelEncryptedOrder',
            args: [poolKey, orderId, cancelSignal],
            gas: 300000n, // Set explicit gas limit
        });
    };

    /**
     * Withdraw tokens from completed order
     */
    const withdrawTokens = async (poolKey: PoolKey, orderId: bigint) => {
        return writeContract({
            address: TWAMM_HOOK_ADDRESS,
            abi: CONFIDENTIAL_TWAMM_ABI,
            functionName: 'withdrawTokens',
            args: [poolKey, orderId],
            gas: 200000n, // Set explicit gas limit
        });
    };

    return {
        submitOrder,
        executeSlice,
        cancelOrder,
        withdrawTokens,
        waitForTransaction,
        hash,
        isPending: isPendingWrite,
        isSuccess: isSuccessReceipt,
        isError: isErrorReceipt,
        failureReason,
        receipt,
        error: errorWrite || errorReceipt,
    };
}

/**
 * Hook to read order status with automatic refetching
 */
export function useOrderStatus(poolKey: PoolKey | undefined, orderId: bigint | undefined) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: TWAMM_HOOK_ADDRESS,
        abi: CONFIDENTIAL_TWAMM_ABI,
        functionName: 'getOrderStatus',
        args: poolKey && orderId !== undefined ? [poolKey, orderId] : undefined,
        query: {
            enabled: !!poolKey && orderId !== undefined,
            refetchInterval: 2000, // Refetch every 2 seconds (was 10)
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            staleTime: 1000, // Data is stale after 1 second
        },
    });

    return {
        orderStatus: data ? {
            isActive: data[0],
            isCancelled: data[1],
            owner: data[2],
            startBlock: data[3],
            amount: data[4],
            duration: data[5],
        } : null,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to watch contract events
 */
export function useOrderEvents(onOrderSubmitted?: (log: unknown) => void) {
    useWatchContractEvent({
        address: TWAMM_HOOK_ADDRESS,
        abi: CONFIDENTIAL_TWAMM_ABI,
        eventName: 'OrderSubmitted',
        onLogs(logs) {
            logs.forEach(log => {
                if (onOrderSubmitted) {
                    onOrderSubmitted(log);
                }
            });
        },
    });

    useWatchContractEvent({
        address: TWAMM_HOOK_ADDRESS,
        abi: CONFIDENTIAL_TWAMM_ABI,
        eventName: 'SliceExecuted',
        onLogs(logs) {
            console.log('Slice executed:', logs);
        },
    });

    useWatchContractEvent({
        address: TWAMM_HOOK_ADDRESS,
        abi: CONFIDENTIAL_TWAMM_ABI,
        eventName: 'OrderExecuted',
        onLogs(logs) {
            console.log('Order completed:', logs);
        },
    });
}
