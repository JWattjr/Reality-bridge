import { NextResponse } from "next/server";
import { MONGO_COLLECTIONS, getMongoDb, hasMongoConfig } from "@/lib/mongodb";
import {
  SAMPLE_PREDICTIONS,
  pairEligibleUsersForPvP,
  type Prediction,
  type PvPMatch,
} from "@/lib/football-data";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const gameEventId = typeof body.gameEventId === "string" ? body.gameEventId : "";

  if (!gameEventId) {
    return NextResponse.json({ error: "gameEventId is required" }, { status: 400 });
  }

  if (!hasMongoConfig()) {
    const matches = pairEligibleUsersForPvP(gameEventId, SAMPLE_PREDICTIONS);
    return NextResponse.json({
      paired: false,
      skipped: true,
      reason: "MONGODB_URI is not configured. Returning computed preview pairs only.",
      matches,
    });
  }

  const db = await getMongoDb();
  const existing = await db.collection(MONGO_COLLECTIONS.pvpMatches).countDocuments({ gameEventId });

  if (existing > 0) {
    return NextResponse.json({ paired: false, existingMatches: existing });
  }

  const predictions = await db
    .collection<Prediction>(MONGO_COLLECTIONS.predictions)
    .find({ gameId: gameEventId })
    .toArray();
  const matches = pairEligibleUsersForPvP(gameEventId, predictions);

  if (matches.length > 0) {
    await db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches).insertMany(matches);
  }

  return NextResponse.json({ paired: true, matchesCreated: matches.length, matches });
}
