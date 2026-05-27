// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title ProofPlay Football Prediction Game
/// @notice Minimal USDT-backed football prediction markets with 1-point scoring.
contract FootballPredictionGame {
    enum GameStatus {
        OPEN,
        CLOSED,
        LIVE,
        RESOLVED,
        CANCELLED
    }

    enum MarketStatus {
        OPEN,
        CLOSED,
        RESOLVED,
        CANCELLED,
        REFUNDED
    }

    enum MarketType {
        YES_NO,
        MULTI_CHOICE
    }

    struct GameEvent {
        uint256 id;
        string teamA;
        string teamB;
        string competition;
        uint256 matchStartTime;
        uint256 marketCloseTime;
        GameStatus status;
        string rewardConfigURI;
    }

    struct Market {
        uint256 id;
        uint256 gameId;
        string title;
        string category;
        MarketType marketType;
        string[] options;
        uint256 minStake;
        uint256 closeTime;
        MarketStatus status;
        uint256 winningOption;
        uint256 totalPool;
        uint256 winningPool;
    }

    struct Prediction {
        uint256 id;
        address user;
        uint256 gameId;
        uint256 marketId;
        uint256 selectedOption;
        uint256 amountUSDT;
        uint256 timestamp;
        bool claimed;
        bool resolved;
        bool isCorrect;
        uint8 pointsEarned;
    }

    address public owner;
    IERC20 public immutable usdt;
    uint256 public platformFeeBps;
    uint256 public nextGameId = 1;
    uint256 public nextMarketId = 1;
    uint256 public nextPredictionId = 1;

    mapping(uint256 => GameEvent) public gameEvents;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(uint256 => uint256)) public optionPools;
    mapping(uint256 => uint256[]) public gameMarkets;
    mapping(uint256 => uint256[]) public marketPredictions;
    mapping(uint256 => mapping(address => uint256)) public gamePoints;

    event GameEventCreated(uint256 indexed gameId, string teamA, string teamB);
    event MarketCreated(uint256 indexed marketId, uint256 indexed gameId, MarketType marketType);
    event PredictionPlaced(uint256 indexed predictionId, uint256 indexed marketId, address indexed user, uint256 amountUSDT);
    event MarketClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, uint256 winningOption);
    event WinningsClaimed(uint256 indexed predictionId, address indexed user, uint256 amountUSDT);
    event MarketRefunded(uint256 indexed marketId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only admin");
        _;
    }

    constructor(address usdtToken, uint256 feeBps) {
        require(usdtToken != address(0), "USDT required");
        require(feeBps <= 1000, "Fee too high");
        owner = msg.sender;
        usdt = IERC20(usdtToken);
        platformFeeBps = feeBps;
    }

    function createGameEvent(
        string calldata teamA,
        string calldata teamB,
        string calldata competition,
        uint256 matchStartTime,
        uint256 marketCloseTime,
        string calldata rewardConfigURI
    ) external onlyOwner returns (uint256 gameId) {
        require(bytes(teamA).length > 0 && bytes(teamB).length > 0, "Teams required");
        require(marketCloseTime <= matchStartTime, "Close before start");

        gameId = nextGameId++;
        gameEvents[gameId] = GameEvent({
            id: gameId,
            teamA: teamA,
            teamB: teamB,
            competition: competition,
            matchStartTime: matchStartTime,
            marketCloseTime: marketCloseTime,
            status: GameStatus.OPEN,
            rewardConfigURI: rewardConfigURI
        });

        emit GameEventCreated(gameId, teamA, teamB);
    }

    function createMarket(
        uint256 gameId,
        string calldata title,
        string calldata category,
        MarketType marketType,
        string[] calldata options,
        uint256 minStake,
        uint256 closeTime
    ) external onlyOwner returns (uint256 marketId) {
        require(gameEvents[gameId].id != 0, "Game not found");
        require(options.length >= 2, "Options required");
        require(minStake > 0, "Min stake required");
        require(closeTime <= gameEvents[gameId].marketCloseTime, "Close too late");

        marketId = nextMarketId++;
        Market storage newMarket = markets[marketId];
        newMarket.id = marketId;
        newMarket.gameId = gameId;
        newMarket.title = title;
        newMarket.category = category;
        newMarket.marketType = marketType;
        newMarket.minStake = minStake;
        newMarket.closeTime = closeTime;
        newMarket.status = MarketStatus.OPEN;

        for (uint256 i = 0; i < options.length; i++) {
            newMarket.options.push(options[i]);
        }

        gameMarkets[gameId].push(marketId);
        emit MarketCreated(marketId, gameId, marketType);
    }

    function placePrediction(uint256 marketId, uint256 selectedOption, uint256 amountUSDT) external returns (uint256 predictionId) {
        Market storage targetMarket = markets[marketId];
        require(targetMarket.id != 0, "Market not found");
        require(targetMarket.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < targetMarket.closeTime, "Market closed");
        require(selectedOption < targetMarket.options.length, "Bad option");
        require(amountUSDT >= targetMarket.minStake, "Stake too low");
        require(usdt.transferFrom(msg.sender, address(this), amountUSDT), "USDT transfer failed");

        predictionId = nextPredictionId++;
        predictions[predictionId] = Prediction({
            id: predictionId,
            user: msg.sender,
            gameId: targetMarket.gameId,
            marketId: marketId,
            selectedOption: selectedOption,
            amountUSDT: amountUSDT,
            timestamp: block.timestamp,
            claimed: false,
            resolved: false,
            isCorrect: false,
            pointsEarned: 0
        });

        targetMarket.totalPool += amountUSDT;
        optionPools[marketId][selectedOption] += amountUSDT;
        marketPredictions[marketId].push(predictionId);
        emit PredictionPlaced(predictionId, marketId, msg.sender, amountUSDT);
    }

    function closeMarket(uint256 marketId) external onlyOwner {
        require(markets[marketId].status == MarketStatus.OPEN, "Not open");
        markets[marketId].status = MarketStatus.CLOSED;
        emit MarketClosed(marketId);
    }

    function resolveMarket(uint256 marketId, uint256 winningOption) external onlyOwner {
        Market storage targetMarket = markets[marketId];
        require(targetMarket.status == MarketStatus.OPEN || targetMarket.status == MarketStatus.CLOSED, "Cannot resolve");
        require(winningOption < targetMarket.options.length, "Bad option");

        targetMarket.status = MarketStatus.RESOLVED;
        targetMarket.winningOption = winningOption;
        targetMarket.winningPool = optionPools[marketId][winningOption];

        uint256[] storage ids = marketPredictions[marketId];
        for (uint256 i = 0; i < ids.length; i++) {
            Prediction storage pick = predictions[ids[i]];
            pick.resolved = true;
            if (pick.selectedOption == winningOption) {
                pick.isCorrect = true;
                pick.pointsEarned = 1;
                gamePoints[pick.gameId][pick.user] += 1;
            }
        }

        emit MarketResolved(marketId, winningOption);
    }

    function claimWinnings(uint256 predictionId) external {
        Prediction storage pick = predictions[predictionId];
        require(pick.user == msg.sender, "Not your pick");
        require(pick.resolved && pick.isCorrect, "No winnings");
        require(!pick.claimed, "Claimed");

        Market storage targetMarket = markets[pick.marketId];
        require(targetMarket.status == MarketStatus.RESOLVED, "Market unresolved");
        require(targetMarket.winningPool > 0, "No winning pool");

        uint256 fee = (targetMarket.totalPool * platformFeeBps) / 10000;
        uint256 distributable = targetMarket.totalPool - fee;
        uint256 payout = (distributable * pick.amountUSDT) / targetMarket.winningPool;
        pick.claimed = true;

        require(usdt.transfer(msg.sender, payout), "USDT payout failed");
        emit WinningsClaimed(predictionId, msg.sender, payout);
    }

    function refundMarket(uint256 marketId) external onlyOwner {
        Market storage targetMarket = markets[marketId];
        require(targetMarket.status == MarketStatus.OPEN || targetMarket.status == MarketStatus.CLOSED || targetMarket.status == MarketStatus.CANCELLED, "Cannot refund");
        targetMarket.status = MarketStatus.REFUNDED;
        emit MarketRefunded(marketId);
    }

    function claimRefund(uint256 predictionId) external {
        Prediction storage pick = predictions[predictionId];
        require(pick.user == msg.sender, "Not your pick");
        require(!pick.claimed, "Already claimed");
        require(markets[pick.marketId].status == MarketStatus.REFUNDED, "Not refunded");
        pick.claimed = true;
        require(usdt.transfer(msg.sender, pick.amountUSDT), "USDT refund failed");
    }

    function marketOptionCount(uint256 marketId) external view returns (uint256) {
        return markets[marketId].options.length;
    }
}
