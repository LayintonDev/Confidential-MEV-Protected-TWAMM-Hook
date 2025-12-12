# Sprint 1: Foundation & Setup
**Duration**: Days 1-2  
**Phase**: Phase 1 - Foundation  
**Goal**: Establish project infrastructure and core integrations

---

## Sprint Objectives

1. Set up Next.js project with TypeScript
2. Implement wallet connection
3. Integrate FHE library (Fhenix.js)
4. Create basic UI component library
5. Set up contract ABIs and addresses

---

## Tasks Breakdown

### **Day 1: Project Setup & Infrastructure**

#### **Task 1.1: Initialize Project** (2 hours)
**Priority**: Critical  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Create Next.js 14 project with TypeScript
  ```bash
  npx create-next-app@latest frontend --typescript --tailwind --app
  ```
- [ ] Install core dependencies:
  - wagmi, viem, @tanstack/react-query
  - @rainbow-me/rainbowkit
  - fhenix.js (or equivalent FHE library)
- [ ] Configure TypeScript (strict mode)
- [ ] Set up TailwindCSS with custom theme
- [ ] Create directory structure (components, hooks, lib, types)
- [ ] Initialize Git repository
- [ ] Create .env.example file

**Acceptance Criteria**:
- ✅ Project runs with `npm run dev`
- ✅ No TypeScript errors
- ✅ TailwindCSS working

---

#### **Task 1.2: UI Component Library Setup** (3 hours)
**Priority**: High  
**Assignee**: Dev 2 (or Dev 1)

**Subtasks**:
- [ ] Install shadcn/ui CLI
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Add essential components:
  - Button, Input, Card, Badge
  - Dialog, Dropdown, Tabs
  - Toast/Sonner for notifications
- [ ] Create custom theme (dark mode)
- [ ] Set up global styles
- [ ] Create layout components:
  - `Header.tsx`
  - `Footer.tsx`
  - `Layout.tsx`
- [ ] Add Google Fonts (Inter, JetBrains Mono)

**Acceptance Criteria**:
- ✅ All components render correctly
- ✅ Dark mode theme applied
- ✅ Layout structure in place

---

#### **Task 1.3: Environment Configuration** (1 hour)
**Priority**: High  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Create `.env.local` file
- [ ] Add environment variables:
  ```env
  NEXT_PUBLIC_CHAIN_ID=412346
  NEXT_PUBLIC_RPC_URL=https://api.helium.fhenix.zone
  NEXT_PUBLIC_TWAMM_HOOK_ADDRESS=0x...
  NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
  ```
- [ ] Create `lib/constants.ts` for app constants
- [ ] Create `lib/contracts/addresses.ts`
- [ ] Set up network configuration

**Acceptance Criteria**:
- ✅ Environment variables load correctly
- ✅ Constants accessible throughout app

---

### **Day 2: Wallet & FHE Integration**

#### **Task 2.1: Wallet Connection** (3 hours)
**Priority**: Critical  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Configure wagmi with Fhenix testnet
  ```typescript
  import { createConfig, http } from 'wagmi';
  import { fhenixHelium } from 'wagmi/chains';
  ```
- [ ] Set up RainbowKit provider
- [ ] Create `WalletConnect.tsx` component
- [ ] Add wallet connection button to header
- [ ] Implement account display (address, balance)
- [ ] Add disconnect functionality
- [ ] Handle network switching
- [ ] Add wallet connection state management

**Acceptance Criteria**:
- ✅ User can connect MetaMask
- ✅ Address displays correctly
- ✅ Network switches to Fhenix testnet
- ✅ Disconnect works properly

---

#### **Task 2.2: FHE Library Integration** (4 hours)
**Priority**: Critical  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Install Fhenix.js library
- [ ] Create `lib/fhe/` directory
- [ ] Implement FHE initialization:
  ```typescript
  // lib/fhe/init.ts
  export async function initFHE() {
    // Initialize FHE instance
  }
  ```
- [ ] Create encryption utilities:
  ```typescript
  // lib/fhe/encrypt.ts
  export async function encryptUint256(value: bigint): Promise<euint256>
  export async function encryptUint64(value: bigint): Promise<euint64>
  export async function encryptBool(value: boolean): Promise<ebool>
  ```
