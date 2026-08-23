// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Interface exposed by GenLayer's beta EVM bridge sender.
interface IGenLayerBridgeSender {
    function sendToGenLayer(
        address targetContract,
        bytes calldata data,
        bytes calldata options
    ) external payable returns (bytes32 messageId);

    function quoteSendToGenLayer(
        address targetContract,
        bytes calldata data,
        bytes calldata options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee);
}

/// @title ProofPlay Base Sepolia Market
/// @notice Test-USDC prediction escrow resolved by a GenLayer Studionet contract.
/// @dev Testnet prototype. The configured bridge is beta, so every requested
///      resolution has a permissionless timeout-refund path.
contract ProofPlayBaseMarket {
    enum Outcome {
        Unset,
        Home,
        Draw,
        Away
    }

    enum MarketStatus {
        Missing,
        Open,
        ResolutionRequested,
        Resolved,
        Refunding
    }

    struct Market {
        string homeTeam;
        string awayTeam;
        string competition;
        uint64 matchStart;
        uint64 closeTime;
        uint64 resolutionRequestedAt;
        uint96 minimumStake;
        MarketStatus status;
        Outcome winningOutcome;
        uint16 homeScore;
        uint16 awayScore;
        uint256 totalPool;
        uint256 winningPool;
        bytes32 requestMessageId;
        bytes32 fixtureCommitment;
        uint32 resolutionAttempts;
    }

    struct Position {
        Outcome outcome;
        uint256 amount;
        bool claimed;
    }

    IERC20 public immutable usdc;
    address public immutable owner;
    uint64 public immutable resolutionTimeout;

    IGenLayerBridgeSender public bridgeSender;
    address public bridgeReceiver;
    address public genLayerResolver;
    uint32 public genLayerSourceChainId;
    bool public bridgeConfigured;
    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(Outcome => uint256)) public outcomePools;
    mapping(uint256 => mapping(address => Position)) public positions;

    uint256 private _locked = 1;

    event BridgeConfigured(
        address indexed sender,
        address indexed receiver,
        address indexed resolver,
        uint32 sourceChainId
    );
    event MarketCreated(
        uint256 indexed marketId,
        string homeTeam,
        string awayTeam,
        uint64 matchStart,
        uint64 closeTime,
        uint96 minimumStake,
        bytes32 fixtureCommitment
    );
    event PredictionPlaced(
        uint256 indexed marketId,
        address indexed player,
        Outcome indexed outcome,
        uint256 amount
    );
    event ResolutionRequested(uint256 indexed marketId, bytes32 indexed messageId);
    event ResolutionRetried(
        uint256 indexed marketId,
        bytes32 indexed messageId,
        uint32 attempt
    );
    event MarketResolved(
        uint256 indexed marketId,
        Outcome indexed outcome,
        uint16 homeScore,
        uint16 awayScore
    );
    event RefundsOpened(uint256 indexed marketId);
    event Claimed(uint256 indexed marketId, address indexed player, uint256 amount);
    event Refunded(uint256 indexed marketId, address indexed player, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "Reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address usdcAddress, uint64 timeoutSeconds) {
        require(usdcAddress != address(0), "USDC required");
        require(timeoutSeconds >= 1 hours && timeoutSeconds <= 30 days, "Bad timeout");
        usdc = IERC20(usdcAddress);
        owner = msg.sender;
        resolutionTimeout = timeoutSeconds;
    }

    /// @notice Configure the official bridge once deployment addresses are known.
    /// @dev One-time configuration prevents an admin swapping the resolver for an
    ///      already funded market.
    function configureBridge(
        address sender,
        address receiver,
        address resolver,
        uint32 sourceChainId
    ) external onlyOwner {
        require(!bridgeConfigured, "Bridge already configured");
        require(
            sender != address(0) &&
                receiver != address(0) &&
                resolver != address(0) &&
                sourceChainId != 0,
            "Bad bridge config"
        );

        bridgeSender = IGenLayerBridgeSender(sender);
        bridgeReceiver = receiver;
        genLayerResolver = resolver;
        genLayerSourceChainId = sourceChainId;
        bridgeConfigured = true;

        emit BridgeConfigured(sender, receiver, resolver, sourceChainId);
    }

    function createMarket(
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata competition,
        uint64 matchStart,
        uint64 closeTime,
        uint96 minimumStake,
        bytes32 fixtureCommitment
    ) external onlyOwner returns (uint256 marketId) {
        require(bytes(homeTeam).length != 0 && bytes(awayTeam).length != 0, "Teams required");
        require(keccak256(bytes(homeTeam)) != keccak256(bytes(awayTeam)), "Teams must differ");
        require(closeTime > block.timestamp && closeTime < matchStart, "Bad market times");
        require(minimumStake > 0, "Minimum stake required");
        require(fixtureCommitment != bytes32(0), "Fixture commitment required");

        marketId = ++marketCount;
        markets[marketId] = Market({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            competition: competition,
            matchStart: matchStart,
            closeTime: closeTime,
            resolutionRequestedAt: 0,
            minimumStake: minimumStake,
            status: MarketStatus.Open,
            winningOutcome: Outcome.Unset,
            homeScore: 0,
            awayScore: 0,
            totalPool: 0,
            winningPool: 0,
            requestMessageId: bytes32(0),
            fixtureCommitment: fixtureCommitment,
            resolutionAttempts: 0
        });

        emit MarketCreated(
            marketId,
            homeTeam,
            awayTeam,
            matchStart,
            closeTime,
            minimumStake,
            fixtureCommitment
        );
    }

    function placePrediction(
        uint256 marketId,
        Outcome outcome,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Open, "Market not open");
        require(block.timestamp < market.closeTime, "Predictions closed");
        require(outcome >= Outcome.Home && outcome <= Outcome.Away, "Invalid outcome");
        require(amount >= market.minimumStake, "Stake too small");

        Position storage position = positions[marketId][msg.sender];
        require(position.amount == 0, "Prediction already placed");

        position.outcome = outcome;
        position.amount = amount;
        market.totalPool += amount;
        outcomePools[marketId][outcome] += amount;

        _safeTransferFrom(msg.sender, address(this), amount);
        emit PredictionPlaced(marketId, msg.sender, outcome, amount);
    }

    function quoteResolution(
        uint256 marketId,
        bytes calldata options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        require(bridgeConfigured, "Bridge not configured");
        Market storage market = markets[marketId];
        require(
            market.status == MarketStatus.Open ||
                market.status == MarketStatus.ResolutionRequested,
            "Market cannot resolve"
        );
        return bridgeSender.quoteSendToGenLayer(
            genLayerResolver,
            _resolutionPayload(marketId, market.fixtureCommitment),
            options
        );
    }

    function requestResolution(
        uint256 marketId,
        bytes calldata options
    ) external payable nonReentrant returns (bytes32 messageId) {
        Market storage market = markets[marketId];
        require(bridgeConfigured, "Bridge not configured");
        require(market.status == MarketStatus.Open, "Market not open");
        require(block.timestamp >= market.matchStart, "Match has not started");
        require(market.totalPool > 0, "Empty market");

        market.status = MarketStatus.ResolutionRequested;
        market.resolutionRequestedAt = uint64(block.timestamp);
        return _sendResolutionRequest(marketId, options, false);
    }

    /// @notice Re-send a failed or premature request after the match is final.
    /// @dev The original timeout timestamp is intentionally preserved so a
    ///      losing player cannot indefinitely delay permissionless refunds.
    function retryResolution(
        uint256 marketId,
        bytes calldata options
    ) external payable nonReentrant returns (bytes32 messageId) {
        Market storage market = markets[marketId];
        require(bridgeConfigured, "Bridge not configured");
        require(market.status == MarketStatus.ResolutionRequested, "Resolution not pending");
        return _sendResolutionRequest(marketId, options, true);
    }

    function _sendResolutionRequest(
        uint256 marketId,
        bytes calldata options,
        bool isRetry
    ) private returns (bytes32 messageId) {
        Market storage market = markets[marketId];
        bytes memory payload = _resolutionPayload(marketId, market.fixtureCommitment);
        (uint256 nativeFee, ) = bridgeSender.quoteSendToGenLayer(
            genLayerResolver,
            payload,
            options
        );
        require(msg.value >= nativeFee, "Insufficient bridge fee");

        messageId = bridgeSender.sendToGenLayer{value: nativeFee}(
            genLayerResolver,
            payload,
            options
        );
        market.requestMessageId = messageId;
        unchecked {
            market.resolutionAttempts += 1;
        }

        if (msg.value > nativeFee) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - nativeFee}("");
            require(refunded, "Fee refund failed");
        }

        if (isRetry) {
            emit ResolutionRetried(marketId, messageId, market.resolutionAttempts);
        } else {
            emit ResolutionRequested(marketId, messageId);
        }
    }

    /// @notice Official GenLayer bridge receiver callback.
    /// @param message ABI encoding of (marketId, outcome, homeScore, awayScore).
    function processBridgeMessage(
        uint32 sourceChainId,
        address sourceContract,
        bytes calldata message
    ) external nonReentrant {
        require(msg.sender == bridgeReceiver, "Only bridge receiver");
        require(sourceChainId == genLayerSourceChainId, "Unexpected source chain");
        require(sourceContract == genLayerResolver, "Unexpected resolver");
        require(message.length == 128, "Invalid result payload");

        (
            uint256 marketId,
            uint256 rawOutcome,
            uint256 rawHomeScore,
            uint256 rawAwayScore
        ) = abi.decode(message, (uint256, uint256, uint256, uint256));
        require(rawOutcome >= uint256(Outcome.Home) && rawOutcome <= uint256(Outcome.Away), "Invalid outcome");
        require(rawHomeScore <= type(uint16).max && rawAwayScore <= type(uint16).max, "Invalid score");

        Market storage market = markets[marketId];
        Outcome outcome = Outcome(rawOutcome);
        if (market.status == MarketStatus.Resolved) {
            require(
                market.winningOutcome == outcome &&
                    market.homeScore == uint16(rawHomeScore) &&
                    market.awayScore == uint16(rawAwayScore),
                "Conflicting resolution"
            );
            return;
        }
        require(market.status == MarketStatus.ResolutionRequested, "Resolution not pending");

        market.winningOutcome = outcome;
        market.homeScore = uint16(rawHomeScore);
        market.awayScore = uint16(rawAwayScore);
        market.winningPool = outcomePools[marketId][outcome];

        if (market.winningPool == 0) {
            market.status = MarketStatus.Refunding;
            emit RefundsOpened(marketId);
        } else {
            market.status = MarketStatus.Resolved;
        }

        emit MarketResolved(
            marketId,
            outcome,
            uint16(rawHomeScore),
            uint16(rawAwayScore)
        );
    }

    function claim(uint256 marketId) external nonReentrant returns (uint256 payout) {
        Market storage market = markets[marketId];
        Position storage position = positions[marketId][msg.sender];
        require(market.status == MarketStatus.Resolved, "Market not resolved");
        require(position.amount > 0 && position.outcome == market.winningOutcome, "Not a winner");
        require(!position.claimed, "Already claimed");

        position.claimed = true;
        payout = (position.amount * market.totalPool) / market.winningPool;
        _safeTransfer(msg.sender, payout);
        emit Claimed(marketId, msg.sender, payout);
    }

    function openTimeoutRefunds(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.ResolutionRequested, "Resolution not pending");
        require(
            block.timestamp >= uint256(market.resolutionRequestedAt) + resolutionTimeout,
            "Resolution timeout active"
        );
        market.status = MarketStatus.Refunding;
        emit RefundsOpened(marketId);
    }

    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Open, "Market not open");
        market.status = MarketStatus.Refunding;
        emit RefundsOpened(marketId);
    }

    function claimRefund(uint256 marketId) external nonReentrant returns (uint256 amount) {
        require(markets[marketId].status == MarketStatus.Refunding, "Refunds not open");
        Position storage position = positions[marketId][msg.sender];
        require(position.amount > 0, "No position");
        require(!position.claimed, "Already claimed");

        position.claimed = true;
        amount = position.amount;
        _safeTransfer(msg.sender, amount);
        emit Refunded(marketId, msg.sender, amount);
    }

    function estimatePayout(uint256 marketId, Outcome outcome, uint256 amount) external view returns (uint256) {
        uint256 pool = outcomePools[marketId][outcome];
        uint256 totalAfterStake = markets[marketId].totalPool + amount;
        uint256 outcomeAfterStake = pool + amount;
        if (amount == 0 || outcome < Outcome.Home || outcome > Outcome.Away) return 0;
        return (amount * totalAfterStake) / outcomeAfterStake;
    }

    function _resolutionPayload(
        uint256 marketId,
        bytes32 fixtureCommitment
    ) private pure returns (bytes memory) {
        return abi.encode(marketId, fixtureCommitment);
    }

    function _safeTransfer(address to, uint256 amount) private {
        (bool success, bytes memory result) = address(usdc).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(success && (result.length == 0 || abi.decode(result, (bool))), "USDC transfer failed");
    }

    function _safeTransferFrom(address from, address to, uint256 amount) private {
        (bool success, bytes memory result) = address(usdc).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(success && (result.length == 0 || abi.decode(result, (bool))), "USDC transfer failed");
    }
}
