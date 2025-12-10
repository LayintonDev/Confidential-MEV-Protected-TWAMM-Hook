# Frontend Architecture & Requirements
## Confidential MEV-Protected TWAMM Hook

**Version**: 1.0  
**Date**: 2025-12-04  
**Target**: Hackathon MVP Demo

---

## 1. Overview

The frontend application enables users to interact with the Confidential TWAMM Hook smart contract, providing a user-friendly interface for submitting encrypted TWAMM orders, monitoring execution, and withdrawing tokens.

### **Core Objectives**
- Enable encrypted order submission with client-side encryption
- Provide real-time order monitoring and status tracking
- Support secure token withdrawal
- Demonstrate MEV protection through encryption
- Deliver an intuitive, visually appealing demo experience

---

## 2. Technical Stack

### **Framework & Core**
- **React 18+** with TypeScript
- **Next.js 14+** (App Router) or **Vite** for rapid development
- **TailwindCSS** for styling (modern, responsive design)

### **Web3 Integration**
- **wagmi v2** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** or **ConnectKit** - Wallet connection UI
- **Uniswap v4 SDK** - Pool interaction utilities

### **FHE Integration**
- **Fhenix.js** - Client-side FHE encryption/decryption
- **fhevmjs** - FHE operations library

### **State Management**
- **Zustand** or **React Context** - Global state
- **TanStack Query (React Query)** - Server state & caching

### **UI Components**
- **shadcn/ui** - High-quality component library
- **Framer Motion** - Smooth animations
- **Recharts** or **Chart.js** - Data visualization

---

## 3. Application Architecture