- [ ] Create decryption utilities:
  ```typescript
  // lib/fhe/decrypt.ts
  export async function decrypt(encrypted: any): Promise<any>
  ```
- [ ] Create `useFHE` hook
- [ ] Add FHE type definitions in `types/fhe.ts`
- [ ] Test encryption/decryption in browser console

**Acceptance Criteria**:
- ✅ FHE library initializes successfully
- ✅ Can encrypt uint256, uint64, and bool
- ✅ Can decrypt encrypted values
- ✅ `useFHE` hook works in components

---

#### **Task 2.3: Contract Setup** (2 hours)
**Priority**: High  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Create `lib/contracts/abi.ts`
- [ ] Add ConfidentialTWAMM ABI
- [ ] Add PoolManager ABI (if needed)
- [ ] Create contract address constants
- [ ] Set up contract read/write hooks:
  ```typescript
  // hooks/useConfidentialTWAMM.ts
  export function useConfidentialTWAMM() {
    // Contract interaction logic
  }
  ```
- [ ] Test contract connection (read-only)
- [ ] Verify contract is accessible on testnet

**Acceptance Criteria**:
- ✅ ABIs imported correctly
- ✅ Can read contract state
- ✅ Contract hooks ready for use

---

#### **Task 2.4: Basic Pages Setup** (1 hour)
**Priority**: Medium  
**Assignee**: Dev 2 (or Dev 1)

**Subtasks**:
- [ ] Create landing page (`app/page.tsx`)
- [ ] Create orders page (`app/orders/page.tsx`)
- [ ] Create order details page (`app/orders/[id]/page.tsx`)
- [ ] Add navigation between pages
- [ ] Create simple hero section
- [ ] Add placeholder content

**Acceptance Criteria**:
- ✅ All pages accessible via routing
- ✅ Navigation works
- ✅ Basic layout applied

---

## Sprint 1 Deliverables

### **Code Deliverables**
- ✅ Next.js project with TypeScript
- ✅ Wallet connection functionality
- ✅ FHE library integrated and tested
- ✅ UI component library (shadcn/ui)
- ✅ Contract ABIs and hooks
- ✅ Basic page structure

### **Documentation**
- ✅ README with setup instructions
- ✅ Environment variables documented
- ✅ FHE usage guide

---

## Testing Checklist

### **Functional Testing**
- [ ] Project builds without errors
- [ ] Wallet connects to MetaMask
- [ ] Network switches to Fhenix testnet
- [ ] FHE encryption works in browser
- [ ] FHE decryption works correctly
- [ ] Contract read operations work
- [ ] All pages load without errors

### **UI Testing**
- [ ] Dark mode theme applied
- [ ] Components render correctly
- [ ] Responsive on mobile and desktop
- [ ] No console errors or warnings

---

## Definition of Done

Sprint 1 is complete when:
- ✅ All tasks marked as done
- ✅ Testing checklist completed
- ✅ Code committed to repository
- ✅ Demo to stakeholder (if applicable)
- ✅ Ready to start Sprint 2

---

## Risks & Mitigation

### **Risk 1: FHE Library Complexity**
**Probability**: High  
**Impact**: High  
**Mitigation**: 
- Allocate extra time (4 hours)
- Have fallback plan (mock encryption)
- Research documentation beforehand

### **Risk 2: Wallet Connection Issues**
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Test with multiple wallets
- Use well-documented libraries (RainbowKit)
- Have testnet funds ready

### **Risk 3: Time Overrun**
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Prioritize critical tasks
- Move UI polish to Sprint 3
- Pair programming for blockers

---

## Sprint Review Questions

1. Can we connect a wallet successfully?
2. Does FHE encryption work in the browser?
3. Can we read from the deployed contract?
4. Is the project structure scalable?
5. Are we on track for Sprint 2?

---

## Next Sprint Preview

**Sprint 2** will focus on:
- Order submission form
- Encryption flow integration
- Order dashboard
- Contract write operations

---

## Notes & Learnings

*(To be filled during/after sprint)*

### **What Went Well**
- 

### **What Could Be Improved**
- 

### **Action Items**
- 

### **Blockers Encountered**
- 
