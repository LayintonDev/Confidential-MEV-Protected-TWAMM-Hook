'use client';

import React from 'react';
import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { useConnectorClient } from 'wagmi';
import { BrowserProvider, JsonRpcProvider, JsonRpcApiProvider, type Signer } from 'ethers';
import { SEPOLIA_TESTNET } from './constants';

// Minimal wagmi config with only essential connectors
const walletConnectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [injected()];

// Only add WalletConnect if project ID is configured
if (walletConnectId && walletConnectId !== 'YOUR_PROJECT_ID') {
    connectors.push(
        walletConnect({
            projectId: walletConnectId,
        })
    );
}

export const config = createConfig({
    chains: [SEPOLIA_TESTNET as any],
    connectors,
    transports: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [SEPOLIA_TESTNET.id]: http(SEPOLIA_TESTNET.rpcUrls.default.http[0]) as any,
    },
});

/**
 * Convert wagmi's connectorClient to ethers Signer
 */
export function useEthersSigner(): Signer | undefined {
    const { data: connectorClient } = useConnectorClient();
    const [signer, setSigner] = React.useState<Signer | undefined>(undefined);

    React.useEffect(() => {
        if (!connectorClient) {
            setSigner(undefined);
            return;
        }

        // Convert viem client to ethers signer
        const convertToSigner = async () => {
            try {
                const provider = new BrowserProvider(connectorClient.transport);
                const ethersSigner = await provider.getSigner(connectorClient.account.address);
                setSigner(ethersSigner);
            } catch (error) {
                console.error('Failed to convert to ethers signer:', error);
                setSigner(undefined);
            }
        };

        convertToSigner();
    }, [connectorClient]);

    return signer;
}

/**
 * Get ethers provider from the configured chain
 */
export function useEthersProvider(): JsonRpcApiProvider | null {
    return React.useMemo(() => {
        // Only create provider on client side
        if (typeof window === 'undefined') {
            return null;
        }

        // Prefer window.ethereum if available
        if ((window as any).ethereum) {
            return new BrowserProvider((window as any).ethereum);
        }

        // Fallback to JSON-RPC provider
        const rpcUrl = SEPOLIA_TESTNET.rpcUrls.default.http[0];
        return new JsonRpcProvider(rpcUrl);
    }, []);
}
