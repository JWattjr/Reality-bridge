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

/// @title ProofPlay Base Sepolia Duel
/// @notice A 1v1 football prediction duel with independently settled ticket picks.
/// @dev Each player escrows one test-USDC entry. The escrow is for the duel,
///      never for an individual market. GenLayer returns real-world fixture
///      metrics and this contract deterministically scores both tickets.
contract ProofPlayBaseDuel {
    uint8 public constant MARKET_COUNT = 6;
    uint8 public constant OUTCOME_SLOT_COUNT = 14;
    uint16 public constant PROBABILITY_SCALE_BPS = 10_000;
    uint32 public constant WEIGHT_SCALE = 1_000_000;

    enum DuelStatus {
        Missing,
        Open,
        Matched,
        ResolutionRequested,
        Settled,
        Refunding
    }

    enum DuelWinner {
        Unset,
        Creator,
        Challenger,
        Draw
    }

    struct Duel {
        string homeTeam;
        string awayTeam;
        string competition;
        uint64 kickoff;
        uint64 resolutionRequestedAt;
        uint96 entryStake;
        uint16 totalGoalsLineTenths;
        uint16 totalCornersLineTenths;
        uint16 totalCardsLineTenths;
        DuelStatus status;
        DuelWinner winner;
        address creator;
        address invitedOpponent;
        address challenger;
        bytes32 fixtureCommitment;
        bytes32 requestMessageId;
        uint16 homeGoals;
        uint16 awayGoals;
        uint16 totalCorners;
        uint16 totalCards;
        uint8 firstTeamToScore;
        uint8 creatorCorrectPicks;
        uint8 challengerCorrectPicks;
        uint32 creatorWeightedScore;
        uint32 challengerWeightedScore;
        uint32 creatorBestPickValue;
        uint32 challengerBestPickValue;
    }

    struct Ticket {
        uint8[6] picks;
        uint64 submittedAt;
        bool submitted;
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
    uint256 public duelCount;

    mapping(uint256 => Duel) public duels;
    mapping(uint256 => mapping(address => Ticket)) private _tickets;
    mapping(uint256 => uint16[14]) private _impliedProbabilityBps;

    uint256 private _locked = 1;

    event BridgeConfigured(
        address indexed sender,
        address indexed receiver,
        address indexed resolver,
        uint32 sourceChainId
    );
    event DuelCreated(
        uint256 indexed duelId,
        address indexed creator,
        address indexed invitedOpponent,
        uint64 kickoff,
        uint96 entryStake,
        bytes32 fixtureCommitment
    );
    event DuelMatched(uint256 indexed duelId, address indexed challenger);
    event TicketSubmitted(uint256 indexed duelId, address indexed player, uint64 submittedAt);
    event ResolutionRequested(uint256 indexed duelId, bytes32 indexed messageId);
    event ResolutionRetried(uint256 indexed duelId, bytes32 indexed messageId);
    event DuelSettled(
        uint256 indexed duelId,
        DuelWinner winner,
        uint8 creatorCorrectPicks,
        uint8 challengerCorrectPicks,
        uint32 creatorWeightedScore,
        uint32 challengerWeightedScore
    );
    event RefundsOpened(uint256 indexed duelId);
    event PrizeClaimed(uint256 indexed duelId, address indexed winner, uint256 amount);
    event RefundClaimed(uint256 indexed duelId, address indexed player, uint256 amount);

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

    /// @notice Configure verified official beta bridge addresses once.
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

    /// @notice Create a direct invitation or an open-matchmaking duel.
    /// @param invitedOpponent Set to zero for the first eligible player to join.
    /// @param impliedProbabilityBps Normalized market probabilities. Each market
    ///        must sum to 10,000 bps and is locked before either ticket settles.
    function createDuel(
        address invitedOpponent,
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata competition,
        uint64 kickoff,
        uint96 entryStake,
        uint16 totalGoalsLineTenths,
        uint16 totalCornersLineTenths,
        uint16 totalCardsLineTenths,
        uint16[14] calldata impliedProbabilityBps,
        uint8[6] calldata creatorPicks,
        bytes32 fixtureCommitment
    ) external nonReentrant returns (uint256 duelId) {
        require(bytes(homeTeam).length != 0 && bytes(awayTeam).length != 0, "Teams required");
        require(keccak256(bytes(homeTeam)) != keccak256(bytes(awayTeam)), "Teams must differ");
        require(kickoff > block.timestamp, "Kickoff must be future");
        require(entryStake > 0, "Entry stake required");
        require(fixtureCommitment != bytes32(0), "Fixture commitment required");
        require(invitedOpponent != msg.sender, "Cannot invite self");
        require(
            totalGoalsLineTenths > 0 &&
                totalCornersLineTenths > 0 &&
                totalCardsLineTenths > 0,
            "Lines required"
        );
        _validateProbabilities(impliedProbabilityBps);
        _validateTicket(creatorPicks);

        duelId = ++duelCount;
        Duel storage duel = duels[duelId];
        duel.homeTeam = homeTeam;
        duel.awayTeam = awayTeam;
        duel.competition = competition;
        duel.kickoff = kickoff;
        duel.entryStake = entryStake;
        duel.totalGoalsLineTenths = totalGoalsLineTenths;
        duel.totalCornersLineTenths = totalCornersLineTenths;
        duel.totalCardsLineTenths = totalCardsLineTenths;
        duel.status = DuelStatus.Open;
        duel.creator = msg.sender;
        duel.invitedOpponent = invitedOpponent;
        duel.fixtureCommitment = fixtureCommitment;

        for (uint8 index = 0; index < OUTCOME_SLOT_COUNT; index++) {
            _impliedProbabilityBps[duelId][index] = impliedProbabilityBps[index];
        }
        _storeTicket(duelId, msg.sender, creatorPicks);
        _safeTransferFrom(msg.sender, address(this), entryStake);

        emit DuelCreated(duelId, msg.sender, invitedOpponent, kickoff, entryStake, fixtureCommitment);
        emit TicketSubmitted(duelId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Join an invitation or open matchmaking duel with a full ticket.
    function acceptDuel(
        uint256 duelId,
        uint8[6] calldata challengerPicks
    ) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.Open, "Duel is not open");
        require(block.timestamp < duel.kickoff, "Entry closed at kickoff");
        require(msg.sender != duel.creator, "Creator cannot accept");
        require(
            duel.invitedOpponent == address(0) || duel.invitedOpponent == msg.sender,
            "Not invited"
        );
        _validateTicket(challengerPicks);

        duel.challenger = msg.sender;
        duel.status = DuelStatus.Matched;
        _storeTicket(duelId, msg.sender, challengerPicks);
        _safeTransferFrom(msg.sender, address(this), duel.entryStake);

        emit DuelMatched(duelId, msg.sender);
        emit TicketSubmitted(duelId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Creator may cancel an unmatched invitation before kickoff.
    function cancelUnmatchedDuel(uint256 duelId) external {
        Duel storage duel = duels[duelId];
        require(msg.sender == duel.creator, "Only creator");
        require(duel.status == DuelStatus.Open, "Duel is not open");
        require(block.timestamp < duel.kickoff, "Use unmatched refund");
        _openRefunds(duelId);
    }

    /// @notice Anyone can unlock the creator's entry if no opponent joins by kickoff.
    function openUnmatchedRefunds(uint256 duelId) external {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.Open, "Duel is not open");
        require(block.timestamp >= duel.kickoff, "Entry still open");
        _openRefunds(duelId);
    }

    function quoteResolution(
        uint256 duelId,
        bytes calldata options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        require(bridgeConfigured, "Bridge not configured");
        DuelStatus status = duels[duelId].status;
        require(
            status == DuelStatus.Matched || status == DuelStatus.ResolutionRequested,
            "Duel cannot resolve"
        );
        return bridgeSender.quoteSendToGenLayer(
            genLayerResolver,
            _resolutionPayload(duelId, duels[duelId].fixtureCommitment),
            options
        );
    }

    /// @notice Request GenLayer settlement once the fixture has started.
    function requestResolution(
        uint256 duelId,
        bytes calldata options
    ) external payable nonReentrant returns (bytes32 messageId) {
        Duel storage duel = duels[duelId];
        require(bridgeConfigured, "Bridge not configured");
        require(duel.status == DuelStatus.Matched, "Duel is not matched");
        require(block.timestamp >= duel.kickoff, "Fixture has not started");

        duel.status = DuelStatus.ResolutionRequested;
        duel.resolutionRequestedAt = uint64(block.timestamp);
        return _sendResolutionRequest(duelId, options, false);
    }

    /// @notice Re-send a premature or failed request without extending refunds.
    function retryResolution(
        uint256 duelId,
        bytes calldata options
    ) external payable nonReentrant returns (bytes32 messageId) {
        Duel storage duel = duels[duelId];
        require(bridgeConfigured, "Bridge not configured");
        require(duel.status == DuelStatus.ResolutionRequested, "Resolution not pending");
        return _sendResolutionRequest(duelId, options, true);
    }

    /// @notice Authenticated callback with raw, independently verified fixture metrics.
    /// @dev ABI payload: duelId, fixtureCommitment, homeGoals, awayGoals,
    ///      firstTeamToScore (1 home, 2 away, 3 no-goals), totalCorners, totalCards.
    function processBridgeMessage(
        uint32 sourceChainId,
        address sourceContract,
        bytes calldata message
    ) external nonReentrant {
        require(msg.sender == bridgeReceiver, "Only bridge receiver");
        require(sourceChainId == genLayerSourceChainId, "Unexpected source chain");
        require(sourceContract == genLayerResolver, "Unexpected resolver");
        require(message.length == 224, "Invalid result payload");

        (
            uint256 duelId,
            bytes32 fixtureCommitment,
            uint256 rawHomeGoals,
            uint256 rawAwayGoals,
            uint256 rawFirstTeamToScore,
            uint256 rawTotalCorners,
            uint256 rawTotalCards
        ) = abi.decode(message, (uint256, bytes32, uint256, uint256, uint256, uint256, uint256));

        Duel storage duel = duels[duelId];
        require(duel.fixtureCommitment == fixtureCommitment, "Fixture commitment mismatch");
        _validateResult(
            rawHomeGoals,
            rawAwayGoals,
            rawFirstTeamToScore,
            rawTotalCorners,
            rawTotalCards
        );

        if (duel.status == DuelStatus.Settled) {
            require(
                duel.homeGoals == rawHomeGoals &&
                    duel.awayGoals == rawAwayGoals &&
                    duel.firstTeamToScore == rawFirstTeamToScore &&
                    duel.totalCorners == rawTotalCorners &&
                    duel.totalCards == rawTotalCards,
                "Conflicting resolution"
            );
            return;
        }
        require(duel.status == DuelStatus.ResolutionRequested, "Resolution not pending");

        duel.homeGoals = uint16(rawHomeGoals);
        duel.awayGoals = uint16(rawAwayGoals);
        duel.firstTeamToScore = uint8(rawFirstTeamToScore);
        duel.totalCorners = uint16(rawTotalCorners);
        duel.totalCards = uint16(rawTotalCards);

        (
            duel.creatorCorrectPicks,
            duel.creatorWeightedScore,
            duel.creatorBestPickValue
        ) = _scoreTicket(duelId, duel.creator);
        (
            duel.challengerCorrectPicks,
            duel.challengerWeightedScore,
            duel.challengerBestPickValue
        ) = _scoreTicket(duelId, duel.challenger);
        duel.winner = _decideWinner(duelId);
        duel.status = DuelStatus.Settled;

        emit DuelSettled(
            duelId,
            duel.winner,
            duel.creatorCorrectPicks,
            duel.challengerCorrectPicks,
            duel.creatorWeightedScore,
            duel.challengerWeightedScore
        );
    }

    /// @notice Winners claim the whole 1v1 entry pot once; there is no house fee.
    function claimPrize(uint256 duelId) external nonReentrant returns (uint256 payout) {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.Settled, "Duel is not settled");
        require(duel.winner != DuelWinner.Draw, "Draw uses refunds");
        bool creatorWon = duel.winner == DuelWinner.Creator;
        require(
            (creatorWon && msg.sender == duel.creator) ||
                (!creatorWon && msg.sender == duel.challenger),
            "Not the duel winner"
        );

        Ticket storage ticket = _tickets[duelId][msg.sender];
        require(!ticket.claimed, "Already claimed");
        ticket.claimed = true;
        payout = uint256(duel.entryStake) * 2;
        _safeTransfer(msg.sender, payout);
        emit PrizeClaimed(duelId, msg.sender, payout);
    }

    /// @notice A genuine scoring draw returns each player their own entry stake.
    function claimDrawRefund(uint256 duelId) external nonReentrant returns (uint256 amount) {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.Settled && duel.winner == DuelWinner.Draw, "Not a draw");
        require(msg.sender == duel.creator || msg.sender == duel.challenger, "Not a player");
        Ticket storage ticket = _tickets[duelId][msg.sender];
        require(!ticket.claimed, "Already claimed");
        ticket.claimed = true;
        amount = duel.entryStake;
        _safeTransfer(msg.sender, amount);
        emit RefundClaimed(duelId, msg.sender, amount);
    }

    /// @notice Open refunds when bridge settlement is unavailable past timeout.
    function openTimeoutRefunds(uint256 duelId) external {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.ResolutionRequested, "Resolution not pending");
        require(
            block.timestamp >= uint256(duel.resolutionRequestedAt) + resolutionTimeout,
            "Resolution timeout active"
        );
        _openRefunds(duelId);
    }

    function claimRefund(uint256 duelId) external nonReentrant returns (uint256 amount) {
        Duel storage duel = duels[duelId];
        require(duel.status == DuelStatus.Refunding, "Refunds not open");
        require(msg.sender == duel.creator || msg.sender == duel.challenger, "Not a player");
        Ticket storage ticket = _tickets[duelId][msg.sender];
        require(ticket.submitted && !ticket.claimed, "No refundable entry");
        ticket.claimed = true;
        amount = duel.entryStake;
        _safeTransfer(msg.sender, amount);
        emit RefundClaimed(duelId, msg.sender, amount);
    }

    function getTicket(
        uint256 duelId,
        address player
    ) external view returns (uint8[6] memory picks, uint64 submittedAt, bool submitted, bool claimed) {
        Ticket storage ticket = _tickets[duelId][player];
        return (ticket.picks, ticket.submittedAt, ticket.submitted, ticket.claimed);
    }

    function getImpliedProbabilityBps(
        uint256 duelId
    ) external view returns (uint16[14] memory probabilities) {
        return _impliedProbabilityBps[duelId];
    }

    function _sendResolutionRequest(
        uint256 duelId,
        bytes calldata options,
        bool isRetry
    ) private returns (bytes32 messageId) {
        Duel storage duel = duels[duelId];
        bytes memory payload = _resolutionPayload(duelId, duel.fixtureCommitment);
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
        duel.requestMessageId = messageId;

        if (msg.value > nativeFee) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - nativeFee}("");
            require(refunded, "Fee refund failed");
        }

        if (isRetry) {
            emit ResolutionRetried(duelId, messageId);
        } else {
            emit ResolutionRequested(duelId, messageId);
        }
    }

    function _storeTicket(
        uint256 duelId,
        address player,
        uint8[6] calldata picks
    ) private {
        Ticket storage ticket = _tickets[duelId][player];
        require(!ticket.submitted, "Ticket already submitted");
        for (uint8 index = 0; index < MARKET_COUNT; index++) {
            ticket.picks[index] = picks[index];
        }
        ticket.submittedAt = uint64(block.timestamp);
        ticket.submitted = true;
    }

    function _scoreTicket(
        uint256 duelId,
        address player
    ) private view returns (uint8 correctPicks, uint32 weightedScore, uint32 bestPickValue) {
        Ticket storage ticket = _tickets[duelId][player];
        Duel storage duel = duels[duelId];
        for (uint8 marketIndex = 0; marketIndex < MARKET_COUNT; marketIndex++) {
            uint8 actualOutcome = _actualOutcome(duel, marketIndex);
            uint8 selectedOutcome = ticket.picks[marketIndex];
            if (selectedOutcome != actualOutcome) continue;

            uint16 probability = _impliedProbabilityBps[duelId][
                _probabilitySlot(marketIndex, selectedOutcome)
            ];
            uint32 value = WEIGHT_SCALE / probability;
            correctPicks += 1;
            weightedScore += value;
            if (value > bestPickValue) bestPickValue = value;
        }
    }

    /// @dev Weighted score rewards lower-implied-probability correct picks.
    ///      If weighted totals tie, raw picks, best correct pick, then earliest
    ///      ticket determine the winner; a final tie is a draw/refund.
    function _decideWinner(uint256 duelId) private view returns (DuelWinner) {
        Duel storage duel = duels[duelId];
        if (duel.creatorWeightedScore > duel.challengerWeightedScore) return DuelWinner.Creator;
        if (duel.challengerWeightedScore > duel.creatorWeightedScore) return DuelWinner.Challenger;
        if (duel.creatorCorrectPicks > duel.challengerCorrectPicks) return DuelWinner.Creator;
        if (duel.challengerCorrectPicks > duel.creatorCorrectPicks) return DuelWinner.Challenger;
        if (duel.creatorBestPickValue > duel.challengerBestPickValue) return DuelWinner.Creator;
        if (duel.challengerBestPickValue > duel.creatorBestPickValue) return DuelWinner.Challenger;

        uint64 creatorSubmittedAt = _tickets[duelId][duel.creator].submittedAt;
        uint64 challengerSubmittedAt = _tickets[duelId][duel.challenger].submittedAt;
        if (creatorSubmittedAt < challengerSubmittedAt) return DuelWinner.Creator;
        if (challengerSubmittedAt < creatorSubmittedAt) return DuelWinner.Challenger;
        return DuelWinner.Draw;
    }

    function _actualOutcome(Duel storage duel, uint8 marketIndex) private view returns (uint8) {
        if (marketIndex == 0) {
            if (duel.homeGoals > duel.awayGoals) return 1;
            if (duel.awayGoals > duel.homeGoals) return 3;
            return 2;
        }
        if (marketIndex == 1) return duel.firstTeamToScore;
        if (marketIndex == 2) {
            return
                (uint256(duel.homeGoals) + uint256(duel.awayGoals)) * 10 >
                    duel.totalGoalsLineTenths
                    ? 1
                    : 2;
        }
        if (marketIndex == 3) {
            return uint256(duel.totalCorners) * 10 > duel.totalCornersLineTenths ? 1 : 2;
        }
        if (marketIndex == 4) {
            return uint256(duel.totalCards) * 10 > duel.totalCardsLineTenths ? 1 : 2;
        }
        return duel.homeGoals > 0 && duel.awayGoals > 0 ? 1 : 2;
    }

    function _probabilitySlot(uint8 marketIndex, uint8 outcome) private pure returns (uint8) {
        if (marketIndex < 2) return marketIndex * 3 + outcome - 1;
        return 6 + (marketIndex - 2) * 2 + outcome - 1;
    }

    function _validateTicket(uint8[6] calldata picks) private pure {
        require(picks[0] >= 1 && picks[0] <= 3, "Bad winner pick");
        require(picks[1] >= 1 && picks[1] <= 3, "Bad first-score pick");
        for (uint8 marketIndex = 2; marketIndex < MARKET_COUNT; marketIndex++) {
            require(picks[marketIndex] >= 1 && picks[marketIndex] <= 2, "Bad binary pick");
        }
    }

    function _validateProbabilities(uint16[14] calldata probabilities) private pure {
        require(
            uint256(probabilities[0]) + probabilities[1] + probabilities[2] == PROBABILITY_SCALE_BPS,
            "Bad winner probabilities"
        );
        require(
            uint256(probabilities[3]) + probabilities[4] + probabilities[5] == PROBABILITY_SCALE_BPS,
            "Bad first-score probabilities"
        );
        for (uint8 index = 6; index < OUTCOME_SLOT_COUNT; index += 2) {
            require(probabilities[index] > 0 && probabilities[index + 1] > 0, "Zero probability");
            require(
                uint256(probabilities[index]) + probabilities[index + 1] == PROBABILITY_SCALE_BPS,
                "Bad binary probabilities"
            );
        }
        for (uint8 index = 0; index < OUTCOME_SLOT_COUNT; index++) {
            require(probabilities[index] > 0, "Zero probability");
        }
    }

    function _validateResult(
        uint256 rawHomeGoals,
        uint256 rawAwayGoals,
        uint256 rawFirstTeamToScore,
        uint256 rawTotalCorners,
        uint256 rawTotalCards
    ) private pure {
        require(rawHomeGoals <= 99 && rawAwayGoals <= 99, "Invalid goals");
        require(rawTotalCorners <= 99 && rawTotalCards <= 99, "Invalid stats");
        require(rawFirstTeamToScore >= 1 && rawFirstTeamToScore <= 3, "Invalid first scorer");
        if (rawHomeGoals == 0 && rawAwayGoals == 0) {
            require(rawFirstTeamToScore == 3, "No-goal fixture mismatch");
        } else {
            require(rawFirstTeamToScore <= 2, "Scoring fixture mismatch");
        }
    }

    function _openRefunds(uint256 duelId) private {
        duels[duelId].status = DuelStatus.Refunding;
        emit RefundsOpened(duelId);
    }

    function _resolutionPayload(
        uint256 duelId,
        bytes32 fixtureCommitment
    ) private pure returns (bytes memory) {
        return abi.encode(duelId, fixtureCommitment);
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
