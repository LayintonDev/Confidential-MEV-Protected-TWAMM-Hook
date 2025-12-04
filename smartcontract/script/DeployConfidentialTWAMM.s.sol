// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ConfidentialTWAMMHook} from "../src/core/ConfidentialTWAMMHook.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

contract DeployConfidentialTWAMM is Script {
    // CREATE2 Deployer address (same on all chains)
    address constant CREATE2_DEPLOYER = address(0x4e59b44847b379578588920cA78FbF26c0B4956C);

    // Uniswap v4 PoolManager on Sepolia testnet (chain ID: 11155111)
    IPoolManager constant POOLMANAGER = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);

    function setUp() public {}

    function run() public {
        // Our hook only uses AFTER_SWAP_FLAG
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);

        bytes memory constructorArgs = abi.encode(POOLMANAGER);

        console2.log("Mining hook address with flags:", flags);
        
        // Mine a salt that will produce a hook address with the correct flags
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(ConfidentialTWAMMHook).creationCode,
            constructorArgs
        );

        console2.log("Hook address:", hookAddress);
        console2.log("Salt:", vm.toString(salt));

        // Deploy the hook using CREATE2
        vm.startBroadcast();
        
        ConfidentialTWAMMHook hook = new ConfidentialTWAMMHook{salt: salt}(POOLMANAGER);
        
        require(address(hook) == hookAddress, "DeployConfidentialTWAMM: hook address mismatch");
        
        console2.log("Deployed ConfidentialTWAMMHook at:", address(hook));
        console2.log("PoolManager:", address(POOLMANAGER));
        
        vm.stopBroadcast();
    }
}

