# Confidential TWAMM Hook

Uniswap v4 hook that implements a confidential TWAMM using Fhenix FHE. All order parameters (amount, duration, direction) are encrypted on-chain, keeping trades private until execution.

## What This Does

Users submit TWAMM orders with encrypted parameters. The hook splits orders into slices and executes them over time while keeping everything encrypted until the actual swap happens.

Key features:
- Encrypt trade direction, amount, and duration before submitting
- Executes slices incrementally (every 100 blocks by default)
- Cancel orders with encrypted signals
- Parameters stay private until execution
- MEV protection through confidentiality

## How It Works

The hook uses Uniswap v4's `AFTER_SWAP_FLAG` to execute TWAMM slices after swaps. All sensitive data is encrypted using Fhenix FHE, so amounts and directions stay private on-chain.

Main contracts:
- `ConfidentialTWAMMHook.sol` - Core hook logic
- `IConfidentialTWAMM.sol` - Interface with encrypted order struct

## Setup

### Prerequisites

- Foundry installed ([instructions](https://book.getfoundry.sh/getting-started/installation))

### Installation

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test
```

Dependencies (already installed via `forge install`):
- Uniswap v4 Core and Periphery
- Fhenix CoFHE contracts for FHE operations

Check `remappings.txt` for import paths.

## Contract Structure

```
src/
├── core/
│   └── ConfidentialTWAMMHook.sol    # Main hook implementation
├── interfaces/
│   └── IConfidentialTWAMM.sol        # Interface with EncryptedOrder struct
└── libraries/                         

test/
├── ConfidentialTWAMMHook.t.sol       # Unit tests
├── ConfidentialTWAMME2E.t.sol        # End-to-end tests
└── mocks/
    └── MockTaskManager.sol           # FHE TaskManager mock
```

## Usage

### Submitting an Order

Encrypt your parameters off-chain first (use Fhenix SDK or similar), then submit:

```solidity
// These are encrypted values from off-chain encryption
euint256 encryptedAmount = /* ... */;
euint64 encryptedDuration = /* ... */;
euint64 encryptedDirection = /* 0 or 1, encrypted */;

uint256 orderId = hook.submitEncryptedOrder(
    poolKey,
    encryptedAmount,
    encryptedDuration,
    encryptedDirection
);
```


### Executing Slices

Orders execute in slices. Anyone can call this to process the next slice:

```solidity
hook.executeTWAMMSlice(poolKey, orderId);
```

The hook calculates how much to execute based on blocks elapsed and executes the swap.

### Cancelling

Send an encrypted cancel signal:

```solidity
ebool cancelSignal = /* encrypted true */;
hook.cancelEncryptedOrder(poolKey, orderId, cancelSignal);
```

### Withdrawing Tokens

After execution, users withdraw received tokens:

```solidity
hook.withdrawTokens(poolKey, orderId);
```

### Checking Order Status

Returns encrypted values - you'll need to decrypt off-chain:

```solidity
(
    bool isActive,
    ebool isCancelled,
    address owner,
    uint64 startBlock,
    euint256 amount,      // encrypted
    euint64 duration      // encrypted
) = hook.getOrderStatus(poolKey, orderId);
```

## Configuration

Compiler settings are in `foundry.toml`. For verification, make sure these match:
- Solidity: `0.8.26`
- Optimizer: Disabled
- EVM: `cancun`

## Deployment

### Sepolia Testnet

The hook is deployed at:
- **Address**: `0xa0cf5f89930a05EfF211e620280ACEc7FF770040`
- **PoolManager**: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- **Verified**: Yes

### Deploy Script

Uses CREATE2 for deterministic addresses. The script mines a salt to match the hook flags:

```bash
forge script script/DeployConfidentialTWAMM.s.sol:DeployConfidentialTWAMM \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Environment Setup

Create `.env` in `smartcontract/`:

```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
DEPLOYER_ADDRESS=your_address
```

`.env` is already in `.gitignore`.

## Testing

### Run All Tests

```bash
forge test
```

### Run Specific Test File

```bash
forge test --match-path test/ConfidentialTWAMMHook.t.sol
forge test --match-path test/ConfidentialTWAMME2E.t.sol
```

### Verbose Output

```bash
forge test -vvv
```

### Gas Reports

```bash
forge test --gas-report
```

### Test Coverage

The test suite covers order submission, slice execution, cancellation, withdrawals, and various edge cases. Check the test files for details.

## Implementation Notes

Orders store encrypted fields (euint256, euint64, ebool). Slices run every 100 blocks (`EXECUTION_INTERVAL`). The hook uses FHE operations to compute slice amounts from encrypted values.

Slice calculation (on encrypted values):
```
sliceAmount = (totalAmount * blocksElapsed) / totalDuration
```

FHE permissions must be set correctly - see the contract code for `FHE.allow()` calls.



## Development

Standard Foundry commands:
- `forge fmt` - Format code
- `forge build` - Compile contracts
- `forge clean` - Clean build artifacts

## License

MIT

## References

- [Uniswap v4 Documentation](https://docs.uniswap.org/)
- [Fhenix FHE Documentation](https://docs.fhenix.io/)

