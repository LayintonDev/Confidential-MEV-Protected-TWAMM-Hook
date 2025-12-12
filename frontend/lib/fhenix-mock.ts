'use client';

/**
 * Mock FHE Client for TWAMM - Simulates Fhenix SDK behavior
 * 
 * This mock implementation:
 * - Simulates encryption without requiring Fhenix infrastructure
 * - Returns realistic encrypted values (256-bit hex strings)
 * - Allows testing the complete order flow end-to-end
 * - Can be swapped out for real FHE when infrastructure is ready
 * 
 * IMPORTANT: This is for testing only. Replace with real FHE before production!
 */

import { fheDebugger } from './fhenix-debug';

export interface FHEInstance {
    isReady: boolean;
    publicKey: string | null;
    encryptNumber: (value: number | bigint) => Promise<string | bigint>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptObject: (values: Record<string, any>) => Promise<Record<string, string | bigint>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generatePermit: (config: any) => Promise<any>;
}

let instance: FHEInstance | null = null;

/**
 * Generate a realistic mock ciphertext
 * Returns a 256-bit (64 hex char) value that looks like encrypted data
 */
function generateMockCiphertext(seed: bigint): string {
    // Use the seed to generate a deterministic but varied ciphertext
    const seedNum = Number(seed % BigInt(0xFFFFFFFF));
    const hashValue = simpleHash(seedNum);
    
    // Create a 256-bit hex string
    const hex = hashValue.toString(16).padStart(64, '0');
    return '0x' + hex;
}

/**
 * Simple hash function for deterministic mock encryption
 */
function simpleHash(value: number): number {
    let hash = value;
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
    hash ^= hash >>> 16;
    return Math.abs(hash);
}

/**
 * Initialize mock FHE client
 * Simulates the cofhejs initialization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export async function initMockFHEClient(_signer: any, _provider: any): Promise<FHEInstance> {
    if (instance?.isReady) {
        return instance;
    }

    try {
        console.log('[MOCK FHE] Initializing mock FHE client...');
        console.warn('[MOCK FHE] WARNING: Using MOCK FHE encryption for testing only!');
        console.warn('[MOCK FHE] Replace with real Fhenix SDK before production deployment');
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create the mock FHE instance
        instance = {
            isReady: true,
            publicKey: '0x' + 'mock'.padEnd(64, '0'), // Mock public key
            
            encryptNumber: async (value: number | bigint) => {
                const startTime = Date.now();
                try {
                    const numValue = typeof value === 'bigint' ? value : BigInt(value);
                    
                    console.log('[MOCK FHE] Encrypting number:', numValue.toString().substring(0, 20) + '...');
                    
                    // Check if we should simulate a failure
                    if (fheDebugger.shouldSimulateFailure()) {
                        console.error('[MOCK FHE] Simulated encryption failure (DEBUG MODE)');
                        fheDebugger.trackEncryption('number', startTime, false);
                        throw new Error('Simulated encryption failure');
                    }
                    
                    // Get encryption delay (respects override from debugger)
                    const delay = fheDebugger.getEncryptionDelay();
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Generate mock ciphertext
                    const ciphertext = generateMockCiphertext(numValue);
                    
                    console.log('[MOCK FHE] Encryption successful, ciphertext:', ciphertext.substring(0, 20) + '...');
                    
                    // Return as BigInt for contract encoding
                    const asBigInt = BigInt(ciphertext);
                    fheDebugger.trackEncryption('number', startTime, true, ciphertext);
                    return asBigInt;
                } catch (error) {
                    console.error('[MOCK FHE] Encryption failed:', error);
                    fheDebugger.trackEncryption('number', startTime, false);
                    throw error;
                }
            },
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            encryptObject: async (values: Record<string, any>) => {
                console.log('[MOCK FHE] Starting batch encryption for:', Object.keys(values).join(', '));
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const encrypted: Record<string, any> = {};
                const errors: string[] = [];
                
                for (const [key, val] of Object.entries(values)) {
                    const startTime = Date.now();
                    try {
                        const numVal = typeof val === 'bigint' ? val : BigInt(val);
                        console.log(`[MOCK FHE] Encrypting ${key}: ${numVal.toString().substring(0, 20)}...`);
                        
                        // Check if we should simulate a failure for this field
                        if (fheDebugger.shouldSimulateFailure()) {
                            console.error(`[MOCK FHE] Simulated encryption failure for ${key} (DEBUG MODE)`);
                            fheDebugger.trackEncryption(key, startTime, false);
                            throw new Error(`Simulated encryption failure for ${key}`);
                        }
                        
                        // Simulate encryption with realistic delay
                        const delay = fheDebugger.getEncryptionDelay();
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        // Generate deterministic mock ciphertext based on field name + value
                        const seedValue = numVal ^ BigInt(key.length);
                        const ciphertext = generateMockCiphertext(seedValue);
                        const ciphertextBigInt = BigInt(ciphertext);
                        
                        console.log(`[MOCK FHE] ${key} encrypted successfully`);
                        fheDebugger.trackEncryption(key, startTime, true, ciphertext);
                        encrypted[key] = ciphertextBigInt;
                    } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        console.error(`[MOCK FHE] Failed to encrypt ${key}:`, errorMsg);
                        fheDebugger.trackEncryption(key, startTime, false);
                        errors.push(`${key}: ${errorMsg}`);
                    }
                }
                
                // If any encryption failed, throw error
                if (errors.length > 0) {
                    throw new Error(`Mock encryption failed: ${errors.join('; ')}`);
                }
                
                console.log('[MOCK FHE] Batch encryption completed successfully');
                return encrypted;
            },
            
            generatePermit: async () => {
                // Mock permit for contract interactions
                return { permit: '0x' + '00'.repeat(32) };
            },
        };

        console.log('[MOCK FHE] Mock FHE client ready');
        return instance;
    } catch (error) {
        console.error('[MOCK FHE] Initialization error:', error);
        throw error;
    }
}

/**
 * Get the current mock FHE instance
 */
export function getMockFHEInstance(): FHEInstance | null {
    return instance;
}

/**
 * Reset mock FHE state
 */
export function resetMockFHE() {
    instance = null;
    console.log('[MOCK FHE] FHE state reset');
}

/**
 * Verify if using mock FHE (for logging/debugging)
 */
export function isUsingMockFHE(): boolean {
    return true; // This module is always mock
}
