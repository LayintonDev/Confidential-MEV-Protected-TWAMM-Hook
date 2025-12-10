import { CONTRACT_ADDRESSES } from '../constants';

// Export contract addresses
export const TWAMM_HOOK_ADDRESS = CONTRACT_ADDRESSES.TWAMM_HOOK as `0x${string}`;
export const POOL_MANAGER_ADDRESS = CONTRACT_ADDRESSES.POOL_MANAGER as `0x${string}`;

// Type for PoolKey structure
export interface PoolKey {
    currency0: `0x${string}`;
    currency1: `0x${string}`;
    fee: number;
    tickSpacing: number;
    hooks: `0x${string}`;
}

// Helper to create a PoolKey
export function createPoolKey(
    currency0: `0x${string}`,
    currency1: `0x${string}`,
    fee: number = 3000,
    tickSpacing: number = 60
): PoolKey {
    return {
        currency0,
        currency1,
        fee,
        tickSpacing,
        hooks: TWAMM_HOOK_ADDRESS,
    };
}
