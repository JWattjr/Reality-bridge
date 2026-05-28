export type GameStatus = "OPEN" | "CLOSED" | "LIVE" | "RESOLVED" | "CANCELLED";
export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED" | "REFUNDED";
export type MarketType = "YES_NO" | "MULTI_CHOICE";
export type RewardMode = "NONE" | "PLAYER";
export type PvPStatus = "PENDING" | "PAIRED" | "RESOLVED";
export type PvPResult = "PLAYER_A_WIN" | "PLAYER_B_WIN" | "DRAW" | "BYE";

export interface MarketOption {
  id: string;
  optionIndex: number;
  label: string;
}

export interface FootballMarket {
  id: string;
  chainMarketId: number;
  gameId: string;
  title: string;
  category: "Match Result" | "Goals" | "Players" | "Cards";
  type: MarketType;
  options: MarketOption[];
  minStake: number;
  maxStake?: number;
  totalPool: number;
  closeTime: string;
  status: MarketStatus;
  winningOptionId?: string;
}

export interface NFTReward {
  id: string;
  gameId: string;
  rewardType: "PLAYER";
  name: string;
  metadataURI: string;
  eligibleRankStart: number;
  eligibleRankEnd: number;
  status: "PENDING" | "CLAIMABLE" | "DISTRIBUTED";
}

export interface FootballGameEvent {
  id: string;
  chainGameId: number;
  teamA: string;
  teamB: string;
  title: string;
  competition: string;
  matchStartTime: string;
  marketCloseTime: string;
  status: GameStatus;
  image: string;
  totalPool: number;
  rewardMode: RewardMode;
  rewardSummary: string;
  marketCount?: number;
  openMarketCount?: number;
}

export interface Prediction {
  id: string;
  userId: string;
  userName: string;
  gameId: string;
  marketId: string;
  optionId: string;
  optionLabel: string;
  amountUSDT: number;
  txHash: string;
  status: "ACTIVE" | "WON" | "LOST" | "CLAIMED" | "REFUNDED";
  isCorrect?: boolean;
  pointsEarned: 0 | 1;
  claimed: boolean;
  createdAt: string;
  winningsUSDT?: number;
}

export interface PlayerLeaderboardEntry {
  rank: number;
  userId: string;
  player: string;
  points: number;
  totalPicks: number;
  correctPicks: number;
  winningsUSDT: number;
  nftReward?: string;
  finalPickAt: string;
}

