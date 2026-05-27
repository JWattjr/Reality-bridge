import type { AnyBulkWriteOperation, Collection, Document, Filter } from "mongodb";
import { MONGO_COLLECTIONS, getMongoDb, hasMongoConfig } from "@/lib/mongodb";
import {
  FOOTBALL_GAMES,
  FOOTBALL_MARKETS,
  NFT_REWARDS,
  SAMPLE_PVP_MATCHES,
  SAMPLE_USER_PVP_STATS,
  SAMPLE_PREDICTIONS,
  type FootballGameEvent,
  type FootballMarket,
  type NFTReward,
  type Prediction,
  type PvPMatch,
  type UserPvPStats,
} from "@/lib/football-data";

export type XCupSeedResult = {
  games: number;
  markets: number;
  pvpMatches: number;
  pvpStats: number;
  rewards: number;
};

export async function listMongoGameEvents(): Promise<FootballGameEvent[]> {
  if (!hasMongoConfig()) return FOOTBALL_GAMES;

  const db = await getMongoDb();
  const rows = await db
    .collection<FootballGameEvent>(MONGO_COLLECTIONS.gameEvents)
    .find({})
    .sort({ matchStartTime: 1 })
    .toArray();

  return rows.length ? rows.map(stripMongoId) : FOOTBALL_GAMES;
}

export async function listMongoMarkets(gameId?: string): Promise<FootballMarket[]> {
  if (!hasMongoConfig()) {
    return gameId ? FOOTBALL_MARKETS.filter((market) => market.gameId === gameId) : FOOTBALL_MARKETS;
  }

  const db = await getMongoDb();
  const rows = await db
    .collection<FootballMarket>(MONGO_COLLECTIONS.markets)
    .find(gameId ? { gameId } : {})
    .sort({ chainMarketId: 1 })
    .toArray();

  return rows.length ? rows.map(stripMongoId) : gameId ? FOOTBALL_MARKETS.filter((market) => market.gameId === gameId) : FOOTBALL_MARKETS;
}

export async function listMongoPredictions(gameId?: string, userId?: string): Promise<Prediction[]> {
  if (!hasMongoConfig()) {
    return SAMPLE_PREDICTIONS.filter((pick) => (!gameId || pick.gameId === gameId) && (!userId || pick.userId === userId));
  }

  const db = await getMongoDb();
  const query = {
    ...(gameId ? { gameId } : {}),
    ...(userId ? { userId } : {}),
  };
  const rows = await db
    .collection<Prediction>(MONGO_COLLECTIONS.predictions)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return rows.map(stripMongoId);
}

export async function seedMongoXcupData(): Promise<XCupSeedResult> {
  const db = await getMongoDb();

  await ensureMongoIndexes();
  await Promise.all([
    upsertMany(db.collection<FootballGameEvent>(MONGO_COLLECTIONS.gameEvents), FOOTBALL_GAMES, "id"),
    upsertMany(db.collection<FootballMarket>(MONGO_COLLECTIONS.markets), FOOTBALL_MARKETS, "id"),
    upsertMany(db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches), SAMPLE_PVP_MATCHES, "id"),
    upsertMany(db.collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats), SAMPLE_USER_PVP_STATS, "userId"),
    upsertMany(db.collection<NFTReward>(MONGO_COLLECTIONS.nftRewards), NFT_REWARDS, "id"),
  ]);

  return {
    games: FOOTBALL_GAMES.length,
    markets: FOOTBALL_MARKETS.length,
    pvpMatches: SAMPLE_PVP_MATCHES.length,
    pvpStats: SAMPLE_USER_PVP_STATS.length,
    rewards: NFT_REWARDS.length,
  };
}

export async function ensureMongoIndexes() {
  const db = await getMongoDb();

  await Promise.all([
    db.collection(MONGO_COLLECTIONS.users).createIndex({ walletAddress: 1 }, { unique: true, sparse: true }),
    db.collection(MONGO_COLLECTIONS.users).createIndex({ username: 1 }, { unique: true, sparse: true }),
    db.collection(MONGO_COLLECTIONS.gameEvents).createIndex({ id: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.gameEvents).createIndex({ status: 1, matchStartTime: 1 }),
    db.collection(MONGO_COLLECTIONS.markets).createIndex({ id: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.markets).createIndex({ gameId: 1, status: 1 }),
    db.collection(MONGO_COLLECTIONS.markets).createIndex({ chainMarketId: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.predictions).createIndex({ id: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.predictions).createIndex({ userId: 1, gameId: 1 }),
    db.collection(MONGO_COLLECTIONS.predictions).createIndex({ marketId: 1 }),
    db.collection(MONGO_COLLECTIONS.gameLeaderboards).createIndex({ gameEventId: 1, userId: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.pvpMatches).createIndex({ id: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.pvpMatches).createIndex({ gameEventId: 1, status: 1 }),
    db.collection(MONGO_COLLECTIONS.pvpMatches).createIndex({ playerAId: 1, gameEventId: 1 }),
    db.collection(MONGO_COLLECTIONS.pvpMatches).createIndex({ playerBId: 1, gameEventId: 1 }),
    db.collection(MONGO_COLLECTIONS.userPvPStats).createIndex({ userId: 1 }, { unique: true }),
    db.collection(MONGO_COLLECTIONS.userPvPStats).createIndex({ totalPvPPoints: -1 }),
    db.collection(MONGO_COLLECTIONS.nftRewards).createIndex({ gameId: 1 }),
  ]);
}

async function upsertMany<T extends Document>(
  collection: Collection<T>,
  items: T[],
  key: keyof T,
) {
  if (items.length === 0) return;

  const operations: AnyBulkWriteOperation<T>[] =
    items.map((item) => ({
      updateOne: {
        filter: { [key]: item[key] } as Filter<T>,
        update: { $set: item },
        upsert: true,
      },
    })) as AnyBulkWriteOperation<T>[];

  await collection.bulkWrite(operations);
}

function stripMongoId<T extends Record<string, unknown>>(doc: T): T {
  const { _id: _ignored, ...rest } = doc;
  void _ignored;
  return rest as T;
}