### **3.1 Directory Structure**

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Landing/home page
│   │   ├── orders/
│   │   │   ├── page.tsx       # Orders dashboard
│   │   │   └── [id]/page.tsx  # Order detail page
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── orders/
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderList.tsx
│   │   │   └── OrderDetails.tsx
│   │   ├── wallet/
│   │   │   └── WalletConnect.tsx
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── hooks/
│   │   ├── useConfidentialTWAMM.ts    # Main contract hook
│   │   ├── useFHE.ts                  # FHE encryption/decryption
│   │   ├── useOrderStatus.ts          # Order monitoring
│   │   └── useWithdraw.ts             # Withdrawal logic
│   │
│   ├── lib/
│   │   ├── contracts/
│   │   │   ├── abi.ts                 # Contract ABIs
│   │   │   └── addresses.ts           # Contract addresses
│   │   ├── fhe/
│   │   │   ├── encrypt.ts             # FHE encryption utilities
│   │   │   ├── decrypt.ts             # FHE decryption utilities
│   │   │   └── types.ts               # FHE type definitions
│   │   ├── utils/
│   │   │   ├── formatting.ts          # Number/date formatting
│   │   │   └── validation.ts          # Input validation
│   │   └── constants.ts               # App constants
│   │
│   ├── types/
│   │   ├── order.ts                   # Order type definitions
│   │   └── pool.ts                    # Pool type definitions
│   │
│   └── styles/
│       └── globals.css                # Global styles
│
├── public/
│   ├── images/
│   └── fonts/
│
└── package.json
```

---

## 4. Core Features & User Flows

### **4.1 Wallet Connection**

**Requirements**:
- Support major wallets (MetaMask, WalletConnect, Coinbase Wallet)
- Display connected address and balance
- Network switching to testnet
- Disconnect functionality

**UI Components**:
- Wallet connection button
- Account dropdown with address, balance, disconnect
- Network indicator/switcher

---

### **4.2 Order Submission Flow**

**User Journey**:
1. User connects wallet
2. Selects trading pair (pool)
3. Enters order parameters:
   - Trade direction (Buy/Sell)
   - Total amount
   - Duration (in blocks or time)
4. Client-side encryption of parameters
5. Transaction approval
6. Order submitted to contract
7. Confirmation with order ID

**Form Fields**:
```typescript
interface OrderFormData {
  poolKey: PoolKey;
  direction: 'buy' | 'sell';  // 0 or 1
  amount: string;              // Token amount
  duration: string;            // Blocks or hours
}
```

**Encryption Process**:
```typescript
// Client-side encryption before submission
const encryptedAmount = await fheEncrypt(amount);
const encryptedDuration = await fheEncrypt(duration);
const encryptedDirection = await fheEncrypt(direction === 'buy' ? 0 : 1);
```

**UI Components**:
- Pool selector dropdown
- Direction toggle (Buy/Sell)
- Amount input with token balance
- Duration input with block/time converter
- Encryption status indicator
- Submit button with loading state
- Transaction confirmation modal

---

### **4.3 Order Dashboard**

**Requirements**:
- Display all user orders (active, completed, cancelled)
- Real-time status updates
- Filter and sort capabilities
- Order details view

**Order Card Information**:
- Order ID
- Pool/Trading pair
- Status (Active, Executing, Completed, Cancelled)
- Progress bar (executed vs total)
- Start time
- Estimated completion
- Actions (View details, Cancel, Withdraw)

**UI Components**:
- Order list/grid view
- Filter dropdown (All, Active, Completed, Cancelled)
- Sort options (Date, Amount, Status)
- Search by order ID
- Pagination or infinite scroll

---

### **4.4 Order Details Page**

**Requirements**:
- Detailed order information
- Execution history timeline
- Real-time updates
- Decryption of user's own order data

**Information Displayed**:
- Order metadata (ID, owner, timestamp)
- Encrypted parameters (with decrypt option)
- Decrypted values (for owner only)
- Execution progress
- Slice execution history
- Token balances available for withdrawal
- Transaction links (block explorer)

**Decryption Flow**:
```typescript
// Decrypt user's own order data
const decryptedAmount = await fheDecrypt(order.amount);
const decryptedDuration = await fheDecrypt(order.duration);
const decryptedDirection = await fheDecrypt(order.direction);
```

**UI Components**:
- Order header with status badge
- Parameter cards (encrypted/decrypted toggle)
- Progress visualization
- Execution timeline
- Withdrawal section
- Cancel order button

---

### **4.5 Withdrawal Flow**

**Requirements**:
- Display available balances per order
- Support withdrawal of both tokens
- Transaction confirmation
- Success feedback

**User Journey**:
1. Navigate to order details
2. View available token balances
3. Click "Withdraw Tokens"
4. Approve transaction
5. Receive tokens
6. Confirmation message

**UI Components**:
- Balance display cards
- Withdraw button (disabled if no balance)
- Transaction modal
- Success/error notifications

---

### **4.6 Order Cancellation**

**Requirements**:
- Encrypted cancellation signal
- Owner-only access
- Confirmation dialog
- Status update

**Cancellation Flow**:
```typescript
// Create encrypted cancel signal
const cancelSignal = await fheEncrypt(true);
await cancelEncryptedOrder(poolKey, orderId, cancelSignal);
```

**UI Components**:
- Cancel button (active orders only)
- Confirmation modal
- Encryption status
- Transaction feedback

---

## 5. Key React Hooks

### **5.1 useConfidentialTWAMM**

Main hook for contract interactions:

```typescript
export function useConfidentialTWAMM() {
  const { data: hash, writeContract } = useWriteContract();
  
  const submitOrder = async (params: OrderParams) => {
    // Encrypt parameters
    const encrypted = await encryptOrderParams(params);
    
    // Submit to contract
    return writeContract({
      address: CONTRACT_ADDRESS,
      abi: TWAMM_ABI,
      functionName: 'submitEncryptedOrder',
      args: [
        params.poolKey,
        encrypted.amount,
        encrypted.duration,
        encrypted.direction
      ]
    });
  };
  
  const cancelOrder = async (poolKey: PoolKey, orderId: bigint) => {
    const cancelSignal = await fheEncrypt(true);
    return writeContract({
      address: CONTRACT_ADDRESS,
      abi: TWAMM_ABI,
      functionName: 'cancelEncryptedOrder',
      args: [poolKey, orderId, cancelSignal]
    });
  };
  
  const withdraw = async (poolKey: PoolKey, orderId: bigint) => {
    return writeContract({
      address: CONTRACT_ADDRESS,
      abi: TWAMM_ABI,
      functionName: 'withdrawTokens',
      args: [poolKey, orderId]
    });
  };
  
  return { submitOrder, cancelOrder, withdraw, hash };
}
```

---

### **5.2 useFHE**

FHE encryption/decryption utilities:

```typescript
export function useFHE() {
  const [fheInstance, setFheInstance] = useState<FheInstance | null>(null);
  
  useEffect(() => {
    // Initialize FHE instance
    initFHE().then(setFheInstance);
  }, []);
  
  const encryptUint256 = async (value: bigint): Promise<euint256> => {
    if (!fheInstance) throw new Error('FHE not initialized');
    return fheInstance.encrypt_uint256(value);
  };
  
  const encryptUint64 = async (value: bigint): Promise<euint64> => {
    if (!fheInstance) throw new Error('FHE not initialized');
    return fheInstance.encrypt_uint64(value);
  };
  
  const encryptBool = async (value: boolean): Promise<ebool> => {
    if (!fheInstance) throw new Error('FHE not initialized');
    return fheInstance.encrypt_bool(value);
  };
  
  const decrypt = async (encrypted: any): Promise<any> => {
    if (!fheInstance) throw new Error('FHE not initialized');
    return fheInstance.decrypt(encrypted);
  };
  
  return { 
    encryptUint256, 
    encryptUint64, 
    encryptBool, 
    decrypt,
    isReady: !!fheInstance 
  };
}
```

---

### **5.3 useOrderStatus**

Real-time order monitoring:

```typescript
export function useOrderStatus(poolKey: PoolKey, orderId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: TWAMM_ABI,
    functionName: 'getOrderStatus',
    args: [poolKey, orderId],
    query: {
      refetchInterval: 10000, // Poll every 10 seconds
    }
  });
  
  const [isActive, isCancelled, owner, startBlock, amount, duration] = data || [];
  
  return {
    order: {
      isActive,
      isCancelled,
      owner,
      startBlock,
      amount,
      duration
    },
    isLoading,
    error,
    refetch
  };
}
```

---

### **5.4 useOrderEvents**

Listen to contract events:

```typescript
export function useOrderEvents(userAddress: Address) {
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Listen for OrderSubmitted events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: TWAMM_ABI,
    eventName: 'OrderSubmitted',
    onLogs(logs) {
      const userOrders = logs.filter(log => 
        log.args.owner === userAddress
      );
      // Update orders state
    }
  });
  
  // Listen for SliceExecuted events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: TWAMM_ABI,
    eventName: 'SliceExecuted',
    onLogs(logs) {
      // Update execution progress
    }
  });
  
  return { orders };
}
```

---

## 6. UI/UX Design Requirements

### **6.1 Design Principles**
- **Modern & Premium**: Sleek, professional interface
- **Dark Mode First**: Crypto-native aesthetic
- **Responsive**: Mobile, tablet, desktop support
- **Accessible**: WCAG 2.1 AA compliance
- **Fast**: Optimistic updates, skeleton loaders

### **6.2 Color Palette**

```css
:root {
  /* Primary */
  --primary: 220 90% 56%;        /* Blue */
  --primary-foreground: 0 0% 100%;
  
  /* Secondary */
  --secondary: 280 80% 60%;      /* Purple */
  --secondary-foreground: 0 0% 100%;
  
  /* Accent */
  --accent: 160 84% 39%;         /* Green (success) */
  --destructive: 0 84% 60%;      /* Red (cancel/error) */
  
  /* Background */
  --background: 222 47% 11%;     /* Dark blue-gray */
  --foreground: 213 31% 91%;     /* Light gray */
  
  /* Card */
  --card: 222 47% 14%;
  --card-foreground: 213 31% 91%;
  
  /* Border */
  --border: 217 33% 17%;
  --input: 217 33% 17%;
}
```

### **6.3 Typography**

```css
/* Fonts */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### **6.4 Key UI Components**

