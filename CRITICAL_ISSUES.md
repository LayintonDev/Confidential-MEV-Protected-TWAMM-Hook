# Critical Architecture Issue

## ⚠️ **SWAP EXECUTION FROM HOOK CALLBACK**

### Problem
Currently, `_executeSlice()` calls `poolManager.swap()` directly. This function is called from `_checkAndExecuteSlices()`, which is triggered by `_afterSwap()` hook callback.

**Issue**: Uniswap v4 PoolManager is **locked** during hook callbacks. The `swap()` function has `onlyWhenUnlocked` modifier, so calling swap from within `afterSwap` will revert.

### Current Code Flow
```
External swap → PoolManager.swap() → Hook.afterSwap() 
→ _checkAndExecuteSlices() → _executeSlice() 
→ poolManager.swap() ❌ (REVERTS - Manager is locked)
```

### Impact
- **Tests pass** because swap execution may not be triggered in test scenarios
- **Production will fail** when trying to execute TWAMM slices from hook callback
- **No automatic execution** of TWAMM slices from hook

### Solution Options

#### Option 1: External Execution (Recommended for MVP)
- Remove automatic execution from `afterSwap` hook
- Users/keepers must call `executeTWAMMSlice()` externally
- Hook callback only checks if execution is needed, doesn't execute

#### Option 2: Queue-Based Execution
- Queue slice execution requests in hook callback
- Execute queued swaps externally via keeper/relayer
- More complex but enables automatic execution

#### Option 3: Different Hook Pattern
- Use a different hook point or pattern
- May require architectural redesign

### Recommendation for MVP
Use **Option 1**: Document that slices must be executed externally via `executeTWAMMSlice()`. This is simpler and works reliably.

