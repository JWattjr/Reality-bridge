import { MongoClient, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;

export function hasMongoConfig() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required for MongoDB-backed ProofPlay data.");
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || "proofplay_xcup");
}

export const MONGO_COLLECTIONS = {
  users: "users",
  gameEvents: "game_events",
  markets: "markets",
  predictions: "predictions",
  gameLeaderboards: "game_leaderboards",
  pvpMatches: "pvp_matches",
  userPvPStats: "user_pvp_stats",
  nftRewards: "nft_rewards",
} as const;
