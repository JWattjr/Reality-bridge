// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TestUSDT.sol";
import "../src/ProofPlayBaseMarket.sol";

contract MockGenLayerBridgeSender is IGenLayerBridgeSender {
    uint256 public fee = 0.01 ether;
    address public lastTarget;
    bytes public lastData;
    bytes public lastOptions;
    uint256 public lastValue;
    bytes32 public constant MESSAGE_ID = keccak256("proofplay-message");

    function quoteSendToGenLayer(
        address,
        bytes calldata,
        bytes calldata
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (fee, 0);
    }

    function sendToGenLayer(
        address targetContract,
        bytes calldata data,
        bytes calldata options
    ) external payable returns (bytes32 messageId) {
        require(msg.value == fee, "Wrong fee");
        lastTarget = targetContract;
        lastData = data;
        lastOptions = options;
        lastValue = msg.value;
        return MESSAGE_ID;
    }
}

contract ProofPlayBaseMarketTest is Test {
    TestUSDT private usdc;
    ProofPlayBaseMarket private market;
    MockGenLayerBridgeSender private bridge;

    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    address private constant RECEIVER = address(0xB12D6E);
    address private constant RESOLVER = address(0x6E51);
    uint32 private constant GENLAYER_SOURCE_CHAIN = 61998;
    bytes32 private constant FIXTURE_COMMITMENT = keccak256("Arsenal-Chelsea-2026-08-23");

    function setUp() public {
        usdc = new TestUSDT();
        bridge = new MockGenLayerBridgeSender();
        market = new ProofPlayBaseMarket(address(usdc), 2 days);
        market.configureBridge(address(bridge), RECEIVER, RESOLVER, GENLAYER_SOURCE_CHAIN);

        usdc.mint(ALICE, 1_000e6);
        usdc.mint(BOB, 1_000e6);
        vm.prank(ALICE);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(BOB);
        usdc.approve(address(market), type(uint256).max);
    }

    function createMarket() private returns (uint256) {
        return market.createMarket(
            "Arsenal",
            "Chelsea",
            "Premier League",
            uint64(block.timestamp + 2 hours),
            uint64(block.timestamp + 1 hours),
            1e6,
            FIXTURE_COMMITMENT
        );
    }

    function fundAndRequest(uint256 marketId) private {
        vm.prank(ALICE);
        market.placePrediction(marketId, ProofPlayBaseMarket.Outcome.Home, 10e6);
        vm.prank(BOB);
        market.placePrediction(marketId, ProofPlayBaseMarket.Outcome.Away, 30e6);
        vm.warp(block.timestamp + 2 hours);
        market.requestResolution{value: 0.01 ether}(marketId, hex"");
    }

    function testEscrowsUsdcAndPaysWinnerProRata() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);

        vm.prank(RECEIVER);
        market.processBridgeMessage(
            GENLAYER_SOURCE_CHAIN,
            RESOLVER,
            abi.encode(marketId, uint256(3), uint256(1), uint256(2))
        );

        uint256 beforeBalance = usdc.balanceOf(BOB);
        vm.prank(BOB);
        uint256 payout = market.claim(marketId);

        assertEq(payout, 40e6);
        assertEq(usdc.balanceOf(BOB), beforeBalance + 40e6);
    }

    function testRequestBindsMarketIdAndFixtureToConfiguredResolver() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);

        assertEq(bridge.lastTarget(), RESOLVER);
        (uint256 sentMarketId, bytes32 sentFixtureCommitment) = abi.decode(
            bridge.lastData(),
            (uint256, bytes32)
        );
        assertEq(sentMarketId, marketId);
        assertEq(sentFixtureCommitment, FIXTURE_COMMITMENT);
        assertEq(bridge.lastValue(), 0.01 ether);
    }

    function testRejectsForgedAndAcceptsIdenticalDuplicateCallbacks() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);
        bytes memory result = abi.encode(marketId, uint256(1), uint256(2), uint256(0));

        vm.expectRevert("Only bridge receiver");
        market.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);

        vm.prank(RECEIVER);
        market.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);

        vm.prank(RECEIVER);
        market.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);
    }

    function testRetryKeepsOriginalRefundDeadline() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);
        uint256 originalRequestedAt = block.timestamp;

        vm.warp(block.timestamp + 1 days);
        market.retryResolution{value: 0.01 ether}(marketId, hex"");

        (, , , , , uint64 resolutionRequestedAt, , , , , , , , , , uint32 attempts) = market.markets(marketId);
        assertEq(resolutionRequestedAt, originalRequestedAt);
        assertEq(attempts, 2);

        vm.warp(originalRequestedAt + 2 days);
        market.openTimeoutRefunds(marketId);
    }

    function testPermissionlessRefundAfterBridgeTimeout() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);
        vm.warp(block.timestamp + 2 days);
        market.openTimeoutRefunds(marketId);

        uint256 beforeBalance = usdc.balanceOf(ALICE);
        vm.prank(ALICE);
        market.claimRefund(marketId);
        assertEq(usdc.balanceOf(ALICE), beforeBalance + 10e6);
    }

    function testNoWinningPoolOpensRefunds() public {
        uint256 marketId = createMarket();
        fundAndRequest(marketId);

        vm.prank(RECEIVER);
        market.processBridgeMessage(
            GENLAYER_SOURCE_CHAIN,
            RESOLVER,
            abi.encode(marketId, uint256(2), uint256(1), uint256(1))
        );

        (, , , , , , , ProofPlayBaseMarket.MarketStatus status, , , , , , , , ) = market.markets(marketId);
        assertEq(uint256(status), uint256(ProofPlayBaseMarket.MarketStatus.Refunding));
    }
}
