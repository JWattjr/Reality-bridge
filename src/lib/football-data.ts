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

export const FOOTBALL_GAMES: FootballGameEvent[] = [
  {
    id: "usa-paraguay",
    chainGameId: 1,
    teamA: "USA",
    teamB: "Paraguay",
    title: "USA vs Paraguay",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-12T20:00:00Z",
    marketCloseTime: "2026-06-12T19:45:00Z",
    status: "OPEN",
    image:
      "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1400&q=80",
    totalPool: 18420,
    rewardMode: "PLAYER",
    rewardSummary: "Top players earn rare football NFTs.",
  },
  {
    id: "brazil-japan",
    chainGameId: 2,
    teamA: "Brazil",
    teamB: "Japan",
    title: "Brazil vs Japan",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-15T18:30:00Z",
    marketCloseTime: "2026-06-15T18:15:00Z",
    status: "LIVE",
    image:
      "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1400&q=80",
    totalPool: 25750,
    rewardMode: "PLAYER",
    rewardSummary: "Top 3 players win Matchday Oracle NFTs.",
  },
  {
    id: "argentina-germany",
    chainGameId: 3,
    teamA: "Argentina",
    teamB: "Germany",
    title: "Argentina vs Germany",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-18T21:00:00Z",
    marketCloseTime: "2026-06-18T20:45:00Z",
    status: "OPEN",
    image:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80",
    totalPool: 12180,
    rewardMode: "PLAYER",
    rewardSummary: "Top player receives the X Cup Legend NFT.",
  },
];

