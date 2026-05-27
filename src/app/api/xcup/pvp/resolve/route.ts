import { NextResponse } from "next/server";
import { MONGO_COLLECTIONS, getMongoDb, hasMongoConfig } from "@/lib/mongodb";
import {
  getPlayerName,
  getPvPRankTitle,
  type Prediction,
  type PvPMatch,
  type PvPResult,
  type UserPvPStats,
} from "@/lib/football-data";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const gameEventId = typeof body.gameEventId === "string" ? body.gameEventId : "";

  if (!gameEventId) {
    return NextResponse.json({ error: "gameEventId is required" }, { status: 400 });
  }

  if (!hasMongoConfig()) {
    return NextResponse.json({
      resolved: false,
      skipped: true,
      reason: "MONGODB_URI is not configured.",
    });
  }

  const db = await getMongoDb();
  const [matches, predictions] = await Promise.all([
    db
      .collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches)
      .find({ gameEventId, status: { $ne: "RESOLVED" } })
      .toArray(),
    db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ gameId: gameEventId }).toArray(),
  ]);
  const resolvedAt = new Date().toISOString();

  for (const match of matches) {
    const playerAHits = countHits(predictions, match.playerAId);
    const playerBHits = match.playerBId ? countHits(predictions, match.playerBId) : 0;
    const result = getPvPResult(playerAHits, playerBHits, Boolean(match.playerBId));
    const playerAPoints = getPvPPoints(result, true);
    const playerBPoints = match.playerBId ? getPvPPoints(result, false) : 0;

    await db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches).updateOne(
      { id: match.id },
      {
        $set: {
          playerAHits,
          playerBHits,
          result,
          playerAPoints,
          playerBPoints,
          status: "RESOLVED",
          resolvedAt,
        },
      },
    );

    await updateUserPvPStats(match.playerAId, predictions, result, true, playerAPoints);
    if (match.playerBId) {
      await updateUserPvPStats(match.playerBId, predictions, result, false, playerBPoints);
    }
  }

  return NextResponse.json({ resolved: true, matchesResolved: matches.length });
}

function countHits(predictions: Prediction[], userId: string) {
  return predictions.filter((prediction) => prediction.userId === userId && prediction.isCorrect).length;
}

function getPvPResult(playerAHits: number, playerBHits: number, hasOpponent: boolean): PvPResult {
  if (!hasOpponent) return "BYE";
  if (playerAHits > playerBHits) return "PLAYER_A_WIN";
  if (playerBHits > playerAHits) return "PLAYER_B_WIN";
  return "DRAW";
}

function getPvPPoints(result: PvPResult, isPlayerA: boolean) {
  if (result === "DRAW" || result === "BYE") return 50;
  if (result === "PLAYER_A_WIN") return isPlayerA ? 100 : 30;
  return isPlayerA ? 30 : 100;
}

async function updateUserPvPStats(
  userId: string,
  predictions: Prediction[],
  result: PvPResult,
  isPlayerA: boolean,
  pointsEarned: number,
) {
  const db = await getMongoDb();
  const existing = await db.collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats).findOne({ userId });
  const current = existing ?? {
    userId,
    player: predictions.find((prediction) => prediction.userId === userId)?.userName ?? getPlayerName(userId),
    totalPvPPoints: 0,
    rankTitle: "Rookie",
    wins: 0,
    losses: 0,
    draws: 0,
    byes: 0,
    matchesPlayed: 0,
  };
  const delta = getRecordDelta(result, isPlayerA);
  const next = {
    ...current,
    totalPvPPoints: current.totalPvPPoints + pointsEarned,
    wins: current.wins + delta.wins,
    losses: current.losses + delta.losses,
    draws: current.draws + delta.draws,
    byes: current.byes + delta.byes,
    matchesPlayed: current.matchesPlayed + 1,
  };

  next.rankTitle = getPvPRankTitle(next.totalPvPPoints);

  await db.collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats).updateOne(
    { userId },
    { $set: next },
    { upsert: true },
  );
}

function getRecordDelta(result: PvPResult, isPlayerA: boolean) {
  const empty = { wins: 0, losses: 0, draws: 0, byes: 0 };
  if (result === "BYE") return { ...empty, byes: 1 };
  if (result === "DRAW") return { ...empty, draws: 1 };
  if (result === "PLAYER_A_WIN") return isPlayerA ? { ...empty, wins: 1 } : { ...empty, losses: 1 };
  return isPlayerA ? { ...empty, losses: 1 } : { ...empty, wins: 1 };
}
