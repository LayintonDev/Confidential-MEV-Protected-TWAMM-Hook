// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITaskManager, FunctionId, EncryptedInput} from "cofhe-contracts/ICofhe.sol";

contract MockTaskManager is ITaskManager {
    mapping(uint256 => uint256) private decryptResults;
    mapping(uint256 => bool) private valueExists;
    mapping(uint256 => mapping(address => bool)) private allowedAccounts;
    mapping(uint256 => bool) private globalAllowed;
    uint256 private taskCounter;

    function createTask(
        uint8,
        FunctionId funcId,
        uint256[] memory encryptedInputs,
        uint256[] memory extraInputs
    ) external override returns (uint256) {
        taskCounter++;
        uint256 resultHash = uint256(keccak256(abi.encodePacked(taskCounter, block.timestamp, msg.sender)));
        
        if (funcId == FunctionId.trivialEncrypt && extraInputs.length >= 1) {
            uint256 plaintextValue = extraInputs[0];
            decryptResults[resultHash] = plaintextValue;
            valueExists[resultHash] = true;
            return resultHash;
        }
        
        if (funcId == FunctionId.mul && encryptedInputs.length >= 2) {
            uint256 lhsHash = encryptedInputs[0];
            uint256 rhsHash = encryptedInputs[1];
            
            if (!valueExists[lhsHash] || !valueExists[rhsHash]) {
                return resultHash;
            }
            
            uint256 lhs = decryptResults[lhsHash];
            uint256 rhs = decryptResults[rhsHash];
            uint256 result = lhs * rhs;
            
            decryptResults[resultHash] = result;
            valueExists[resultHash] = true;
            return resultHash;
        }
        
        if (funcId == FunctionId.div && encryptedInputs.length >= 2) {
            uint256 lhsHash = encryptedInputs[0];
            uint256 rhsHash = encryptedInputs[1];
            
            if (!valueExists[lhsHash] || !valueExists[rhsHash]) {
                return resultHash;
            }
            
            uint256 lhs = decryptResults[lhsHash];
            uint256 rhs = decryptResults[rhsHash];
            
            if (rhs == 0) {
                return resultHash;
            }
            
            uint256 result = lhs / rhs;
            decryptResults[resultHash] = result;
            valueExists[resultHash] = true;
            return resultHash;
        }
        
        if (funcId == FunctionId.cast && encryptedInputs.length >= 1) {
            uint256 inputHash = encryptedInputs[0];
            if (valueExists[inputHash]) {
                uint256 input = decryptResults[inputHash];
                decryptResults[resultHash] = input;
                valueExists[resultHash] = true;
            }
            return resultHash;
        }
        
        return resultHash;
    }

    function createDecryptTask(uint256 ctHash, address) external override {
        if (!valueExists[ctHash]) {
            valueExists[ctHash] = true;
            decryptResults[ctHash] = ctHash;
        }
    }

    function verifyInput(EncryptedInput memory input, address sender) external view override returns (uint256) {
        return uint256(keccak256(abi.encode(input, sender, block.timestamp)));
    }

    function allow(uint256 ctHash, address account) external override {
        allowedAccounts[ctHash][account] = true;
    }

    function isAllowed(uint256 ctHash, address account) external view override returns (bool) {
        return globalAllowed[ctHash] || allowedAccounts[ctHash][account];
    }

    function allowGlobal(uint256 ctHash) external override {
        globalAllowed[ctHash] = true;
    }

    function allowTransient(uint256 ctHash, address account) external override {
        allowedAccounts[ctHash][account] = true;
    }

    function getDecryptResultSafe(uint256 ctHash) external view override returns (uint256 result, bool decrypted) {
        if (valueExists[ctHash]) {
            result = decryptResults[ctHash];
            decrypted = true;
        } else {
            result = 0;
            decrypted = false;
        }
        return (result, decrypted);
    }

    function getDecryptResult(uint256 ctHash) external view override returns (uint256) {
        if (valueExists[ctHash]) {
            return decryptResults[ctHash];
        }
        return ctHash;
    }

    function setDecryptResult(uint256 ctHash, uint256 value) external {
        decryptResults[ctHash] = value;
        valueExists[ctHash] = true;
    }
}