**Order Status Badge**:
```tsx
<Badge variant={
  isActive ? 'success' : 
  isCancelled ? 'destructive' : 
  'secondary'
}>
  {status}
</Badge>
```

**Progress Bar**:
```tsx
<Progress 
  value={(executedAmount / totalAmount) * 100} 
  className="h-2"
/>
```

**Encryption Indicator**:
```tsx
<div className="flex items-center gap-2">
  <Lock className="w-4 h-4 text-green-500" />
  <span className="text-sm text-muted-foreground">
    Encrypted
  </span>
</div>
```

---

## 7. State Management

### **7.1 Global State (Zustand)**

```typescript
interface AppState {
  // User state
  selectedPool: PoolKey | null;
  setSelectedPool: (pool: PoolKey) => void;
  
  // Orders state
  userOrders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (orderId: bigint, updates: Partial<Order>) => void;
  
  // UI state
  isEncrypting: boolean;
  setIsEncrypting: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPool: null,
  setSelectedPool: (pool) => set({ selectedPool: pool }),
  
  userOrders: [],
  addOrder: (order) => set((state) => ({
    userOrders: [...state.userOrders, order]
  })),
  updateOrder: (orderId, updates) => set((state) => ({
    userOrders: state.userOrders.map(order =>
      order.id === orderId ? { ...order, ...updates } : order
    )
  })),
  
  isEncrypting: false,
  setIsEncrypting: (value) => set({ isEncrypting: value }),
}));
```

