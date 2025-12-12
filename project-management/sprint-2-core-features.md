# Sprint 2: Core Features - Order Management
**Duration**: Days 3-4  
**Phase**: Phase 2 - Core Features  
**Goal**: Implement order submission and dashboard functionality

---

## Sprint Objectives

1. Build order submission form with encryption
2. Implement order dashboard with real-time updates
3. Create order details page with decryption
4. Integrate contract write operations
5. Add event listening for order updates

---

## Tasks Breakdown

### **Day 3: Order Submission**

#### **Task 3.1: Order Submission Form** (4 hours)
**Priority**: Critical  
**Assignee**: Dev 1 + Dev 2

**Subtasks**:
- [ ] Create `OrderForm.tsx` component
- [ ] Add form fields:
  - Pool selector (dropdown)
  - Direction toggle (Buy/Sell)
  - Amount input (with token balance)
  - Duration input (blocks or hours)
- [ ] Implement form validation:
  ```typescript
  const schema = z.object({
    amount: z.string().min(1).refine(val => parseFloat(val) > 0),
    duration: z.string().min(1).refine(val => parseInt(val) > 0),
    direction: z.enum(['buy', 'sell'])
  });
  ```
- [ ] Add balance checking
- [ ] Create duration converter (blocks ↔ hours)
- [ ] Add form state management (React Hook Form)
- [ ] Style form with shadcn/ui components
- [ ] Add loading states

**Acceptance Criteria**:
- ✅ Form validates input correctly
- ✅ Shows user token balance
- ✅ Converts time units properly
- ✅ Displays validation errors

---

#### **Task 3.2: Encryption Flow Integration** (3 hours)
**Priority**: Critical  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Create `encryptOrderParams` utility:
  ```typescript
  export async function encryptOrderParams(params: OrderFormData) {
    const amount = await encryptUint256(parseUnits(params.amount, 18));
    const duration = await encryptUint64(BigInt(params.duration));
    const direction = await encryptUint64(params.direction === 'buy' ? 0n : 1n);
    return { amount, duration, direction };
  }
  ```
- [ ] Add encryption status indicator
- [ ] Implement encryption progress UI
- [ ] Add error handling for encryption failures
- [ ] Create encryption confirmation modal
- [ ] Add "What is FHE?" tooltip/info

**Acceptance Criteria**:
- ✅ Parameters encrypt successfully
- ✅ User sees encryption progress
- ✅ Errors handled gracefully
- ✅ Encryption explained to user

---

#### **Task 3.3: Contract Write Integration** (3 hours)
**Priority**: Critical  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Implement `submitEncryptedOrder` in hook:
  ```typescript
  const { writeContract, isPending, isSuccess } = useWriteContract();
  
  const submitOrder = async (params: OrderParams) => {
    const encrypted = await encryptOrderParams(params);
    return writeContract({
      address: TWAMM_ADDRESS,
      abi: TWAMM_ABI,
      functionName: 'submitEncryptedOrder',
      args: [params.poolKey, encrypted.amount, encrypted.duration, encrypted.direction]
    });
  };
  ```
- [ ] Add transaction confirmation modal
- [ ] Implement transaction status tracking
- [ ] Add success/error notifications (toast)
- [ ] Handle transaction rejection
- [ ] Add gas estimation
- [ ] Create transaction receipt display

**Acceptance Criteria**:
- ✅ Order submits to contract successfully
- ✅ Transaction hash displayed
- ✅ Success notification shown
- ✅ Errors handled with clear messages

---

### **Day 4: Order Dashboard & Details**

#### **Task 4.1: Order Dashboard** (4 hours)
**Priority**: Critical  
**Assignee**: Dev 2 (or Dev 1)

**Subtasks**:
- [ ] Create `OrderList.tsx` component
- [ ] Create `OrderCard.tsx` component
- [ ] Implement order fetching:
  ```typescript
  const { data: orders } = useUserOrders(address);
  ```
- [ ] Add order status badges (Active, Completed, Cancelled)
- [ ] Create progress bars for execution
- [ ] Add filter dropdown (All, Active, Completed, Cancelled)
- [ ] Add sort options (Date, Amount, Status)
- [ ] Implement search by order ID
- [ ] Add empty state UI
- [ ] Add loading skeletons

**Acceptance Criteria**:
- ✅ Orders display in grid/list view
- ✅ Filters work correctly
- ✅ Progress bars show execution status
- ✅ Empty state shows when no orders

---

#### **Task 4.2: Event Listening & Real-time Updates** (3 hours)
**Priority**: High  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Create `useOrderEvents` hook:
  ```typescript
  useWatchContractEvent({
    address: TWAMM_ADDRESS,
    abi: TWAMM_ABI,
    eventName: 'OrderSubmitted',
    onLogs(logs) {
      // Update orders state
    }
  });
  ```
