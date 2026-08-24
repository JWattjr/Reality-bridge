// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./MockUSDC.sol";
import "./MockGenLayerBridgeSender.sol";
import "../src/ProofPlayBaseDuel.sol";

contract ProofPlayBaseDuelTest is Test {
    MockUSDC private usdc;
    ProofPlayBaseDuel private duel;
    MockGenLayerBridgeSender private bridge;

    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    address private constant CAROL = address(0xCA701);
    address private constant RECEIVER = address(0xB12D6E);
    address private constant RESOLVER = address(0x6E51);
    uint32 private constant GENLAYER_SOURCE_CHAIN = 61998;
    bytes32 private fixtureCommitment;

    function setUp() public {
        usdc = new MockUSDC();
        bridge = new MockGenLayerBridgeSender();
        duel = new ProofPlayBaseDuel(address(usdc), 2 days);
        duel.configureBridge(
            address(bridge),
            RECEIVER,
            RESOLVER,
            GENLAYER_SOURCE_CHAIN
        );
        vm.deal(address(this), 1 ether);

        usdc.mint(ALICE, 1_000e6);
        usdc.mint(BOB, 1_000e6);
        usdc.mint(CAROL, 1_000e6);
        vm.prank(ALICE);
        usdc.approve(address(duel), type(uint256).max);
        vm.prank(BOB);
        usdc.approve(address(duel), type(uint256).max);
        vm.prank(CAROL);
        usdc.approve(address(duel), type(uint256).max);
    }

    function _probabilities() private pure returns (uint16[14] memory values) {
        values[0] = 3400;
        values[1] = 2500;
        values[2] = 4100;
        values[3] = 4400;
        values[4] = 4700;
        values[5] = 900;
        values[6] = 5900;
        values[7] = 4100;
        values[8] = 5600;
        values[9] = 4400;
        values[10] = 5300;
        values[11] = 4700;
        values[12] = 6100;
        values[13] = 3900;
    }

    function _creatorTicket() private pure returns (uint8[6] memory values) {
        // Home, home first, goals over, corners over, cards under, BTTS yes.
        values[0] = 1;
        values[1] = 1;
        values[2] = 1;
        values[3] = 1;
        values[4] = 2;
        values[5] = 1;
    }

    function _challengerTicket() private pure returns (uint8[6] memory values) {
        // Away, away first, goals under, corners under, cards over, BTTS no.
        values[0] = 3;
        values[1] = 2;
        values[2] = 2;
        values[3] = 2;
        values[4] = 1;
        values[5] = 2;
    }

    function _createDuel(address invitedOpponent) private returns (uint256 duelId) {
        uint16[14] memory probabilities = _probabilities();
        uint8[6] memory ticket = _creatorTicket();
        uint64 kickoff = uint64(block.timestamp + 2 hours);
        fixtureCommitment = duel.computeFixtureCommitment(
            "Arsenal",
            "Chelsea",
            "Premier League",
            kickoff,
            "2026-09-05",
            "https://www.bbc.com/sport/football/scores-fixtures/2026-09-05",
            25,
            95,
            35
        );
        vm.prank(ALICE);
        duelId = duel.createDuel(
            invitedOpponent,
            "Arsenal",
            "Chelsea",
            "Premier League",
            kickoff,
            "2026-09-05",
            "https://www.bbc.com/sport/football/scores-fixtures/2026-09-05",
            10e6,
            25,
            95,
            35,
            probabilities,
            ticket
        );
    }

    function _matchAndRequest(uint256 duelId) private {
        uint8[6] memory ticket = _challengerTicket();
        vm.prank(BOB);
        duel.acceptDuel(duelId, ticket);
        vm.warp(block.timestamp + 2 hours);
        duel.requestResolution{value: bridge.fee()}(duelId, hex"");
    }

    function _result(uint256 duelId) private view returns (bytes memory) {
        // 2-1, home scores first, 12 corners, 4 cards.
        return
            abi.encode(
                duelId,
                fixtureCommitment,
                uint256(2),
                uint256(1),
                uint256(1),
                uint256(12),
                uint256(4)
            );
    }

    function testTicketEscrowScoresIndependentPicksAndPaysDuelWinner() public {
        uint256 duelId = _createDuel(BOB);
        _matchAndRequest(duelId);

        vm.prank(RECEIVER);
        duel.processBridgeMessage(
            GENLAYER_SOURCE_CHAIN,
            RESOLVER,
            _result(duelId)
        );

        (
            uint8[6] memory creatorPicks,
            ,
            bool creatorSubmitted,
            bool creatorClaimed
        ) = duel.getTicket(duelId, ALICE);
        assertTrue(creatorSubmitted);
        assertFalse(creatorClaimed);
        assertEq(uint256(creatorPicks[0]), 1);

        uint256 beforeBalance = usdc.balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 payout = duel.claimPrize(duelId);

        assertEq(payout, 20e6);
        assertEq(usdc.balanceOf(ALICE), beforeBalance + 20e6);
    }

    function testRequestBindsDuelIdAndFixtureToConfiguredResolver() public {
        uint256 duelId = _createDuel(address(0));
        _matchAndRequest(duelId);

        assertEq(bridge.lastTarget(), RESOLVER);
        (uint256 sentDuelId, bytes32 sentFixtureCommitment) = abi.decode(
            bridge.lastData(),
            (uint256, bytes32)
        );
        assertEq(sentDuelId, duelId);
        assertEq(sentFixtureCommitment, fixtureCommitment);
        assertEq(bridge.lastValue(), bridge.fee());
    }

    function testDirectInvitationRejectsUninvitedPlayer() public {
        uint256 duelId = _createDuel(BOB);
        uint8[6] memory ticket = _challengerTicket();

        vm.prank(CAROL);
        vm.expectRevert("Not invited");
        duel.acceptDuel(duelId, ticket);
    }

    function testEntryClosesAtKickoff() public {
        uint256 duelId = _createDuel(address(0));
        uint8[6] memory ticket = _challengerTicket();
        vm.warp(block.timestamp + 2 hours);

        vm.prank(BOB);
        vm.expectRevert("Entry closed at kickoff");
        duel.acceptDuel(duelId, ticket);
    }

    function testIdenticalTicketsUseFinalDrawAndReturnEntries() public {
        uint256 duelId = _createDuel(BOB);
        uint8[6] memory sameTicket = _creatorTicket();
        vm.prank(BOB);
        duel.acceptDuel(duelId, sameTicket);
        vm.warp(block.timestamp + 2 hours);
        duel.requestResolution{value: bridge.fee()}(duelId, hex"");

        vm.prank(RECEIVER);
        duel.processBridgeMessage(
            GENLAYER_SOURCE_CHAIN,
            RESOLVER,
            _result(duelId)
        );

        uint256 beforeBalance = usdc.balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 refund = duel.claimDrawRefund(duelId);
        assertEq(refund, 10e6);
        assertEq(usdc.balanceOf(ALICE), beforeBalance + 10e6);
    }

    function testRejectsForgedAndAcceptsIdenticalDuplicateCallbacks() public {
        uint256 duelId = _createDuel(BOB);
        _matchAndRequest(duelId);
        bytes memory result = _result(duelId);

        vm.expectRevert("Only bridge receiver");
        duel.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);

        vm.prank(RECEIVER);
        duel.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);

        vm.prank(RECEIVER);
        duel.processBridgeMessage(GENLAYER_SOURCE_CHAIN, RESOLVER, result);
    }

    function testPermissionlessRefundAfterBridgeTimeout() public {
        uint256 duelId = _createDuel(BOB);
        _matchAndRequest(duelId);
        vm.warp(block.timestamp + 2 days);
        duel.openTimeoutRefunds(duelId);

        uint256 beforeBalance = usdc.balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 refund = duel.claimRefund(duelId);
        assertEq(refund, 10e6);
        assertEq(usdc.balanceOf(ALICE), beforeBalance + 10e6);
    }
}
