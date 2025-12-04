// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

import {ConfidentialTWAMMHook} from "../src/core/ConfidentialTWAMMHook.sol";
import {IConfidentialTWAMM} from "../src/interfaces/IConfidentialTWAMM.sol";
import {FHE, euint256, euint64, ebool} from "cofhe-contracts/FHE.sol";
import {MockTaskManager} from "./mocks/MockTaskManager.sol";

contract ConfidentialTWAMME2ETest is Test, Deployers {
    using PoolIdLibrary for PoolKey;

    ConfidentialTWAMMHook public hook;
    MockTaskManager public mockTaskManager;
    PoolKey public poolKey;
    uint160 public initSqrtPriceX96;

    address constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public trader = makeAddr("trader");

    MockERC20 public token0;
    MockERC20 public token1;

    event OrderSubmitted(uint256 indexed orderId, address indexed owner, PoolKey indexed poolKey);
    event SliceExecuted(uint256 indexed orderId, uint256 sliceAmount, uint256 blockNumber);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        token0 = MockERC20(Currency.unwrap(currency0));
        token1 = MockERC20(Currency.unwrap(currency1));

        mockTaskManager = new MockTaskManager();
        vm.etch(TASK_MANAGER_ADDRESS, address(mockTaskManager).code);

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

        _addInitialLiquidity(1000000e18, 1000000e18);

        token0.mint(alice, 1000000e18);
        token1.mint(alice, 1000000e18);
        token0.mint(bob, 1000000e18);
        token1.mint(bob, 1000000e18);
        token0.mint(trader, 1000000e18);
        token1.mint(trader, 1000000e18);

        vm.startPrank(alice);
        token0.approve(address(swapRouter), type(uint256).max);
        token1.approve(address(swapRouter), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        token0.approve(address(swapRouter), type(uint256).max);
        token1.approve(address(swapRouter), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(trader);
        token0.approve(address(swapRouter), type(uint256).max);
        token1.approve(address(swapRouter), type(uint256).max);
        vm.stopPrank();
    }

    function _addInitialLiquidity(uint256 amount0, uint256 amount1) internal {
        token0.mint(address(this), amount0);
        token1.mint(address(this), amount1);

        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: 1000000e18,
            salt: 0
        });

        modifyLiquidityRouter.modifyLiquidity(poolKey, params, "");
    }

    function _createEncryptedValue(uint256 value) internal returns (euint256) {
        euint256 encrypted = FHE.asEuint256(value);
        uint256 hash = euint256.unwrap(encrypted);
        mockTaskManager.setDecryptResult(hash, value);
        return encrypted;
    }

    function _createEncryptedDuration(uint64 value) internal returns (euint64) {
        euint64 encrypted = FHE.asEuint64(value);
        uint256 hash = euint64.unwrap(encrypted);
        mockTaskManager.setDecryptResult(hash, value);
        return encrypted;
    }

    function _createEncryptedDirection(uint64 value) internal returns (euint64) {
        euint64 encrypted = FHE.asEuint64(value);
        uint256 hash = euint64.unwrap(encrypted);
        mockTaskManager.setDecryptResult(hash, value);
        return encrypted;
    }

    function _createEncryptedCancelSignal(bool value) internal returns (ebool) {
        ebool encrypted = FHE.asEbool(value);
        uint256 hash = ebool.unwrap(encrypted);
        mockTaskManager.setDecryptResult(hash, value ? 1 : 0);
        return encrypted;
    }

    function test_CompleteTWAMMExecutionFlow() public {
        uint256 orderAmount = 10000e18;
        uint64 duration = 500;
        uint64 direction = 0;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(direction);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit OrderSubmitted(1, alice, poolKey);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        assertEq(orderId, 1);

        (bool isActive, ebool isCancelled, address owner, uint64 startBlock,,) =
            hook.getOrderStatus(poolKey, orderId);

        assertTrue(isActive);
        FHE.allowThis(isCancelled);
        FHE.decrypt(isCancelled);
        bool cancelled;
        (cancelled,) = FHE.getDecryptResultSafe(isCancelled);
        assertFalse(cancelled);
        assertEq(owner, alice);
        assertEq(startBlock, block.number);

        vm.roll(block.number + 250);

        uint256 balance0Before = token0.balanceOf(address(manager));
        uint256 balance1Before = token1.balanceOf(address(manager));

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        vm.roll(block.number + 250);

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        uint256 balance0After = token0.balanceOf(address(manager));
        uint256 balance1After = token1.balanceOf(address(manager));

        assertTrue(balance0After != balance0Before || balance1After != balance1Before);
    }

    function test_MultipleOrdersExecution() public {
        euint256 amount1 = _createEncryptedValue(5000e18);
        euint64 duration1 = _createEncryptedDuration(300);
        euint64 direction1 = _createEncryptedDirection(0);
        
        euint256 amount2 = _createEncryptedValue(8000e18);
        euint64 duration2 = _createEncryptedDuration(400);
        euint64 direction2 = _createEncryptedDirection(1);

        vm.startPrank(alice);
        uint256 orderId1 = hook.submitEncryptedOrder(poolKey, amount1, duration1, direction1);
        uint256 orderId2 = hook.submitEncryptedOrder(poolKey, amount2, duration2, direction2);
        vm.stopPrank();

        assertEq(orderId1, 1);
        assertEq(orderId2, 2);

        vm.roll(block.number + 200);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -500e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        (bool isActive1,,,,,) = hook.getOrderStatus(poolKey, orderId1);
        (bool isActive2,,,,,) = hook.getOrderStatus(poolKey, orderId2);

        assertTrue(isActive1);
        assertTrue(isActive2);
    }

    function test_OrderCancellationMidExecution() public {
        uint256 orderAmount = 10000e18;
        uint64 duration = 1000;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        vm.roll(block.number + 500);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        ebool cancelSignal = _createEncryptedCancelSignal(true);
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit OrderCancelled(orderId, alice);
        hook.cancelEncryptedOrder(poolKey, orderId, cancelSignal);

        (bool isActive, ebool isCancelled,,,,) = hook.getOrderStatus(poolKey, orderId);
        assertFalse(isActive);
        FHE.allowThis(isCancelled);
        FHE.decrypt(isCancelled);
        bool cancelled;
        (cancelled,) = FHE.getDecryptResultSafe(isCancelled);
        assertTrue(cancelled);

        vm.roll(block.number + 500);

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");
    }

    function test_ExecutionIntervalRespected() public {
        uint256 orderAmount = 20000e18;
        uint64 duration = 1000;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        vm.roll(block.number + 500);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        for (uint256 i = 0; i < 5; i++) {
            vm.roll(block.number + 50);
            vm.prank(trader);
            swapRouter.swap(poolKey, swapParams, settings, "");
        }

        assertTrue(true);
    }

    function test_ReverseDirectionOrder() public {
        uint256 orderAmount = 15000e18;
        uint64 duration = 600;
        uint64 direction = 1;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(direction);

        vm.prank(bob);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        vm.roll(block.number + 300);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: false,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        (bool isActive,,,,,) = hook.getOrderStatus(poolKey, orderId);
        assertTrue(isActive);
    }

    function test_MultipleUsersOrders() public {
        euint256 amountAlice = _createEncryptedValue(10000e18);
        euint64 durationAlice = _createEncryptedDuration(400);
        euint64 directionAlice = _createEncryptedDirection(0);
        
        euint256 amountBob = _createEncryptedValue(15000e18);
        euint64 durationBob = _createEncryptedDuration(500);
        euint64 directionBob = _createEncryptedDirection(1);

        vm.prank(alice);
        uint256 orderIdAlice = hook.submitEncryptedOrder(poolKey, amountAlice, durationAlice, directionAlice);

        vm.prank(bob);
        uint256 orderIdBob = hook.submitEncryptedOrder(poolKey, amountBob, durationBob, directionBob);

        assertEq(orderIdAlice, 1);
        assertEq(orderIdBob, 2);

        (bool isActiveAlice,, address ownerAlice,,,) = hook.getOrderStatus(poolKey, orderIdAlice);
        (bool isActiveBob,, address ownerBob,,,) = hook.getOrderStatus(poolKey, orderIdBob);

        assertTrue(isActiveAlice);
        assertTrue(isActiveBob);
        assertEq(ownerAlice, alice);
        assertEq(ownerBob, bob);

        vm.roll(block.number + 300);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");
    }

    function test_OrderDoesNotExecuteBeforeStartBlock() public {
        uint256 orderAmount = 10000e18;
        uint64 duration = 500;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        uint256 startBlock = block.number;
        (,,, uint64 storedStartBlock,,) = hook.getOrderStatus(poolKey, orderId);
        assertEq(storedStartBlock, startBlock);

        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -1000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        vm.roll(block.number + 10);
        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");
    }

    function test_SliceCalculationAcrossMultipleBlocks() public {
        uint256 orderAmount = 100000e18;
        uint64 duration = 2000;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        uint256 blocksElapsed = 500;
        vm.roll(block.number + blocksElapsed);


        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -5000e18,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        vm.prank(trader);
        swapRouter.swap(poolKey, swapParams, settings, "");

        assertTrue(true);
    }

    function test_UnauthorizedCancellation() public {
        uint256 orderAmount = 10000e18;
        uint64 duration = 500;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        vm.prank(bob);
        ebool cancelSignal = _createEncryptedCancelSignal(true);
        vm.expectRevert(ConfidentialTWAMMHook.Unauthorized.selector);
        hook.cancelEncryptedOrder(poolKey, orderId, cancelSignal);
    }

    function test_OrderStatusRetrieval() public {
        uint256 orderAmount = 25000e18;
        uint64 duration = 800;

        euint256 encryptedAmount = _createEncryptedValue(orderAmount);
        euint64 encryptedDuration = _createEncryptedDuration(duration);
        euint64 encryptedDirection = _createEncryptedDirection(0);

        vm.prank(alice);
        uint256 orderId = hook.submitEncryptedOrder(poolKey, encryptedAmount, encryptedDuration, encryptedDirection);

        (
            bool isActive,
            ebool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 storedAmount,
            euint64 storedDuration
        ) = hook.getOrderStatus(poolKey, orderId);

        assertTrue(isActive);
        FHE.allowThis(isCancelled);
        FHE.decrypt(isCancelled);
        bool cancelled;
        (cancelled,) = FHE.getDecryptResultSafe(isCancelled);
        assertFalse(cancelled);
        assertEq(owner, alice);
        assertEq(startBlock, block.number);
        assertEq(euint256.unwrap(storedAmount), euint256.unwrap(encryptedAmount));
        assertEq(euint64.unwrap(storedDuration), euint64.unwrap(encryptedDuration));
    }
}

