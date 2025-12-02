// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {euint256, euint64} from "cofhe-contracts/FHE.sol";

interface IConfidentialTWAMM {
    struct EncryptedOrder {
        euint256 amount;
        euint64 duration;
        uint64 direction;
        uint64 startBlock;
        address owner;
        bool isActive;
        bool isCancelled;
    }

    event OrderSubmitted(uint256 indexed orderId, address indexed owner, PoolKey indexed poolKey);
    event OrderExecuted(uint256 indexed orderId, uint256 amountExecuted);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event SliceExecuted(uint256 indexed orderId, uint256 sliceAmount, uint256 blockNumber);

    function submitEncryptedOrder(
        PoolKey calldata poolKey,
        euint256 amount,
        euint64 duration,
        uint64 direction
    ) external returns (uint256 orderId);

    function executeTWAMMSlice(PoolKey calldata poolKey, uint256 orderId) external;

    function cancelEncryptedOrder(PoolKey calldata poolKey, uint256 orderId) external;

    function getOrderStatus(PoolKey calldata poolKey, uint256 orderId)
        external
        view
        returns (
            bool isActive,
            bool isCancelled,
            address owner,
            uint64 startBlock,
            euint256 amount,
            euint64 duration
        );
}

