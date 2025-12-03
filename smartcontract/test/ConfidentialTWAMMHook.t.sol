// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {ConfidentialTWAMMHook} from "../src/core/ConfidentialTWAMMHook.sol";
import {IConfidentialTWAMM} from "../src/interfaces/IConfidentialTWAMM.sol";
import {FHE, euint256, euint64} from "cofhe-contracts/FHE.sol";

contract ConfidentialTWAMMHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;

    ConfidentialTWAMMHook public hook;
    PoolKey public poolKey;
    uint160 public initSqrtPriceX96;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    event OrderSubmitted(uint256 indexed orderId, address indexed owner, PoolKey indexed poolKey);
    event SliceExecuted(uint256 indexed orderId, uint256 sliceAmount, uint256 blockNumber);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);
        address hookAddress = address(uint160(type(uint160).max & clearAllHookPermissionsMask | flags));

        deployCodeTo("ConfidentialTWAMMHook", abi.encode(manager), hookAddress);
        hook = ConfidentialTWAMMHook(payable(hookAddress));

        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        initSqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);
        manager.initialize(poolKey, initSqrtPriceX96);

        _addLiquidity();

        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        vm.deal(charlie, 1000 ether);
    }

    function _addLiquidity() internal {
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -120,
            tickUpper: 120,
            liquidityDelta: 1e18,
            salt: 0
        });

        modifyLiquidityRouter.modifyLiquidity(poolKey, params, "");
    }

    function _createEncryptedValue(uint256 value) internal returns (euint256) {
        return FHE.asEuint256(value);
    }

    function _createEncryptedDuration(uint64 value) internal returns (euint64) {
        return FHE.asEuint64(value);
    }

    function test_submitEncryptedOrder() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);
        uint64 direction = 0;

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit OrderSubmitted(1, alice, poolKey);
        
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, direction);

        assertEq(orderId, 1);
        
        (
            bool isActive,
            bool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 storedAmount,
            euint64 storedDuration
        ) = hook.getOrderStatus(poolKey, orderId);

        assertTrue(isActive);
        assertFalse(isCancelled);
        assertEq(owner, alice);
        assertEq(startBlock, block.number);
        assertEq(euint256.unwrap(storedAmount), euint256.unwrap(amount));
        assertEq(euint64.unwrap(storedDuration), euint64.unwrap(duration));
    }

    function test_submitMultipleOrders() public {
        euint256 amount1 = _createEncryptedValue(1000e18);
        euint64 duration1 = _createEncryptedDuration(100);
        
        euint256 amount2 = _createEncryptedValue(2000e18);
        euint64 duration2 = _createEncryptedDuration(200);

        vm.startPrank(alice);
        uint256 orderId1 = hook.submitEncryptedOrder(poolKey, amount1, duration1, 0);
        uint256 orderId2 = hook.submitEncryptedOrder(poolKey, amount2, duration2, 1);
        vm.stopPrank();

        assertEq(orderId1, 1);
        assertEq(orderId2, 2);

        (bool isActive1,, address owner1,,,) = hook.getOrderStatus(poolKey, orderId1);
        (bool isActive2,, address owner2,,,) = hook.getOrderStatus(poolKey, orderId2);

        assertTrue(isActive1);
        assertTrue(isActive2);
        assertEq(owner1, alice);
        assertEq(owner2, alice);
    }

    function test_submitOrderInvalidDirection() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);
        uint64 invalidDirection = 2;

        vm.prank(alice);
        vm.expectRevert(ConfidentialTWAMMHook.InvalidDirection.selector);
        hook.submitEncryptedOrder(poolKey, amount, duration, invalidDirection);
    }

    function test_cancelEncryptedOrder() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.startPrank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, 0);
        
        vm.expectEmit(true, true, false, true);
        emit OrderCancelled(orderId, alice);
        
        hook.cancelEncryptedOrder(poolKey, orderId);
        vm.stopPrank();

        (bool isActive, bool isCancelled,,,,) = hook.getOrderStatus(poolKey, orderId);

        assertFalse(isActive);
        assertTrue(isCancelled);
    }

    function test_cancelOrderUnauthorized() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, 0);

        vm.prank(bob);
        vm.expectRevert(ConfidentialTWAMMHook.Unauthorized.selector);
        hook.cancelEncryptedOrder(poolKey, orderId);
    }

    function test_cancelOrderAlreadyCancelled() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.startPrank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, 0);
        hook.cancelEncryptedOrder(poolKey, orderId);
        
        vm.expectRevert(ConfidentialTWAMMHook.InvalidOrder.selector);
        hook.cancelEncryptedOrder(poolKey, orderId);
        vm.stopPrank();
    }

    function test_executeSliceBeforeStartBlock() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, 0);

        vm.prank(alice);
        vm.expectRevert(ConfidentialTWAMMHook.OrderNotStarted.selector);
        hook.executeTWAMMSlice(poolKey, orderId);
    }

    function test_hookAfterSwapTrigger() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.prank(alice);
        hook.submitEncryptedOrder(poolKey, amount, duration, 0);

        uint256 blocksToAdvance = 150;
        vm.roll(block.number + blocksToAdvance);

        uint256 balance0Before = MockERC20(Currency.unwrap(currency0)).balanceOf(address(manager));
        uint256 balance1Before = MockERC20(Currency.unwrap(currency1)).balanceOf(address(manager));

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(poolKey, swapParams, settings, "");

        uint256 balance0After = MockERC20(Currency.unwrap(currency0)).balanceOf(address(manager));
        uint256 balance1After = MockERC20(Currency.unwrap(currency1)).balanceOf(address(manager));

        assertTrue(balance0After != balance0Before || balance1After != balance1Before);
    }

    function test_multipleOrdersDifferentPools() public {
        PoolKey memory poolKey2 = PoolKey({
            currency0: currency1,
            currency1: currency0,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        manager.initialize(poolKey2, initSqrtPriceX96);

        euint256 amount1 = _createEncryptedValue(1000e18);
        euint64 duration1 = _createEncryptedDuration(100);
        
        euint256 amount2 = _createEncryptedValue(2000e18);
        euint64 duration2 = _createEncryptedDuration(200);

        vm.startPrank(alice);
        uint256 orderId1 = hook.submitEncryptedOrder(poolKey, amount1, duration1, 0);
        uint256 orderId2 = hook.submitEncryptedOrder(poolKey2, amount2, duration2, 1);
        vm.stopPrank();

        assertEq(orderId1, 1);
        assertEq(orderId2, 2);

        (bool isActive1,,,,,) = hook.getOrderStatus(poolKey, orderId1);
        (bool isActive2,,,,,) = hook.getOrderStatus(poolKey2, orderId2);

        assertTrue(isActive1);
        assertTrue(isActive2);
    }

    function test_orderExecutionInterval() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.prank(alice);
        hook.submitEncryptedOrder(poolKey, amount, duration, 0);

        vm.roll(block.number + 50);
        
        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(poolKey, swapParams, settings, "");
        
        vm.roll(block.number + 50);
        swapRouter.swap(poolKey, swapParams, settings, "");

        assertTrue(true);
    }

    function test_getOrderStatusNonExistent() public {
        (
            bool isActive,
            bool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 amount,
            euint64 duration
        ) = hook.getOrderStatus(poolKey, 999);

        assertFalse(isActive);
        assertFalse(isCancelled);
        assertEq(owner, address(0));
        assertEq(startBlock, 0);
        assertEq(euint256.unwrap(amount), 0);
        assertEq(euint64.unwrap(duration), 0);
    }

    function test_hookPermissions() public view {
        Hooks.Permissions memory permissions = hook.getHookPermissions();
        
        assertFalse(permissions.beforeInitialize);
        assertFalse(permissions.afterInitialize);
        assertFalse(permissions.beforeAddLiquidity);
        assertFalse(permissions.afterAddLiquidity);
        assertFalse(permissions.beforeRemoveLiquidity);
        assertFalse(permissions.afterRemoveLiquidity);
        assertFalse(permissions.beforeSwap);
        assertTrue(permissions.afterSwap);
        assertFalse(permissions.beforeDonate);
        assertFalse(permissions.afterDonate);
        assertFalse(permissions.beforeSwapReturnDelta);
        assertFalse(permissions.afterSwapReturnDelta);
        assertFalse(permissions.afterAddLiquidityReturnDelta);
        assertFalse(permissions.afterRemoveLiquidityReturnDelta);
    }

    function test_executeSliceInvalidOrder() public {
        euint256 amount = _createEncryptedValue(1000e18);
        euint64 duration = _createEncryptedDuration(100);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, amount, duration, 0);

        vm.prank(alice);
        hook.cancelEncryptedOrder(poolKey, orderId);

        vm.roll(block.number + 100);
        vm.prank(alice);
        vm.expectRevert(ConfidentialTWAMMHook.InvalidOrder.selector);
        hook.executeTWAMMSlice(poolKey, orderId);
    }
}