- [ ] Listen for `OrderSubmitted` events
- [ ] Listen for `SliceExecuted` events
- [ ] Listen for `OrderExecuted` events
- [ ] Listen for `OrderCancelled` events
- [ ] Update UI in real-time when events fire
- [ ] Add event notification system
- [ ] Implement optimistic updates

**Acceptance Criteria**:
- ✅ New orders appear immediately
- ✅ Execution progress updates in real-time
- ✅ Completed orders update status
- ✅ User receives notifications

---

#### **Task 4.3: Order Details Page** (4 hours)
**Priority**: High  
**Assignee**: Dev 2 (or Dev 1)

**Subtasks**:
- [ ] Create `OrderDetails.tsx` component
- [ ] Fetch order status from contract:
  ```typescript
  const { data: orderStatus } = useOrderStatus(poolKey, orderId);
  ```
- [ ] Display order metadata:
  - Order ID
  - Owner address
  - Start block/time
  - Status
- [ ] Show encrypted parameters
- [ ] Implement decryption for owner:
  ```typescript
  const decryptedAmount = await decrypt(orderStatus.amount);
  ```
- [ ] Add decrypt button (owner only)
- [ ] Create execution timeline/history
- [ ] Show slice execution events
- [ ] Display token balances for withdrawal
- [ ] Add action buttons (Cancel, Withdraw)
- [ ] Link to block explorer

**Acceptance Criteria**:
- ✅ Order details display correctly
- ✅ Owner can decrypt their parameters
- ✅ Execution history shows all slices
- ✅ Action buttons work (navigate/trigger)

---

#### **Task 4.4: State Management** (2 hours)
**Priority**: Medium  
**Assignee**: Dev 1

**Subtasks**:
- [ ] Set up Zustand store:
  ```typescript
  export const useAppStore = create<AppState>((set) => ({
    userOrders: [],
    addOrder: (order) => set((state) => ({
      userOrders: [...state.userOrders, order]
    })),
    updateOrder: (orderId, updates) => { /* ... */ }
  }));
  ```
- [ ] Create order state management
- [ ] Add pool selection state
- [ ] Implement UI state (modals, loading)
- [ ] Add persistence (localStorage for UI preferences)
- [ ] Create selectors for filtered/sorted orders

**Acceptance Criteria**:
- ✅ State persists across page navigation
- ✅ Orders update correctly
- ✅ UI preferences saved

---

## Sprint 2 Deliverables

### **Code Deliverables**
- ✅ Order submission form with encryption
- ✅ Order dashboard with filtering/sorting
- ✅ Order details page with decryption
- ✅ Contract write operations working
- ✅ Real-time event listening
- ✅ State management implemented

### **UI Deliverables**
- ✅ Polished order form
- ✅ Responsive dashboard
- ✅ Detailed order view
- ✅ Loading and error states

---

## Testing Checklist

### **Functional Testing**
- [ ] Order submission E2E works
- [ ] Encryption completes successfully
- [ ] Transaction submits to contract
- [ ] Order appears in dashboard
- [ ] Filters and sorting work
- [ ] Order details page loads
- [ ] Decryption works for owner
- [ ] Events update UI in real-time

### **Edge Cases**
- [ ] Insufficient balance handled
- [ ] Transaction rejection handled
- [ ] Encryption failure handled
- [ ] Invalid input validation
- [ ] Network errors handled
- [ ] Empty states display correctly

### **UI/UX Testing**
- [ ] Forms are intuitive
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Responsive on mobile
- [ ] Animations smooth

---

## Definition of Done

Sprint 2 is complete when:
- ✅ All tasks marked as done
- ✅ Testing checklist completed
- ✅ Can submit order E2E successfully
- ✅ Orders display in dashboard
- ✅ Order details show decrypted data
- ✅ Code committed and reviewed
- ✅ Ready to start Sprint 3

---

## Risks & Mitigation

### **Risk 1: Encryption Performance**
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Show clear loading indicators
- Add progress feedback
- Optimize encryption calls
- Consider Web Workers for heavy operations

### **Risk 2: Event Listening Reliability**
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Add polling fallback
- Implement retry logic
- Cache events locally
- Test with slow networks

### **Risk 3: Complex State Management**
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Keep state simple initially
- Use React Query for server state
- Document state flow
- Add debugging tools

---

## Sprint Review Questions

1. Can users submit orders successfully?
2. Does encryption work reliably?
3. Do orders appear in the dashboard?
4. Can owners decrypt their data?
5. Are real-time updates working?
6. Is the UX intuitive?

---

## Next Sprint Preview

**Sprint 3** will focus on:
- Withdrawal functionality
- Order cancellation
- Advanced features (keeper integration)
- Error handling improvements

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

### **Performance Metrics**
- Average encryption time: ___ ms
- Order submission success rate: ___%
- Page load time: ___ ms
