'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useEthersSigner, useEthersProvider } from '@/lib/wagmi';
import { initFHEClient, resetFHE, getFHEInstance } from '@/lib/fhenix';

export function useFHE() {
    const { isConnected, address } = useAccount();
    const signer = useEthersSigner();
    const provider = useEthersProvider();
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Reset on disconnect
    useEffect(() => {
        if (!isConnected) {
            resetFHE();
            // Don't call setState in effect
        }
    }, [isConnected]);

    // Initialize FHE
    const initialize = useCallback(async () => {
        if (!signer || !provider) {
            setError(new Error('Signer or provider not available'));
            return;
        }

        try {
            setError(null);
           
            await initFHEClient(signer, provider);
       
            setIsReady(true);
        } catch (err) {
            const error = err as Error;
            setError(error);
            console.error('FHE init error:', error);
        }
    }, [signer, provider]);

    // Encrypt order parameters
    const encryptOrderData = useCallback(
        async (amount: bigint, duration: bigint, direction: 0 | 1) => {
            const instance = getFHEInstance();
            if (!instance) {
                throw new Error('FHE not initialized');
            }

            const encrypted = await instance.encryptObject({
                amount,
                duration,
                direction,
            });

            return encrypted;
        },
        []
    );

    return {
        isReady,
        isConnected,
        address,
        error,
        initialize,
        encryptOrderData,
    };
}
