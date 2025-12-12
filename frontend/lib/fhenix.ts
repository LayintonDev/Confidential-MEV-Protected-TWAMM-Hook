'use client';

/**
 * FHE Client for TWAMM
 * 
 * Supports both:
 * 1. Real Fhenix SDK (cofhejs) for production
 * 2. Mock FHE for testing (when real SDK has infrastructure issues)
 * 
 * Configure which to use via the USE_MOCK_FHE environment variable:
 * - Set USE_MOCK_FHE=true in .env.local to use mock FHE for testing
 * - Leave unset or false to use real cofhejs (when infrastructure is ready)
 * 
 * Documentation: 
 * - Fhenix: https://cofhe.io
 * Mock: See /lib/fhenix-mock.ts
 */

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
let useMockFHE = false;

/**
 * Check if we should use mock FHE
 * Returns true by default (mock recommended for testing)
 * Only use real FHE when NEXT_PUBLIC_USE_MOCK_FHE is explicitly set to false
 */
function shouldUseMockFHE(): boolean {
    // Default to mock FHE unless explicitly disabled
    if (typeof process === 'undefined') return true;
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_FHE !== 'false';
    console.log(`[FHE CONFIG] Using ${useMock ? 'MOCK' : 'REAL'} FHE`);
    return useMock;
}

