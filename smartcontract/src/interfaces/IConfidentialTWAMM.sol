// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {euint256, euint64, ebool} from "cofhe-contracts/FHE.sol";

interface IConfidentialTWAMM {
    struct EncryptedOrder {
        euint256 amount;
        euint64 duration;
        euint64 direction;
        uint64 startBlock;
        uint64 lastExecutionBlock;
        euint256 executedAmount;
        address owner;
        bool isActive;
        ebool isCancelled;
    }

    event OrderSubmitted(uint256 indexed orderId, address indexed owner, PoolKey indexed poolKey);
    event OrderExecuted(uint256 indexed orderId, uint256 amountExecuted);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event SliceExecuted(uint256 indexed orderId, uint256 sliceAmount, uint256 blockNumber);
    event TokensWithdrawn(uint256 indexed orderId, address indexed owner, address indexed currency, uint256 amount);

    function submitEncryptedOrder(
        PoolKey calldata poolKey,
        euint256 amount,
        euint64 duration,
        euint64 direction
    ) external returns (uint256 orderId);

    function executeTWAMMSlice(PoolKey calldata poolKey, uint256 orderId) external;

    function cancelEncryptedOrder(PoolKey calldata poolKey, uint256 orderId, ebool cancelSignal) external;

    function withdrawTokens(PoolKey calldata poolKey, uint256 orderId) external;

    function getOrderStatus(PoolKey calldata poolKey, uint256 orderId)
        external
        view
        returns (
            bool isActive,
            ebool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 amount,
            euint64 duration
        );
}

