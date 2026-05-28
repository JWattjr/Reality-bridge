// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/TestUSDT.sol";
import "../src/FootballPredictionGame.sol";

contract BroadcasterFinder {
    address public immutable broadcaster;

    constructor() {
        broadcaster = msg.sender;
    }
}

contract Deploy is Script {
    struct NetworkConfig {
        string networkName;
        address usdtAddress;
        uint256 platformFeeBps;
    }

    function setUp() public {}

    function getDeploymentConfig()
        internal
        view
        returns (NetworkConfig memory config)
    {
        // OKX X Layer Testnet (Chain ID 1952)
        if (block.chainid == 1952) {
            config = NetworkConfig({
                networkName: "X Layer Testnet",
                usdtAddress: address(0), // Will deploy TestUSDT on testnet
                platformFeeBps: 0
            });
        }
        // Local Testnet (Anvil / Default)
        else {
            config = NetworkConfig({
                networkName: "Local Testnet",
                usdtAddress: address(0), // Will deploy TestUSDT
                platformFeeBps: 0
            });
        }
    }

    function run() external {
        NetworkConfig memory config = getDeploymentConfig();

        console2.log("=== ProofPlay X Cup Deployment ===");
        console2.log("Network:", config.networkName);
        console2.log("Chain ID:", block.chainid);

        // Start broadcasting to find the CLI account address
        vm.startBroadcast();
        BroadcasterFinder finder = new BroadcasterFinder();
        address deployer = finder.broadcaster();
        vm.stopBroadcast();

        // Restart broadcast with the correct resolved deployer address
        vm.startBroadcast(deployer);

        console2.log("Deployer / Owner:", deployer);

        address usdtAddr = config.usdtAddress;
        if (usdtAddr == address(0)) {
            console2.log("\nNo USDT address configured. Deploying TestUSDT...");
            TestUSDT testUsdt = new TestUSDT();
            usdtAddr = address(testUsdt);
            console2.log("TestUSDT deployed at:", usdtAddr);
        } else {
            console2.log("Using configured USDT at:", usdtAddr);
        }

        // 1. Deploy FootballPredictionGame
        console2.log("\nDeploying FootballPredictionGame...");
        FootballPredictionGame game = new FootballPredictionGame(usdtAddr, config.platformFeeBps);
        console2.log("FootballPredictionGame deployed at:", address(game));

        vm.stopBroadcast();

        logDeployment(
            usdtAddr,
            address(game),
            deployer,
            config
        );
    }

    function logDeployment(
        address usdtAddr,
        address gameAddr,
        address deployer,
        NetworkConfig memory config
    ) internal pure {
        console2.log("\n=== Deployment Summary ===");
        console2.log("Network:", config.networkName);
        console2.log("\n--- Contract Addresses ---");
        console2.log("USDT:", usdtAddr);
        console2.log("FootballPredictionGame:", gameAddr);
        console2.log("\n--- Configuration ---");
        console2.log("Admin (Contract Owner):", deployer);
        console2.log("Platform Fee (BPS):", config.platformFeeBps);
        console2.log("\n=== Deployment Complete ===");
    }
}
