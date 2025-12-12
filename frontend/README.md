# Confidential TWAMM Frontend

A Next.js frontend for the Confidential MEV-Protected TWAMM Hook on Uniswap v4.

## Features

- 🔐 **Fully Encrypted Orders** - All parameters encrypted with FHE
- 🛡️ **MEV Protection** - Prevent front-running and sandwich attacks
- ⚡ **Automated Execution** - Orders execute in slices over time
- 👁️ **Owner Privacy** - Only you can decrypt your order details

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Web3**: wagmi + viem
- **Wallet**: RainbowKit
- **State**: Zustand
- **FHE**: Fhenix (mock implementation for development)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp env.template .env.local

# Update .env.local with your values
```

### Environment Variables

```env
NEXT_PUBLIC_CHAIN_ID=412346
NEXT_PUBLIC_RPC_URL=https://api.helium.fhenix.zone
NEXT_PUBLIC_TWAMM_HOOK_ADDRESS=0x...
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── orders/            # Orders dashboard
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   └── providers.tsx      # Web3 providers
├── hooks/                 # Custom React hooks
│   ├── useFHE.ts         # FHE operations
│   └── useConfidentialTWAMM.ts  # Contract interactions
├── lib/                   # Utilities and configurations
│   ├── contracts/        # ABIs and addresses
│   ├── fhe/              # FHE encryption/decryption
│   ├── constants.ts      # App constants
│   ├── utils.ts          # Helper functions
│   └── wagmi.ts          # Wagmi configuration
└── types/                 # TypeScript types
    └── fhe.ts            # FHE type definitions
```

## Sprint Progress

### ✅ Sprint 1: Foundation (Complete)
- [x] Project setup
- [x] Wallet connection
- [x] FHE library integration
- [x] Contract ABIs
- [x] UI components
- [x] Landing page

### 🔄 Sprint 2: Core Features (Next)
- [ ] Order submission form
- [ ] Order dashboard
- [ ] Real-time updates
- [ ] Event listening

### 📋 Sprint 3: Advanced Features
- [ ] Withdrawal functionality
- [ ] Order cancellation
- [ ] Keeper bot
- [ ] UI polish

### 🎯 Sprint 4: Demo Preparation
- [ ] E2E testing
- [ ] Bug fixes
- [ ] Demo script
- [ ] Deployment

## Key Features Implementation

### FHE Encryption

```typescript
import { useFHE } from '@/hooks/useFHE';

const { encryptOrderParams, isReady } = useFHE();

const encrypted = await encryptOrderParams({
  amount: parseUnits('100', 18),
  duration: 1000n,
  direction: 0, // 0 = buy, 1 = sell
});
```

### Submit Order

```typescript
import { useConfidentialTWAMM } from '@/hooks/useConfidentialTWAMM';

const { submitOrder } = useConfidentialTWAMM();

await submitOrder(poolKey, encryptedParams);
```

### Monitor Order

```typescript
import { useOrderStatus } from '@/hooks/useConfidentialTWAMM';

const { orderStatus } = useOrderStatus(poolKey, orderId);
```

## Notes

- **FHE Implementation**: Currently using mock FHE for development. Replace with actual Fhenix SDK for production.
- **Contract Addresses**: Update in `.env.local` after deploying contracts to testnet.
- **Wallet Connection**: Supports MetaMask, WalletConnect, and other popular wallets via RainbowKit.

## License

MIT
