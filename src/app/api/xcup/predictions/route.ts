import { MONGO_COLLECTIONS, getMongoDb, hasMongoConfig } from "@/lib/mongodb";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const issues = validatePredictionBody(body);

  if (issues.length > 0) {
    return Response.json({ status: "rejected", issues }, { status: 422 });
  }

  if (!hasMongoConfig()) {
    return Response.json({
      status: "skipped",
      issue: "MONGODB_URI is not configured; on-chain prediction was not indexed in MongoDB.",
    });
  }

  const now = new Date().toISOString();
  const prediction = {
    id: `prediction_${body.chainPredictionId ?? body.txHash}_${body.userId}`.replace(/[^a-zA-Z0-9_-]+/g, "_"),
    chainPredictionId: String(body.chainPredictionId),
    userId: String(body.userId),
    walletAddress: String(body.walletAddress ?? body.userId),
    gameId: String(body.gameId),
    marketId: String(body.marketId),
    chainMarketId: Number(body.chainMarketId),
    optionId: String(body.optionId),
    optionIndex: Number(body.optionIndex),
    optionLabel: String(body.optionLabel),
    amountUSDT: Number(body.amountUSDT),
    txHash: String(body.txHash),
    status: "ACTIVE",
    isCorrect: null,
    pointsEarned: 0,
    claimed: false,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getMongoDb();
  await db
    .collection(MONGO_COLLECTIONS.predictions)
    .updateOne({ id: prediction.id }, { $set: prediction }, { upsert: true });

  return Response.json({ status: "indexed", prediction });
}

function validatePredictionBody(body: Record<string, unknown>) {
  const issues: string[] = [];

  for (const key of ["userId", "gameId", "marketId", "optionId", "optionLabel", "txHash"]) {
    if (typeof body[key] !== "string" || !body[key]) {
      issues.push(`${key} is required`);
    }
  }

  if (body.chainPredictionId === undefined || body.chainPredictionId === null || body.chainPredictionId === "") {
    issues.push("chainPredictionId is required");
  }

  if (!Number.isFinite(Number(body.chainMarketId))) issues.push("chainMarketId is required");
  if (!Number.isFinite(Number(body.optionIndex))) issues.push("optionIndex is required");
  if (!Number.isFinite(Number(body.amountUSDT)) || Number(body.amountUSDT) <= 0) {
    issues.push("amountUSDT must be positive");
  }

  return issues;
}