---

## 8. Error Handling

### **8.1 Error Types**

```typescript
enum ErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
}
```

### **8.2 Error Handling Pattern**

```typescript
try {
  setIsEncrypting(true);
  const encrypted = await encryptOrderParams(params);
  
  const hash = await submitOrder(encrypted);
  
  toast.success('Order submitted successfully!');
  
} catch (error) {
  if (error.code === 'ACTION_REJECTED') {
    toast.error('Transaction rejected by user');
  } else if (error.message.includes('insufficient funds')) {
    toast.error('Insufficient balance');
  } else {
    toast.error('Failed to submit order');
    console.error(error);
  }
} finally {
  setIsEncrypting(false);
}
```

---

## 9. Performance Optimization

### **9.1 Code Splitting**

```typescript
// Lazy load heavy components
const OrderDetails = lazy(() => import('@/components/orders/OrderDetails'));
const ChartComponent = lazy(() => import('@/components/charts/ExecutionChart'));
```

### **9.2 Memoization**

```typescript
// Memoize expensive calculations
const executionProgress = useMemo(() => {
  return (executedAmount / totalAmount) * 100;
}, [executedAmount, totalAmount]);

// Memoize callbacks
const handleSubmit = useCallback(async (data: OrderFormData) => {
  // Submit logic
}, [submitOrder]);
```

### **9.3 Optimistic Updates**

```typescript
const { mutate } = useMutation({
  mutationFn: submitOrder,
  onMutate: async (newOrder) => {
    // Optimistically update UI
    addOrder({ ...newOrder, status: 'pending' });
  },
  onError: (error, newOrder, context) => {
    // Rollback on error
    removeOrder(newOrder.id);
  },
  onSuccess: (data) => {
    // Update with real data
    updateOrder(data.orderId, { status: 'active' });
  }
});
```

---

## 10. Testing Strategy