/**
 * Initialize FHE client (real or mock)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initFHEClient(signer: any, provider: any): Promise<FHEInstance> {
    if (instance?.isReady) {
        return instance;
    }

    // Determine which implementation to use
    useMockFHE = shouldUseMockFHE();
    
    if (useMockFHE) {
        console.log('[FHE] Initializing MOCK FHE (recommended for testing)');
        const { initMockFHEClient } = await import('./fhenix-mock');
        instance = await initMockFHEClient(signer, provider);
        return instance;
    } else {
        console.log('[FHE] Initializing REAL cofhejs FHE');
        instance = await initRealFHEClient(signer, provider);
        return instance;
    }
}

/**
 * Real FHE client initialization (cofhejs)
 * This is the actual Fhenix SDK integration
 * Currently blocked by ZK proof verification CORS issues
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initRealFHEClient(signer: any, provider: any): Promise<FHEInstance> {
    try {
        console.log('Initializing cofhejs FHE client...');
        
        // Import cofhejs at runtime
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { cofhejs } = await import('cofhejs/web') as any;

        // Initialize cofhejs with ethers provider and signer
        // Try both Sepolia and TESTNET environments
        let initResult = null;
        try {
            initResult = await cofhejs.initializeWithEthers({
                ethersProvider: provider,
                ethersSigner: signer,
                environment: 'SEPOLIA',
            });

            if (!initResult?.success) {
                console.warn('SEPOLIA initialization failed, trying TESTNET...');
                initResult = await cofhejs.initializeWithEthers({
                    ethersProvider: provider,
                    ethersSigner: signer,
                    environment: 'TESTNET',
                });
            }

            if (!initResult?.success) {
                const errorMsg = initResult?.error?.message || 'Unknown error';
                console.error('FHE initialization failed:', errorMsg);
                throw new Error(`FHE initialization failed: ${errorMsg}`);
            }
        } catch (error) {
            console.error('FHE initialization error:', error);
            throw error;
        }

        console.log('cofhejs initialized successfully')

  

        // Create the FHE instance
        instance = {
            isReady: true,
            publicKey: null, // cofhejs handles public key internally
            encryptNumber: async (value: number | bigint) => {
                try {
                    const numValue = typeof value === 'bigint' ? value : BigInt(value);
                    
                    console.log('Encrypting value:', numValue.toString().substring(0, 20) + '...');
                    
                    // cofhejs.encrypt returns {success, data, error}
                    let encryptResult;
                    try {
                        encryptResult = await cofhejs.encrypt(numValue);
                    } catch (err) {
                        console.error('Encryption call threw error:', err);
                        throw err;
                    }
                    
                    console.log('Encryption response:', {
                        success: encryptResult?.success,
                        hasData: !!encryptResult?.data,
                        hasError: !!encryptResult?.error,
                        errorMsg: encryptResult?.error?.message,
                    });
                    
                    // Check if encryption was successful
                    if (!encryptResult?.success) {
                        const errorMsg = encryptResult?.error?.message || encryptResult?.error?.toString?.() || 'Unknown error';
                        throw new Error(`Encryption failed: ${errorMsg}`);
                    }
                    
                    const encrypted = encryptResult.data;
                    if (!encrypted) {
                        throw new Error('Encryption succeeded but returned no data');
                    }
                    
                    console.log('Encryption successful, data type:', typeof encrypted);
                    
                    // Convert hex string to BigInt if needed
                    if (typeof encrypted === 'string') {
                        try {
                            const asBigInt = BigInt(encrypted.startsWith('0x') ? encrypted : '0x' + encrypted);
                            console.log('Converted hex string to BigInt');
                            return asBigInt;
                        } catch {
                            console.warn('Could not convert to BigInt, returning string');
                            return encrypted;
                        }
                    }
                    
                    return encrypted;
                } catch (error) {
                    console.error('encryptNumber error:', error);
                    throw error;
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            encryptObject: async (values: Record<string, any>) => {
                console.log('Starting batch encryption for:', Object.keys(values).join(', '));
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const encrypted: Record<string, any> = {};
                const errors: string[] = [];
                
                for (const [key, val] of Object.entries(values)) {
                    try {
                        // Convert to bigint
                        const numVal = typeof val === 'bigint' ? val : BigInt(val);
                        console.log(`Encrypting ${key}: ${numVal.toString().substring(0, 20)}...`);
                        
                        // cofhejs.encrypt returns {success, data, error}
                        let encryptResult;
                        try {
                            encryptResult = await cofhejs.encrypt(numVal);
                        } catch (err) {
                            throw new Error(`Encryption call threw: ${err instanceof Error ? err.message : String(err)}`);
                        }
                        
                        console.log(`Encryption response for ${key}:`, {
                            success: encryptResult?.success,
                            hasData: !!encryptResult?.data,
                            errorMsg: encryptResult?.error?.message,
                        });
                        
                        if (!encryptResult?.success) {
                            const errorMsg = encryptResult?.error?.message || encryptResult?.error?.toString?.() || 'Unknown error';
                            throw new Error(`${errorMsg}`);
                        }
                        
                        const encryptedValue = encryptResult.data;
                        if (!encryptedValue) {
                            throw new Error('No encrypted data returned');
                        }
                        
                        console.log(`${key} encrypted successfully (type: ${typeof encryptedValue})`);
                        
                        // Convert hex string to BigInt if needed
                        let finalValue = encryptedValue;
                        if (typeof encryptedValue === 'string') {
                            try {
                                finalValue = BigInt(encryptedValue.startsWith('0x') ? encryptedValue : '0x' + encryptedValue);
                                console.log(`Converted ${key} to BigInt`);
                            } catch {
                                console.warn(`Could not convert ${key} to BigInt, using string`);
                            }
                        }
                        
                        encrypted[key] = finalValue;
                    } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        console.error(`Failed to encrypt ${key}:`, errorMsg);
                        errors.push(`${key}: ${errorMsg}`);
                    }
                }
                
                // If any encryption failed, throw error
                if (errors.length > 0) {
                    throw new Error(`Encryption failed: ${errors.join('; ')}`);
                }
                
                console.log('Batch encryption completed successfully');
                return encrypted;
            },
            generatePermit: async () => {
                // cofhejs handles permits internally if needed
                // For now, return a placeholder
                return { permit: '0x' + '00'.repeat(32) };
            },
        };

        return instance;
    } catch (error) {
        console.error('Failed to initialize cofhejs FHE client:', error);
        throw error;
    }
}

/**
 * Get the current FHE instance
 */
export function getFHEInstance(): FHEInstance | null {
    return instance;
}

/**
 * Reset FHE state (for wallet switching)
 */
export function resetFHE() {
    instance = null;
}
