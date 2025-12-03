// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IConfidentialTWAMM} from "../interfaces/IConfidentialTWAMM.sol";
import {FHE, euint256, euint64} from "cofhe-contracts/FHE.sol";

contract ConfidentialTWAMMHook is BaseHook, IConfidentialTWAMM {
    using PoolIdLibrary for PoolKey;
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencyLibrary for Currency;

    uint256 private constant EXECUTION_INTERVAL = 100;
    uint256 private _nextOrderId = 1;

    mapping(PoolId => mapping(uint256 => EncryptedOrder)) private _orders;
    mapping(PoolId => uint256[]) private _activeOrderIds;
    mapping(PoolId => uint256) private _lastExecutionBlock;
    
    // Track user balances per order for withdrawal
    // orderId => currency => balance
    mapping(uint256 => mapping(Currency => uint256)) private _orderBalances;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        // Note: Cannot execute swaps from within hook callback (PoolManager is locked)
        // TWAMM slices must be executed externally via executeTWAMMSlice()
        return (BaseHook.afterSwap.selector, 0);
    }

    function submitEncryptedOrder(
        PoolKey calldata poolKey,
        euint256 amount,
        euint64 duration,
        euint64 direction
    ) external override returns (uint256 orderId) {
        PoolId poolId = poolKey.toId();
        orderId = _nextOrderId++;
        
        _orders[poolId][orderId] = EncryptedOrder({
            amount: amount,
            duration: duration,
            direction: direction,
            startBlock: uint64(block.number),
            lastExecutionBlock: uint64(block.number),
            executedAmount: euint256.wrap(0),
            owner: msg.sender,
            isActive: true,
            isCancelled: false
        });

        _activeOrderIds[poolId].push(orderId);
        
        FHE.allowThis(amount);
        FHE.allowThis(duration);
        FHE.allowThis(direction);
        FHE.allow(amount, msg.sender);
        FHE.allow(duration, msg.sender);
        FHE.allow(direction, msg.sender);

        emit OrderSubmitted(orderId, msg.sender, poolKey);
        return orderId;
    }

    function executeTWAMMSlice(PoolKey calldata poolKey, uint256 orderId) external override {
        PoolId poolId = poolKey.toId();
        EncryptedOrder storage order = _orders[poolId][orderId];
        
        if (!order.isActive || order.isCancelled) revert InvalidOrder();
        if (block.number <= order.startBlock) revert OrderNotStarted();

        _executeSlice(poolKey, orderId, order);
    }

    function cancelEncryptedOrder(PoolKey calldata poolKey, uint256 orderId) external override {
        PoolId poolId = poolKey.toId();
        EncryptedOrder storage order = _orders[poolId][orderId];
        
        if (msg.sender != order.owner) revert Unauthorized();
        if (!order.isActive || order.isCancelled) revert InvalidOrder();

        order.isCancelled = true;
        order.isActive = false;

        _removeOrderFromActiveList(poolId, orderId);
        emit OrderCancelled(orderId, msg.sender);
    }

    function withdrawTokens(PoolKey calldata poolKey, uint256 orderId) external override {
        PoolId poolId = poolKey.toId();
        EncryptedOrder storage order = _orders[poolId][orderId];
        
        if (msg.sender != order.owner) revert Unauthorized();

        Currency currency0 = poolKey.currency0;
        Currency currency1 = poolKey.currency1;

        uint256 balance0 = _orderBalances[orderId][currency0];
        uint256 balance1 = _orderBalances[orderId][currency1];

        if (balance0 > 0) {
            _orderBalances[orderId][currency0] = 0;
            currency0.transfer(msg.sender, balance0);
            emit TokensWithdrawn(orderId, msg.sender, Currency.unwrap(currency0), balance0);
        }

        if (balance1 > 0) {
            _orderBalances[orderId][currency1] = 0;
            currency1.transfer(msg.sender, balance1);
            emit TokensWithdrawn(orderId, msg.sender, Currency.unwrap(currency1), balance1);
        }
    }

    function getOrderStatus(PoolKey calldata poolKey, uint256 orderId)
        external
        view
        override
        returns (
            bool isActive,
            bool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 amount,
            euint64 duration
        )
    {
        PoolId poolId = poolKey.toId();
        EncryptedOrder storage order = _orders[poolId][orderId];
        
        return (
            order.isActive,
            order.isCancelled,
            order.owner,
            order.startBlock,
            order.amount,
            order.duration
        );
    }

    function _checkAndExecuteSlices(PoolKey calldata poolKey) internal {
        PoolId poolId = poolKey.toId();
        uint256 currentBlock = block.number;

        if (_lastExecutionBlock[poolId] + EXECUTION_INTERVAL > currentBlock) {
            return;
        }

        uint256[] storage activeOrders = _activeOrderIds[poolId];
        uint256 length = activeOrders.length;

        for (uint256 i = 0; i < length; ) {
            uint256 orderId = activeOrders[i];
            EncryptedOrder storage order = _orders[poolId][orderId];

            if (order.isActive && !order.isCancelled && currentBlock >= order.startBlock) {
                _executeSlice(poolKey, orderId, order);
            }

            unchecked {
                ++i;
            }
        }

        _lastExecutionBlock[poolId] = currentBlock;
    }

    function _executeSlice(PoolKey calldata poolKey, uint256 orderId, EncryptedOrder storage order) internal {
        // Use incremental calculation based on lastExecutionBlock
        uint256 blocksSinceLastExecution = block.number - order.lastExecutionBlock;
        
        if (blocksSinceLastExecution == 0) return;

        // Calculate incremental slice amount
        euint256 sliceAmount = _calculateSliceAmount(order.amount, order.duration, blocksSinceLastExecution);
        
        if (euint256.unwrap(sliceAmount) == 0) return;

        FHE.allowThis(sliceAmount);
        FHE.decrypt(sliceAmount);
        
        uint256 decryptedAmount;
        (decryptedAmount,) = FHE.getDecryptResultSafe(sliceAmount);
        
        if (decryptedAmount == 0) return;

        // Check if order is complete
        euint256 newExecutedAmount = FHE.add(order.executedAmount, sliceAmount);
        FHE.allowThis(newExecutedAmount);
        FHE.decrypt(newExecutedAmount);
        
        uint256 totalExecuted;
        (totalExecuted,) = FHE.getDecryptResultSafe(newExecutedAmount);
        
        uint256 totalAmount;
        (totalAmount,) = FHE.getDecryptResultSafe(order.amount);
        
        // If we would exceed total, adjust slice amount
        if (totalExecuted > totalAmount) {
            decryptedAmount = totalAmount - (totalExecuted - decryptedAmount);
            if (decryptedAmount == 0) {
                order.isActive = false;
                _removeOrderFromActiveList(poolKey.toId(), orderId);
                return;
            }
        }

        // Decrypt direction to determine swap direction
        FHE.allowThis(order.direction);
        FHE.decrypt(order.direction);
        
        uint64 decryptedDirection;
        (decryptedDirection,) = FHE.getDecryptResultSafe(order.direction);
        
        bool zeroForOne = decryptedDirection == 0;
        
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            // forge-lint: disable-next-line(unsafe-typecast)
            amountSpecified: -int256(decryptedAmount),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });

        BalanceDelta swapDelta = poolManager.swap(poolKey, params, "");
        
        // Handle swap delta to track balances for withdrawal
        _handleSwapDelta(poolKey, orderId, swapDelta, zeroForOne);

        // Update order state
        order.lastExecutionBlock = uint64(block.number);
        order.executedAmount = newExecutedAmount;
        
        // Check if order is complete
        if (totalExecuted >= totalAmount) {
            order.isActive = false;
            _removeOrderFromActiveList(poolKey.toId(), orderId);
            emit OrderExecuted(orderId, totalExecuted);
        }

        emit SliceExecuted(orderId, decryptedAmount, block.number);
    }

    function _handleSwapDelta(PoolKey calldata poolKey, uint256 orderId, BalanceDelta swapDelta, bool zeroForOne) internal {
        int128 delta0 = swapDelta.amount0();
        int128 delta1 = swapDelta.amount1();
        
        Currency currency0 = poolKey.currency0;
        Currency currency1 = poolKey.currency1;
        
        // For zeroForOne swap: we pay currency0 (negative delta0), receive currency1 (positive delta1)
        // For oneForZero swap: we pay currency1 (negative delta1), receive currency0 (positive delta0)
        
        if (zeroForOne) {
            // We receive currency1 (output token)
            if (delta1 > 0) {
                _orderBalances[orderId][currency1] += uint128(delta1);
            }
        } else {
            // We receive currency0 (output token)
            if (delta0 > 0) {
                _orderBalances[orderId][currency0] += uint128(delta0);
            }
        }
    }

    function _calculateSliceAmount(euint256 totalAmount, euint64 duration, uint256 blocksElapsed)
        internal
        returns (euint256)
    {
        if (euint256.unwrap(totalAmount) == 0 || euint64.unwrap(duration) == 0) {
            return euint256.wrap(0);
        }

        euint256 blocksElapsedEncrypted = FHE.asEuint256(blocksElapsed);
        euint64 durationAsEuint64 = duration;
        euint256 durationEncrypted = FHE.asEuint256(uint256(euint64.unwrap(durationAsEuint64)));
        
        euint256 numerator = FHE.mul(totalAmount, blocksElapsedEncrypted);
        euint256 result = FHE.div(numerator, durationEncrypted);
        
        FHE.allowThis(result);
        return result;
    }

    function _removeOrderFromActiveList(PoolId poolId, uint256 orderId) internal {
        uint256[] storage activeOrders = _activeOrderIds[poolId];
        uint256 length = activeOrders.length;

        for (uint256 i = 0; i < length; ) {
            if (activeOrders[i] == orderId) {
                activeOrders[i] = activeOrders[length - 1];
                activeOrders.pop();
                break;
            }
            unchecked {
                ++i;
            }
        }
    }

    error InvalidDirection();
    error InvalidOrder();
    error OrderNotStarted();
    error Unauthorized();
}