### **10.1 Unit Tests**
- FHE encryption/decryption utilities
- Formatting and validation functions
- Custom hooks logic

### **10.2 Integration Tests**
- Contract interaction flows
- Wallet connection
- Order submission E2E

### **10.3 E2E Tests (Playwright)**
- Complete user journeys
- Order submission → execution → withdrawal
- Error scenarios

---

## 11. Deployment & Environment

### **11.1 Environment Variables**

```env
# Network
NEXT_PUBLIC_CHAIN_ID=412346  # Fhenix testnet
NEXT_PUBLIC_RPC_URL=https://api.helium.fhenix.zone

# Contracts
NEXT_PUBLIC_TWAMM_HOOK_ADDRESS=0x...
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...

# FHE
NEXT_PUBLIC_FHE_LIB_URL=https://...

# Analytics (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### **11.2 Build & Deploy**

```bash
# Development
npm run dev

# Build
npm run build

# Deploy (Vercel)
vercel deploy

# Or Netlify
netlify deploy --prod
```

---

## 12. Demo Checklist

### **Pre-Demo Setup**
- [ ] Deploy contracts to testnet
- [ ] Fund demo wallet with testnet tokens
- [ ] Create test pool with liquidity
- [ ] Verify FHE library integration
- [ ] Test all user flows

### **Demo Script**
1. **Introduction** (1 min)
   - Show landing page
   - Explain MEV protection concept

2. **Order Submission** (2 min)
   - Connect wallet
   - Fill order form
   - Show encryption process
   - Submit transaction

3. **Order Monitoring** (2 min)
   - View order dashboard
   - Show order details
   - Decrypt parameters (owner view)
   - Display execution progress

4. **Execution & Withdrawal** (2 min)
   - Trigger slice execution (keeper)
   - Show updated progress
   - Withdraw tokens
   - Show final balances

5. **Privacy Demonstration** (1 min)
   - Show encrypted on-chain data
   - Compare to traditional TWAMM
   - Highlight MEV protection

---

## 13. Future Enhancements (Post-MVP)

### **Phase 2 Features**
- [ ] Advanced order types (limit orders, stop-loss)
- [ ] Portfolio analytics dashboard
- [ ] Multi-pool order management
- [ ] Order templates and presets
- [ ] Mobile app (React Native)
- [ ] Notification system (email, push)
- [ ] Social features (share orders, leaderboard)
- [ ] Advanced charting (TradingView integration)

### **Technical Improvements**
- [ ] WebSocket for real-time updates
- [ ] Service worker for offline support
- [ ] Advanced caching strategies
- [ ] Multi-language support (i18n)
- [ ] Accessibility improvements
- [ ] Performance monitoring (Sentry, LogRocket)

---

## 14. Resources & Documentation

### **Required Documentation**
- [ ] User guide (how to submit orders)
- [ ] FHE encryption explainer
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Component storybook

### **Developer Resources**
- [ ] Setup instructions (README)
- [ ] Architecture diagrams
- [ ] Code style guide
- [ ] Contributing guidelines
- [ ] Deployment guide

---

## 15. Success Metrics

### **Technical Metrics**
- Page load time < 2s
- Time to interactive < 3s
- Encryption time < 1s
- Transaction success rate > 95%

### **User Experience Metrics**
- Order submission completion rate
- Average time to submit order
- Error rate
- User satisfaction (demo feedback)

---

## Conclusion

This frontend architecture provides a comprehensive foundation for building a production-ready demo of the Confidential TWAMM Hook. The modular design, modern tech stack, and focus on user experience will create an impressive demonstration of MEV-protected trading with full homomorphic encryption.

**Estimated Development Time**: 5-7 days for MVP
**Team Size**: 1-2 frontend developers

**Next Steps**:
1. Set up project boilerplate
2. Implement FHE integration
3. Build core components
4. Integrate with smart contract
5. Testing and refinement
6. Demo preparation