export const FOOTBALL_MARKETS: FootballMarket[] = [
  market(1, "m1", "usa-paraguay", "USA wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 6200, "OPEN"),
  market(2, "m2", "usa-paraguay", "Draw", "Match Result", "YES_NO", ["Yes", "No"], 5, 2850, "OPEN"),
  market(3, "m3", "usa-paraguay", "Paraguay wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 2420, "OPEN"),
  market(4, "m4", "usa-paraguay", "Both teams to score", "Goals", "YES_NO", ["Yes", "No"], 5, 3180, "OPEN"),
  market(5, "m5", "usa-paraguay", "First to score", "Players", "MULTI_CHOICE", ["USA", "Paraguay"], 10, 2500, "OPEN"),
  market(6, "m6", "usa-paraguay", "Red card in match", "Cards", "YES_NO", ["Yes", "No"], 5, 1270, "OPEN"),
  market(7, "m7", "brazil-japan", "Brazil wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 10450, "CLOSED", "yes"),
  market(8, "m8", "brazil-japan", "Over 4.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, 5100, "CLOSED"),
  market(9, "m9", "brazil-japan", "Player of the match", "Players", "MULTI_CHOICE", ["Vinicius Jr", "Rodrygo", "Kubo", "Mitoma"], 10, 10200, "CLOSED"),
  market(10, "m10", "argentina-germany", "Argentina wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 4200, "OPEN"),
  market(11, "m11", "argentina-germany", "Under 2.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, 3980, "OPEN"),
  market(12, "m12", "argentina-germany", "Top goal scorer", "Players", "MULTI_CHOICE", ["Messi", "Alvarez", "Musiala", "Havertz", "No goal"], 10, 4000, "OPEN"),
];

export const SAMPLE_PREDICTIONS: Prediction[] = [
  prediction("p1", "user-1", "Alex Rivera", "usa-paraguay", "m1", "yes", "Yes", 25, "ACTIVE", undefined, 0, 0, "2026-06-12T17:00:00Z"),
  prediction("p2", "user-1", "Alex Rivera", "usa-paraguay", "m4", "yes", "Yes", 15, "ACTIVE", undefined, 0, 0, "2026-06-12T17:04:00Z"),
  prediction("p3", "user-2", "Maya Chen", "usa-paraguay", "m1", "yes", "Yes", 20, "WON", true, 1, 44, "2026-06-12T16:22:00Z"),
  prediction("p4", "user-3", "Sam Okafor", "usa-paraguay", "m2", "no", "No", 12, "WON", true, 1, 21, "2026-06-12T16:30:00Z"),
  prediction("p5", "user-4", "Iris Novak", "usa-paraguay", "m5", "usa", "USA", 10, "WON", true, 1, 34, "2026-06-12T16:35:00Z"),
  prediction("p6", "user-5", "Leo Martins", "usa-paraguay", "m6", "yes", "Yes", 8, "LOST", false, 0, 0, "2026-06-12T16:40:00Z"),
];

export const SAMPLE_PVP_MATCHES: PvPMatch[] = [
  {
    id: "pvp-usa-1",
    gameEventId: "usa-paraguay",
    playerAId: "user-1",
    playerAHits: 0,
    playerBHits: 0,
    playerAPickCount: 2,
    playerBPickCount: 0,
    playerAPoints: 0,
    playerBPoints: 0,
    status: "PENDING",
    createdAt: "2026-06-12T19:45:00Z",
  },
  {
    id: "pvp-brazil-1",
    gameEventId: "brazil-japan",
    playerAId: "user-2",
    playerBId: "user-3",
    playerAHits: 4,
    playerBHits: 2,
    playerAPickCount: 5,
    playerBPickCount: 4,
    result: "PLAYER_A_WIN",
    playerAPoints: 100,
    playerBPoints: 30,
    status: "RESOLVED",
    createdAt: "2026-06-15T18:15:00Z",
    resolvedAt: "2026-06-15T20:35:00Z",
  },
  {
    id: "pvp-brazil-2",
    gameEventId: "brazil-japan",
    playerAId: "user-4",
    playerBId: "user-5",
    playerAHits: 2,
    playerBHits: 2,
    playerAPickCount: 3,
    playerBPickCount: 3,
    result: "DRAW",
    playerAPoints: 50,
    playerBPoints: 50,
    status: "RESOLVED",
    createdAt: "2026-06-15T18:15:00Z",
    resolvedAt: "2026-06-15T20:35:00Z",
  },
  {
    id: "pvp-argentina-1",
    gameEventId: "argentina-germany",
    playerAId: "user-1",
    playerAHits: 0,
    playerBHits: 0,
    playerAPickCount: 1,
    playerBPickCount: 0,
    result: "BYE",
    playerAPoints: 50,
    playerBPoints: 0,
    status: "RESOLVED",
    createdAt: "2026-06-18T20:45:00Z",
    resolvedAt: "2026-06-18T23:10:00Z",
  },
];

export const SAMPLE_USER_PVP_STATS: UserPvPStats[] = [
  pvpStats("user-2", "Maya Chen", 3220, 27, 8, 5, 0),
  pvpStats("user-1", "Alex Rivera", 2840, 23, 7, 6, 1),
  pvpStats("user-3", "Sam Okafor", 1560, 13, 9, 14, 0),
  pvpStats("user-4", "Iris Novak", 970, 7, 8, 17, 1),
  pvpStats("user-5", "Leo Martins", 650, 5, 10, 18, 0),
];

export const NFT_REWARDS: NFTReward[] = [
  {
    id: "reward-1",
    gameId: "usa-paraguay",
    rewardType: "PLAYER",
    name: "Perfect Predictor",
    metadataURI: "ipfs://proofplay/perfect-predictor-usa-paraguay",
    eligibleRankStart: 1,
    eligibleRankEnd: 1,
    status: "PENDING",
  },
  {
    id: "reward-3",
    gameId: "brazil-japan",
    rewardType: "PLAYER",
    name: "Matchday Oracle",
    metadataURI: "ipfs://proofplay/matchday-oracle-brazil-japan",
    eligibleRankStart: 1,
    eligibleRankEnd: 3,
    status: "CLAIMABLE",
  },
];

export function getGameById(id: string) {
  return FOOTBALL_GAMES.find((game) => game.id === id);
}

export function getMarketsForGame(gameId: string) {
  return FOOTBALL_MARKETS.filter((marketItem) => marketItem.gameId === gameId);
}

export function getPredictionsForGame(gameId: string, userId?: string) {
  return SAMPLE_PREDICTIONS.filter((pick) => pick.gameId === gameId && (!userId || pick.userId === userId));
}

export function getUserPickCount(gameId: string, userId: string) {
  const uniqueMarkets = new Set(
    getPredictionsForGame(gameId, userId).map((pick) => pick.marketId),
  );

  return uniqueMarkets.size;
}

export function getUserHits(gameId: string, userId: string) {
  return getPredictionsForGame(gameId, userId).filter((pick) => pick.isCorrect).length;
}

export function getPvPMatchForUser(gameId: string, userId: string) {
  return SAMPLE_PVP_MATCHES.find(
    (match) => match.gameEventId === gameId && (match.playerAId === userId || match.playerBId === userId),
  );
}

export function getPvPCardState(gameId: string, userId: string): PvPCardState {
  const totalMarkets = getMarketsForGame(gameId).length;
  const pickCount = getUserPickCount(gameId, userId);
  const match = getPvPMatchForUser(gameId, userId);
  const isPlayerA = match?.playerAId === userId;
  const opponentId = isPlayerA ? match?.playerBId : match?.playerAId;
  const userHits = match ? (isPlayerA ? match.playerAHits : match.playerBHits) : getUserHits(gameId, userId);
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

export function getPvPLeaderboard() {
  return SAMPLE_USER_PVP_STATS
    .map((entry) => ({
      ...entry,
      rankTitle: getPvPRankTitle(entry.totalPvPPoints),
    }))
    .sort((a, b) => b.totalPvPPoints - a.totalPvPPoints || b.wins - a.wins || a.player.localeCompare(b.player))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function getPvPRankTitle(points: number) {
  return PVP_RANK_TIERS.find((tier) => points >= tier.points)?.title ?? "Rookie";
}

export function pairEligibleUsersForPvP(gameId: string, predictions: Prediction[] = SAMPLE_PREDICTIONS): PvPMatch[] {
  const usersByMarkets = new Map<string, Set<string>>();

  for (const pick of predictions.filter((predictionItem) => predictionItem.gameId === gameId)) {
    const markets = usersByMarkets.get(pick.userId) ?? new Set<string>();
    markets.add(pick.marketId);
    usersByMarkets.set(pick.userId, markets);
  }

  const usersByPicks = [...usersByMarkets.entries()].map(
    ([userId, marketIds]) => [userId, marketIds.size] as [string, number],
  );

  const buckets = [
    usersByPicks.filter(([, picks]) => picks >= 1 && picks <= 2),
    usersByPicks.filter(([, picks]) => picks >= 3 && picks <= 4),
    usersByPicks.filter(([, picks]) => picks >= 5 && picks <= 6),
  ].map((bucket) => bucket.sort(([userA], [userB]) => userA.localeCompare(userB)));

  const matches: PvPMatch[] = [];
  const leftovers: Array<[string, number]> = [];

  for (const bucket of buckets) {
    for (let index = 0; index < bucket.length; index += 2) {
      const playerA = bucket[index];
      const playerB = bucket[index + 1];
      if (!playerB) {
        leftovers.push(playerA);
        continue;
      }
      matches.push(createPvPPair(gameId, matches.length + 1, playerA, playerB));
    }
  }

  for (let index = 0; index < leftovers.length; index += 2) {
    const playerA = leftovers[index];
    const playerB = leftovers[index + 1];
    matches.push(
      playerB
        ? createPvPPair(gameId, matches.length + 1, playerA, playerB)
        : createPvPBye(gameId, matches.length + 1, playerA),
    );
  }

  return matches;
}

export function getRewardsForGame(gameId: string) {
  return NFT_REWARDS.filter((reward) => reward.gameId === gameId);
}

export function getPlayerLeaderboard(gameId: string): PlayerLeaderboardEntry[] {
  const grouped = new Map<string, Omit<PlayerLeaderboardEntry, "rank">>();

  for (const pick of SAMPLE_PREDICTIONS.filter((predictionItem) => predictionItem.gameId === gameId)) {
    const current = grouped.get(pick.userId) ?? {
      userId: pick.userId,
      player: pick.userName,
      points: 0,
      totalPicks: 0,
      correctPicks: 0,
      winningsUSDT: 0,
      finalPickAt: pick.createdAt,
    };

    current.points += pick.pointsEarned;
    current.totalPicks += 1;
    current.correctPicks += pick.isCorrect ? 1 : 0;
    current.winningsUSDT += pick.winningsUSDT ?? 0;
    if (new Date(pick.createdAt) > new Date(current.finalPickAt)) current.finalPickAt = pick.createdAt;
    grouped.set(pick.userId, current);
  }

  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.winningsUSDT - a.winningsUSDT ||
        new Date(a.finalPickAt).getTime() - new Date(b.finalPickAt).getTime(),
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      nftReward: index === 0 ? "Eligible" : undefined,
    }));
}

export function getPlayerName(userId: string) {
  return SAMPLE_USER_PVP_STATS.find((player) => player.userId === userId)?.player
    ?? SAMPLE_PREDICTIONS.find((pick) => pick.userId === userId)?.userName
    ?? shortenUserId(userId);
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

function market(
  chainMarketId: number,
  id: string,
  gameId: string,
  title: string,
  category: FootballMarket["category"],
  type: MarketType,
  labels: string[],
  minStake: number,
  totalPool: number,
  status: MarketStatus,
  winningOptionId?: string,
): FootballMarket {
  return {
    id,
    chainMarketId,
    gameId,
    title,
    category,
    type,
    options: labels.map((label, index) => ({ id: optionId(label), optionIndex: index, label })),
    minStake,
    totalPool,
    closeTime: FOOTBALL_GAMES.find((game) => game.id === gameId)?.marketCloseTime ?? new Date().toISOString(),
    status,
    winningOptionId,
  };
}

function prediction(
  id: string,
  userId: string,
  userName: string,
  gameId: string,
  marketId: string,
  optionIdValue: string,
  optionLabel: string,
  amountUSDT: number,
  status: Prediction["status"],
  isCorrect: boolean | undefined,
  pointsEarned: 0 | 1,
  winningsUSDT: number,
  createdAt: string,
): Prediction {
  return {
    id,
    userId,
    userName,
    gameId,
    marketId,
    optionId: optionIdValue,
    optionLabel,
    amountUSDT,
    txHash: `0x${id.padEnd(64, "0")}`,
    status,
    isCorrect,
    pointsEarned,
    claimed: status === "CLAIMED",
    createdAt,
    winningsUSDT,
  };
}

function pvpStats(
  userId: string,
  player: string,
  totalPvPPoints: number,
  wins: number,
  draws: number,
  losses: number,
  byes: number,
): UserPvPStats {
  return {
    userId,
    player,
    totalPvPPoints,
    rankTitle: getPvPRankTitle(totalPvPPoints),
    wins,
    losses,
    draws,
    byes,
    matchesPlayed: wins + losses + draws + byes,
  };
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

function createPvPPair(
  gameId: string,
  index: number,
  playerA: [string, number],
  playerB: [string, number],
): PvPMatch {
  return {
    id: `pvp-${gameId}-${index}`,
    gameEventId: gameId,
    playerAId: playerA[0],
    playerBId: playerB[0],
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

function createPvPBye(gameId: string, index: number, playerA: [string, number]): PvPMatch {
  return {
    id: `pvp-${gameId}-${index}`,
    gameEventId: gameId,
    playerAId: playerA[0],
    playerAHits: 0,
    playerBHits: 0,
    playerAPickCount: playerA[1],
    playerBPickCount: 0,
    playerAPoints: 0,
    playerBPoints: 0,
    status: "PAIRED",
    createdAt: new Date().toISOString(),
  };
}

function shortenUserId(userId: string) {
  return userId.length > 12 ? `${userId.slice(0, 6)}...${userId.slice(-4)}` : userId;
}

function optionId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