export interface PvPMatch {
  id: string;
  gameEventId: string;
  playerAId: string;
  playerBId?: string;
  playerAEntryNumber?: number;
  playerBEntryNumber?: number;
  playerAHits: number;
  playerBHits: number;
  playerAPickCount: number;
  playerBPickCount: number;
  result?: PvPResult;
  playerAPoints: number;
  playerBPoints: number;
  status: PvPStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface UserPvPStats {
  userId: string;
  player: string;
  totalPvPPoints: number;
  rankTitle: string;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  matchesPlayed: number;
}

export interface PvPCardState {
  eligible: boolean;
  pickCount: number;
  totalMarkets: number;
  message: string;
  match?: PvPMatch;
  opponent?: string;
  userHits: number;
  opponentHits: number;
  resultLabel: string;
  pointsEarned: number;
}

export const PVP_RANK_TIERS = [
  { title: "Legendary", points: 9600 },
  { title: "Grand Master", points: 8200 },
  { title: "Master", points: 6500 },
  { title: "Pro", points: 4800 },
  { title: "Elite", points: 3000 },
  { title: "Veteran", points: 1500 },
  { title: "Rookie", points: 0 },
];

export function getPredictionsForGame(gameId: string, userId?: string, customPredictions?: Prediction[]) {
  const source = customPredictions || [];
  return source.filter((pick) => pick.gameId === gameId && (!userId || pick.userId === userId));
}

export function getUserPickCount(gameId: string, userId: string, customPredictions?: Prediction[]) {
  const uniqueMarkets = new Set(
    getPredictionsForGame(gameId, userId, customPredictions).map((pick) => pick.marketId),
  );
  return uniqueMarkets.size;
}

export function getUserHits(gameId: string, userId: string, customPredictions?: Prediction[]) {
  return getPredictionsForGame(gameId, userId, customPredictions).filter((pick) => pick.isCorrect).length;
}

export function getPvPMatchForUser(gameId: string, userId: string, customMatches?: PvPMatch[]) {
  const source = customMatches || [];
  return source.find(
    (match) => match.gameEventId === gameId && (match.playerAId === userId || match.playerBId === userId),
  );
}

export function getPvPCardState(
  gameId: string,
  userId: string,
  customPredictions?: Prediction[],
  customMatches?: PvPMatch[],
  customMarkets?: FootballMarket[],
): PvPCardState {
  const totalMarkets = customMarkets ? customMarkets.length : 0;
  const pickCount = getUserPickCount(gameId, userId, customPredictions);
  const match = getPvPMatchForUser(gameId, userId, customMatches);
  const isPlayerA = match?.playerAId === userId;
  const opponentId = isPlayerA ? match?.playerBId : match?.playerAId;
  const userHits = match ? (isPlayerA ? match.playerAHits : match.playerBHits) : getUserHits(gameId, userId, customPredictions);
  const opponentHits = match ? (isPlayerA ? match.playerBHits : match.playerAHits) : 0;
  const pointsEarned = match ? (isPlayerA ? match.playerAPoints : match.playerBPoints) : 0;

  if (pickCount === 0) {
    return {
      eligible: false,
      pickCount,
      totalMarkets,
      message: "Back at least 1 pick with USDT to enter automatic PvP.",
      userHits,
      opponentHits,
      resultLabel: "Not entered",
      pointsEarned,
    };
  }

  if (!match) {
    return {
      eligible: true,
      pickCount,
      totalMarkets,
      message: "Eligible. Pairing starts automatically when the match starts.",
      userHits,
      opponentHits,
      resultLabel: "Waiting for pairing",
      pointsEarned,
    };
  }

  return {
    eligible: true,
    pickCount,
    totalMarkets,
    message: match.status === "RESOLVED"
      ? "PvP battle resolved. USDT payouts stay separate."
      : "More picks = more chances to score hits.",
    match,
    opponent: opponentId ? getPlayerName(opponentId) : undefined,
    userHits,
    opponentHits,
    resultLabel: pvpResultLabel(match, userId),
    pointsEarned,
  };
}

export function getPvPRankTitle(points: number) {
  return PVP_RANK_TIERS.find((tier) => points >= tier.points)?.title ?? "Rookie";
}

export function getPlayerName(userId: string) {
  return shortenUserId(userId);
}

export function formatUSDT(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`;
}

export function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function statusLabel(status: GameStatus | MarketStatus | NFTReward["status"]) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function pvpResultLabel(match: PvPMatch, userId: string) {
  if (match.status === "PENDING") return "Pairing pending";
  if (match.status !== "RESOLVED") return match.playerBId ? "Paired" : "Bye queued";
  if (match.result === "DRAW") return "Draw";
  if (match.result === "BYE") return "Bye";
  if (match.result === "PLAYER_A_WIN") return match.playerAId === userId ? "Win" : "Loss";
  if (match.result === "PLAYER_B_WIN") return match.playerBId === userId ? "Win" : "Loss";
  return "Resolved";
}

export function pairEligibleUsersForPvP(gameId: string, predictions: Prediction[] = []): PvPMatch[] {
  const users = getPvPEntrantsByFirstBid(gameId, predictions);
  const matches: PvPMatch[] = [];

  for (let index = 0; index < users.length; index += 2) {
    const playerA = users[index];
    const playerB = users[index + 1];
    matches.push(
      playerB
        ? createPvPPair(gameId, matches.length + 1, playerA, playerB)
        : createPvPBye(gameId, matches.length + 1, playerA),
    );
  }

  return matches;
}

function getPvPEntrantsByFirstBid(gameId: string, predictions: Prediction[]) {
  const entrants = new Map<string, {
    userId: string;
    entryNumber: number;
    pickCount: number;
    firstBidAt: string;
    markets: Set<string>;
  }>();

  const sortedPredictions = predictions
    .filter((pick) => pick.gameId === gameId)
    .sort((a, b) => {
      const timeDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDelta !== 0) return timeDelta;
      return a.id.localeCompare(b.id);
    });

  for (const pick of sortedPredictions) {
    const existing = entrants.get(pick.userId);
    if (existing) {
      existing.markets.add(pick.marketId);
      existing.pickCount = existing.markets.size;
      continue;
    }

    entrants.set(pick.userId, {
      userId: pick.userId,
      entryNumber: entrants.size + 1,
      pickCount: 1,
      firstBidAt: pick.createdAt,
      markets: new Set([pick.marketId]),
    });
  }

  return [...entrants.values()].map((entrant) => [
    entrant.userId,
    entrant.pickCount,
    entrant.entryNumber,
  ] as [string, number, number]);
}

function createPvPPair(
  gameId: string,
  index: number,
  playerA: [string, number, number],
  playerB: [string, number, number],
): PvPMatch {
  return {
    id: `pvp-${gameId}-${index}`,
    gameEventId: gameId,
    playerAId: playerA[0],
    playerBId: playerB[0],
    playerAEntryNumber: playerA[2],
    playerBEntryNumber: playerB[2],
    playerAHits: 0,
    playerBHits: 0,
    playerAPickCount: playerA[1],
    playerBPickCount: playerB[1],
    playerAPoints: 0,
    playerBPoints: 0,
    status: "PAIRED",
    createdAt: new Date().toISOString(),
  };
}

function createPvPBye(gameId: string, index: number, playerA: [string, number, number]): PvPMatch {
  return {
    id: `pvp-${gameId}-${index}`,
    gameEventId: gameId,
    playerAId: playerA[0],
    playerAEntryNumber: playerA[2],
    playerAHits: 0,
    playerBHits: 0,
    playerAPickCount: playerA[1],
    playerBPickCount: 0,
    playerAPoints: 0,
    playerBPoints: 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
}

function shortenUserId(userId: string) {
  return userId.length > 12 ? `${userId.slice(0, 6)}...${userId.slice(-4)}` : userId;
}

function optionId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
