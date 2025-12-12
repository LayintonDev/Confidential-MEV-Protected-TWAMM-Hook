// Network Configuration - Sepolia Testnet
export const SEPOLIA_TESTNET = {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: {
        decimals: 18,
        name: 'Sepolia ETH',
        symbol: 'SepoliaETH',
    },
    rpcUrls: {
        default: {
            http: [
                'https://eth-sepolia.g.alchemy.com/v2/ol3ViWS-Mom7wFjwQ0up2',
                'https://sepolia.infura.io/v3/84842078b09946638c03157f83186060',
                'https://sepolia.drpc.org',
            ],
        },
        public: {
            http: [
                'https://eth-sepolia.g.alchemy.com/v2/ol3ViWS-Mom7wFjwQ0up2',
                'https://sepolia.infura.io/v3/84842078b09946638c03157f83186060',
                'https://sepolia.drpc.org',
            ],
        },
    },
    blockExplorers: {
        default: {
            name: 'Etherscan',
            url: 'https://sepolia.etherscan.io',
        },
    },
    testnet: true,
} as const;

// Contract Addresses - Sepolia Testnet Deployment
export const CONTRACT_ADDRESSES = {
    TWAMM_HOOK: process.env.NEXT_PUBLIC_TWAMM_HOOK_ADDRESS || '0x',
    POOL_MANAGER: process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '0x',
} as const;

// App Constants
export const APP_CONFIG = {
    APP_NAME: 'Confidential TWAMM',
    APP_DESCRIPTION: 'MEV-Protected Trading with Fully Homomorphic Encryption',
    EXECUTION_INTERVAL: 100, // blocks
    DEFAULT_SLIPPAGE: 0.5, // 0.5%
} as const;

// Sepolia Token Addresses
// Update these with actual token addresses on Sepolia
export const SEPOLIA_TOKENS = {
    USDC: process.env.NEXT_PUBLIC_SEPOLIA_USDC || '0x',
    EURC: process.env.NEXT_PUBLIC_SEPOLIA_EURC || '0x',
    USDT: process.env.NEXT_PUBLIC_SEPOLIA_USDT || '0x',
    WETH: process.env.NEXT_PUBLIC_SEPOLIA_WETH || '0x',
} as const;

// Pool Configuration - Sepolia
export const DEFAULT_POOL = {
    currency0: SEPOLIA_TOKENS.USDC,
    currency1: SEPOLIA_TOKENS.EURC,
    fee: 3000, // 0.3%
    tickSpacing: 60,
    hooks: CONTRACT_ADDRESSES.TWAMM_HOOK,
} as const;
