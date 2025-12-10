'use client';

import { useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { CONFIDENTIAL_TWAMM_ABI } from '@/lib/contracts/abi';
import { TWAMM_HOOK_ADDRESS, type PoolKey } from '@/lib/contracts/addresses';
import type { EncryptedOrderParams } from '@/types/fhe';

export function useConfidentialTWAMM() {
    const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();

    /**
     * Submit an encrypted TWAMM order
     */
    const submitOrder = async (
        poolKey: PoolKey,
        encryptedParams: EncryptedOrderParams
    ) => {
        try {
            console.log('Submitting encrypted order with params:', {
                amount: encryptedParams.amount,
                duration: encryptedParams.duration,
                direction: encryptedParams.direction,
                amountType: typeof encryptedParams.amount,
                durationType: typeof encryptedParams.duration,
                directionType: typeof encryptedParams.direction,
            });

            // Check if encrypted values are error objects (indicating encryption failed)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const checkIsError = (val: any) => {
                return val && typeof val === 'object' && 'success' in val && val.success === false;
            };

            if (checkIsError(encryptedParams.amount)) {
                throw new Error(`Amount encryption failed: ${encryptedParams.amount.error?.message || 'Unknown error'}`);
            }
            if (checkIsError(encryptedParams.duration)) {
                throw new Error(`Duration encryption failed: ${encryptedParams.duration.error?.message || 'Unknown error'}`);
            }
            if (checkIsError(encryptedParams.direction)) {
                throw new Error(`Direction encryption failed: ${encryptedParams.direction.error?.message || 'Unknown error'}`);
            }

            // Convert encrypted values to proper format for contract
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const convertToNumber = (val: any) => {
                if (typeof val === 'bigint') return val;
                if (typeof val === 'string') {
                    return BigInt(val.startsWith('0x') ? val : '0x' + val);
                }
                if (typeof val === 'number') return BigInt(val);
                throw new Error(`Cannot convert ${typeof val} to BigInt`);
            };

            const amount = convertToNumber(encryptedParams.amount);
            const duration = convertToNumber(encryptedParams.duration);
            const direction = convertToNumber(encryptedParams.direction);

            console.log('Converted encrypted values to BigInt successfully');

            return writeContract({
                address: TWAMM_HOOK_ADDRESS,
                abi: CONFIDENTIAL_TWAMM_ABI,
                functionName: 'submitEncryptedOrder',
                args: [
                    poolKey,
                    amount,
                    duration,
                    direction,
                ],
            });
        } catch (error) {
            console.error('Error in submitOrder:', error);
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
        });
    };

    /**
     * Cancel an encrypted order
     */
    const cancelOrder = async (
        poolKey: PoolKey,
        orderId: bigint,
        cancelSignal: any
    ) => {
        return writeContract({
            address: TWAMM_HOOK_ADDRESS,
            abi: CONFIDENTIAL_TWAMM_ABI,
            functionName: 'cancelEncryptedOrder',
            args: [poolKey, orderId, cancelSignal],
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
        });
    };

    return {
        submitOrder,
        executeSlice,
        cancelOrder,
        withdrawTokens,
        hash,
        isPending,
        isSuccess,
        error,
    };
}

/**
 * Hook to read order status
 */
export function useOrderStatus(poolKey: PoolKey | undefined, orderId: bigint | undefined) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: TWAMM_HOOK_ADDRESS,
        abi: CONFIDENTIAL_TWAMM_ABI,
        functionName: 'getOrderStatus',
        args: poolKey && orderId !== undefined ? [poolKey, orderId] : undefined,
        query: {
            enabled: !!poolKey && orderId !== undefined,
            refetchInterval: 10000, // Refetch every 10 seconds
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
export function useOrderEvents(onOrderSubmitted?: (log: any) => void) {
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
