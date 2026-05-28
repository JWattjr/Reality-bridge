// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TestUSDT.sol";
import "../src/FootballPredictionGame.sol";

contract FootballPredictionGameTest is Test {
    FootballPredictionGame public game;
    TestUSDT public usdt;

    address public owner = address(0x999);
    address public alice = address(0x111);
    address public bob = address(0x222);

    uint256 public constant INITIAL_BALANCE = 1000 * 1e6; // 1000 USDT (6 decimals)

    function setUp() public {
        vm.startPrank(owner);
        usdt = new TestUSDT();
        game = new FootballPredictionGame(address(usdt), 500); // 5% fee (500 bps)

        // Mint and deal USDT to test users
        usdt.mint(alice, INITIAL_BALANCE);
        usdt.mint(bob, INITIAL_BALANCE);
        vm.stopPrank();

        // Approve game contract from users
        vm.prank(alice);
        usdt.approve(address(game), type(uint256).max);

        vm.prank(bob);
        usdt.approve(address(game), type(uint256).max);
    }

    function test_DeploymentConfig() public view {
        assertEq(game.owner(), owner);
        assertEq(address(game.usdt()), address(usdt));
        assertEq(game.platformFeeBps(), 500);
    }

    function test_CreateGameEvent() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent(
            "USA",
            "Paraguay",
            "ProofPlay X Cup",
            block.timestamp + 2 hours,
            block.timestamp + 1 hours,
            "ipfs://rewards"
        );
        vm.stopPrank();

        assertEq(gameId, 1);
        (
            uint256 id,
            string memory teamA,
            string memory teamB,
            string memory competition,
            uint256 matchStartTime,
            uint256 marketCloseTime,
            FootballPredictionGame.GameStatus status,
            string memory rewardConfigURI
        ) = game.gameEvents(1);

        assertEq(id, 1);
        assertEq(teamA, "USA");
        assertEq(teamB, "Paraguay");
        assertEq(competition, "ProofPlay X Cup");
        assertEq(matchStartTime, block.timestamp + 2 hours);
        assertEq(marketCloseTime, block.timestamp + 1 hours);
        assertEq(uint256(status), uint256(FootballPredictionGame.GameStatus.OPEN));
        assertEq(rewardConfigURI, "ipfs://rewards");
    }

    function test_CreateGameEvent_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert("Only admin");
        game.createGameEvent(
            "USA",
            "Paraguay",
            "ProofPlay X Cup",
            block.timestamp + 2 hours,
            block.timestamp + 1 hours,
            "ipfs://rewards"
        );
    }

    function test_CreateMarket() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent(
            "USA",
            "Paraguay",
            "ProofPlay X Cup",
            block.timestamp + 2 hours,
            block.timestamp + 1 hours,
            "ipfs://rewards"
        );

        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";

        uint256 marketId = game.createMarket(
            gameId,
            "USA Wins",
            "Match Result",
            FootballPredictionGame.MarketType.YES_NO,
            options,
            5 * 1e6, // 5 USDT min stake
            block.timestamp + 1 hours
        );
        vm.stopPrank();

        assertEq(marketId, 1);
        (
            uint256 id,
            uint256 gId,
            string memory title,
            string memory category,
            FootballPredictionGame.MarketType mType,
            uint256 minStake,
            uint256 closeTime,
            FootballPredictionGame.MarketStatus status,
            ,
            ,

        ) = game.markets(marketId);

        assertEq(id, 1);
        assertEq(gId, gameId);
        assertEq(title, "USA Wins");
        assertEq(category, "Match Result");
        assertTrue(mType == FootballPredictionGame.MarketType.YES_NO);
        assertEq(minStake, 5 * 1e6);
        assertEq(closeTime, block.timestamp + 1 hours);
        assertTrue(status == FootballPredictionGame.MarketStatus.OPEN);
    }

    function test_PlacePrediction() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent("USA", "Paraguay", "Cup", block.timestamp + 2 hours, block.timestamp + 1 hours, "");
        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";
        uint256 marketId = game.createMarket(gameId, "USA Wins", "Result", FootballPredictionGame.MarketType.YES_NO, options, 5 * 1e6, block.timestamp + 1 hours);
        vm.stopPrank();

        // Alice places prediction
        vm.prank(alice);
        uint256 predId = game.placePrediction(marketId, 0, 10 * 1e6); // 10 USDT on "Yes"

        assertEq(predId, 1);
        assertEq(usdt.balanceOf(alice), INITIAL_BALANCE - 10 * 1e6);
        assertEq(usdt.balanceOf(address(game)), 10 * 1e6);

        (
            uint256 id,
            address user,
            uint256 gId,
            uint256 mId,
            uint256 selectedOption,
            uint256 amountUSDT,
            ,
            bool claimed,
            bool resolved,
            bool isCorrect,
            uint8 points
        ) = game.predictions(predId);

        assertEq(id, 1);
        assertEq(user, alice);
        assertEq(gId, gameId);
        assertEq(mId, marketId);
        assertEq(selectedOption, 0);
        assertEq(amountUSDT, 10 * 1e6);
        assertFalse(claimed);
        assertFalse(resolved);
        assertFalse(isCorrect);
        assertEq(points, 0);
    }

    function test_ResolveMarket_And_ClaimWinnings() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent("USA", "Paraguay", "Cup", block.timestamp + 2 hours, block.timestamp + 1 hours, "");
        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";
        uint256 marketId = game.createMarket(gameId, "USA Wins", "Result", FootballPredictionGame.MarketType.YES_NO, options, 5 * 1e6, block.timestamp + 1 hours);
        vm.stopPrank();

        // Alice stakes 100 USDT on Yes (Option 0)
        vm.prank(alice);
        uint256 alicePredId = game.placePrediction(marketId, 0, 100 * 1e6);

        // Bob stakes 200 USDT on No (Option 1)
        vm.prank(bob);
        game.placePrediction(marketId, 1, 200 * 1e6);

        // Fast forward time and close/resolve
        vm.startPrank(owner);
        game.resolveMarket(marketId, 0); // "Yes" wins!
        vm.stopPrank();

        // Verify Points
        assertEq(game.gamePoints(gameId, alice), 1);
        assertEq(game.gamePoints(gameId, bob), 0);

        // Verify Alice's prediction details
        (,,,,,,,bool claimed, bool resolved, bool isCorrect, uint8 points) = game.predictions(alicePredId);
        assertTrue(resolved);
        assertTrue(isCorrect);
        assertEq(points, 1);
        assertFalse(claimed);

        // Alice claims winnings
        // Total Pool = 300 USDT.
        // Winning Pool = 100 USDT.
        // Gross Payout = 300 USDT.
        // Net Profit = 200 USDT.
        // Fee = 5% of 200 = 10 USDT.
        // Net Payout = 290 USDT.
        uint256 preAliceBalance = usdt.balanceOf(alice);
        vm.prank(alice);
        game.claimWinnings(alicePredId);

        uint256 postAliceBalance = usdt.balanceOf(alice);
        assertEq(postAliceBalance - preAliceBalance, 290 * 1e6);
    }

    function test_WinningsClaimNoLossWhenOneSided() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent("USA", "Paraguay", "Cup", block.timestamp + 2 hours, block.timestamp + 1 hours, "");
        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";
        uint256 marketId = game.createMarket(gameId, "USA Wins", "Result", FootballPredictionGame.MarketType.YES_NO, options, 5 * 1e6, block.timestamp + 1 hours);
        vm.stopPrank();

        // Alice stakes 100 USDT on Yes (Option 0)
        // Nobody else stakes on the market
        vm.prank(alice);
        uint256 alicePredId = game.placePrediction(marketId, 0, 100 * 1e6);

        // Close and resolve
        vm.startPrank(owner);
        game.resolveMarket(marketId, 0);
        vm.stopPrank();

        // Alice claims winnings
        // Total Pool = 100 USDT.
        // Winning Pool = 100 USDT.
        // Gross Payout = 100 USDT.
        // Net Profit = 0 USDT.
        // Fee = 0 USDT.
        // Net Payout = 100 USDT (Principal preservation, no fee taken).
        uint256 preAliceBalance = usdt.balanceOf(alice);
        vm.prank(alice);
        game.claimWinnings(alicePredId);

        uint256 postAliceBalance = usdt.balanceOf(alice);
        assertEq(postAliceBalance - preAliceBalance, 100 * 1e6);
    }

    function test_RefundAndClaimRefund() public {
        vm.startPrank(owner);
        uint256 gameId = game.createGameEvent("USA", "Paraguay", "Cup", block.timestamp + 2 hours, block.timestamp + 1 hours, "");
        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";
        uint256 marketId = game.createMarket(gameId, "USA Wins", "Result", FootballPredictionGame.MarketType.YES_NO, options, 5 * 1e6, block.timestamp + 1 hours);
        vm.stopPrank();

        vm.prank(alice);
        uint256 alicePredId = game.placePrediction(marketId, 0, 50 * 1e6);

        // Refund market
        vm.startPrank(owner);
        game.refundMarket(marketId);
        vm.stopPrank();

        // Alice claims refund
        uint256 preBalance = usdt.balanceOf(alice);
        vm.prank(alice);
        game.claimRefund(alicePredId);

        uint256 postBalance = usdt.balanceOf(alice);
        assertEq(postBalance - preBalance, 50 * 1e6);
    }
}
