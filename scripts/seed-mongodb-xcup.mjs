import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "proofplay_xcup";

if (!uri) {
  throw new Error("MONGODB_URI is required. Add it to your environment before seeding.");
}

const client = new MongoClient(uri);
await client.connect();

try {
  const db = client.db(dbName);
  await ensureIndexes(db);
  await Promise.all([
    upsertMany(db.collection("game_events"), FOOTBALL_GAMES, "id"),
    upsertMany(db.collection("markets"), FOOTBALL_MARKETS, "id"),
    upsertMany(db.collection("pvp_matches"), SAMPLE_PVP_MATCHES, "id"),
    upsertMany(db.collection("user_pvp_stats"), SAMPLE_USER_PVP_STATS, "userId"),
    upsertMany(db.collection("nft_rewards"), NFT_REWARDS, "id"),
  ]);

  console.log(`Seeded MongoDB database: ${dbName}`);
  console.log(`Games: ${FOOTBALL_GAMES.length}`);
  console.log(`Markets: ${FOOTBALL_MARKETS.length}`);
  console.log(`PvP matches: ${SAMPLE_PVP_MATCHES.length}`);
  console.log(`PvP stats: ${SAMPLE_USER_PVP_STATS.length}`);
  console.log(`NFT rewards: ${NFT_REWARDS.length}`);
} finally {
  await client.close();
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ walletAddress: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true }),
    db.collection("game_events").createIndex({ id: 1 }, { unique: true }),
    db.collection("game_events").createIndex({ status: 1, matchStartTime: 1 }),
    db.collection("markets").createIndex({ id: 1 }, { unique: true }),
    db.collection("markets").createIndex({ gameId: 1, status: 1 }),
    db.collection("markets").createIndex({ chainMarketId: 1 }, { unique: true }),
    db.collection("predictions").createIndex({ id: 1 }, { unique: true }),
    db.collection("predictions").createIndex({ userId: 1, gameId: 1 }),
    db.collection("predictions").createIndex({ marketId: 1 }),
    db.collection("game_leaderboards").createIndex({ gameEventId: 1, userId: 1 }, { unique: true }),
    db.collection("pvp_matches").createIndex({ id: 1 }, { unique: true }),
    db.collection("pvp_matches").createIndex({ gameEventId: 1, status: 1 }),
    db.collection("pvp_matches").createIndex({ playerAId: 1, gameEventId: 1 }),
    db.collection("pvp_matches").createIndex({ playerBId: 1, gameEventId: 1 }),
    db.collection("user_pvp_stats").createIndex({ userId: 1 }, { unique: true }),
    db.collection("user_pvp_stats").createIndex({ totalPvPPoints: -1 }),
    db.collection("nft_rewards").createIndex({ gameId: 1 }),
  ]);
}

async function upsertMany(collection, items, key) {
  await collection.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { [key]: item[key] },
        update: { $set: item },
        upsert: true,
      },
    })),
  );
}

const FOOTBALL_GAMES = [
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
    image: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1400&q=80",
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
    image: "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1400&q=80",
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
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80",
    totalPool: 12180,
    rewardMode: "PLAYER",
    rewardSummary: "Top player receives the X Cup Legend NFT.",
  },
];

const FOOTBALL_MARKETS = [
  market(1, "m1", "usa-paraguay", "USA wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 6200, "OPEN"),
  market(2, "m2", "usa-paraguay", "Draw", "Match Result", "YES_NO", ["Yes", "No"], 5, 2850, "OPEN"),
  market(3, "m3", "usa-paraguay", "Paraguay wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 2420, "OPEN"),
  market(4, "m4", "usa-paraguay", "Both teams to score", "Goals", "YES_NO", ["Yes", "No"], 5, 3180, "OPEN"),
  market(5, "m5", "usa-paraguay", "First to score", "Players", "MULTI_CHOICE", ["USA", "Paraguay"], 10, 2500, "OPEN"),
  market(6, "m6", "usa-paraguay", "Red card in match", "Cards", "YES_NO", ["Yes", "No"], 5, 1270, "OPEN"),
  market(7, "m7", "brazil-japan", "Brazil wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 10450, "CLOSED"),
  market(8, "m8", "brazil-japan", "Over 4.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, 5100, "CLOSED"),
  market(9, "m9", "brazil-japan", "Player of the match", "Players", "MULTI_CHOICE", ["Vinicius Jr", "Rodrygo", "Kubo", "Mitoma"], 10, 10200, "CLOSED"),
  market(10, "m10", "argentina-germany", "Argentina wins", "Match Result", "YES_NO", ["Yes", "No"], 5, 4200, "OPEN"),
  market(11, "m11", "argentina-germany", "Under 2.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, 3980, "OPEN"),
  market(12, "m12", "argentina-germany", "Top goal scorer", "Players", "MULTI_CHOICE", ["Messi", "Alvarez", "Musiala", "Havertz", "No goal"], 10, 4000, "OPEN"),
];

const NFT_REWARDS = [
  { id: "reward-1", gameId: "usa-paraguay", rewardType: "PLAYER", name: "Perfect Predictor", metadataURI: "ipfs://proofplay/perfect-predictor-usa-paraguay", eligibleRankStart: 1, eligibleRankEnd: 1, status: "PENDING" },
  { id: "reward-3", gameId: "brazil-japan", rewardType: "PLAYER", name: "Matchday Oracle", metadataURI: "ipfs://proofplay/matchday-oracle-brazil-japan", eligibleRankStart: 1, eligibleRankEnd: 3, status: "CLAIMABLE" },
];

const SAMPLE_PVP_MATCHES = [
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

const SAMPLE_USER_PVP_STATS = [
  pvpStats("user-2", "Maya Chen", 3220, 27, 8, 5, 0),
  pvpStats("user-1", "Alex Rivera", 2840, 23, 7, 6, 1),
  pvpStats("user-3", "Sam Okafor", 1560, 13, 9, 14, 0),
  pvpStats("user-4", "Iris Novak", 970, 7, 8, 17, 1),
  pvpStats("user-5", "Leo Martins", 650, 5, 10, 18, 0),
];

function market(chainMarketId, id, gameId, title, category, type, labels, minStake, totalPool, status) {
  const game = FOOTBALL_GAMES.find((item) => item.id === gameId);

  return {
    id,
    chainMarketId,
    gameId,
    title,
    category,
    type,
    options: labels.map((label, optionIndex) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
      optionIndex,
      label,
    })),
    minStake,
    totalPool,
    closeTime: game?.marketCloseTime ?? new Date().toISOString(),
    status,
  };
}

function pvpStats(userId, player, totalPvPPoints, wins, draws, losses, byes) {
  return {
    userId,
    player,
    totalPvPPoints,
    rankTitle: pvpRankTitle(totalPvPPoints),
    wins,
    losses,
    draws,
    byes,
    matchesPlayed: wins + losses + draws + byes,
  };
}

function pvpRankTitle(points) {
  if (points >= 9600) return "Legendary";
  if (points >= 8200) return "Grand Master";
  if (points >= 6500) return "Master";
  if (points >= 4800) return "Pro";
  if (points >= 3000) return "Elite";
  if (points >= 1500) return "Veteran";
  return "Rookie";
}
