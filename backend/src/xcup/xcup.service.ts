import { Injectable, Inject } from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGO_COLLECTIONS } from '@/common/database/collections';
import {
  pairEligibleUsersForPvP,
  getPlayerName,
  getPvPRankTitle,
  type Prediction,
  type PvPMatch,
  type PvPResult,
  type UserPvPStats,
} from '@/shared/football-data';

@Injectable()
export class XCupService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: Db,
  ) {}

  async indexPrediction(body: any): Promise<any> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return {
        status: 'skipped',
        issue:
          'MONGODB_URI is not configured; on-chain prediction was not indexed in MongoDB.',
      };
    }

    const now = new Date().toISOString();
    const prediction = {
      id: `prediction_${body.chainPredictionId ?? body.txHash}_${body.userId}`.replace(
        /[^a-zA-Z0-9_-]+/g,
        '_',
      ),
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
      status: 'ACTIVE',
      isCorrect: null,
      pointsEarned: 0,
      claimed: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.db
      .collection(MONGO_COLLECTIONS.predictions)
      .updateOne({ id: prediction.id }, { $set: prediction }, { upsert: true });

    await this.refreshPvPPairing(prediction.gameId);

    return { status: 'indexed', prediction };
  }

  async getUserPredictions(userIdentifiers: string | string[]): Promise<any[]> {
    const identifiers = Array.isArray(userIdentifiers)
      ? userIdentifiers
      : [userIdentifiers];
    const normalized = Array.from(
      new Set(
        identifiers
          .filter((value): value is string => typeof value === 'string' && Boolean(value))
          .flatMap((value) => [value, value.toLowerCase()]),
      ),
    );

    if (normalized.length === 0) return [];

    return this.db
      .collection(MONGO_COLLECTIONS.predictions)
      .find({
        $or: [
          { userId: { $in: normalized } },
          { walletAddress: { $in: normalized } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getGames(): Promise<any[]> {
    const games = await this.db
      .collection(MONGO_COLLECTIONS.gameEvents)
      .find()
      .toArray();
    for (const game of games) {
      const predictions = await this.db
        .collection(MONGO_COLLECTIONS.predictions)
        .find({ gameId: game.id })
        .toArray();
      const predictionSum = predictions.reduce(
        (sum, p) => sum + (p.amountUSDT || 0),
        0,
      );
      game.totalPool = predictionSum;

      const markets = await this.db
        .collection(MONGO_COLLECTIONS.markets)
        .find({ gameId: game.id })
        .toArray();
      game.marketCount = markets.length;
      game.openMarketCount = markets.filter((m) => m.status === 'OPEN').length;
    }
    return games;
  }

  async getGameById(id: string): Promise<any | null> {
    const game = await this.db
      .collection(MONGO_COLLECTIONS.gameEvents)
      .findOne({ id });
    if (!game) return null;
    const predictions = await this.db
      .collection(MONGO_COLLECTIONS.predictions)
      .find({ gameId: id })
      .toArray();
    const predictionSum = predictions.reduce(
      (sum, p) => sum + (p.amountUSDT || 0),
      0,
    );
    game.totalPool = predictionSum;

    const markets = await this.db
      .collection(MONGO_COLLECTIONS.markets)
      .find({ gameId: id })
      .toArray();
    game.marketCount = markets.length;
    game.openMarketCount = markets.filter((m) => m.status === 'OPEN').length;
    return game;
  }

  async getMarketsForGame(gameId: string): Promise<any[]> {
    const markets = await this.db
      .collection(MONGO_COLLECTIONS.markets)
      .find({ gameId })
      .toArray();
    for (const market of markets) {
      const predictions = await this.db
        .collection(MONGO_COLLECTIONS.predictions)
        .find({ marketId: market.id })
        .toArray();
      const predictionSum = predictions.reduce(
        (sum, p) => sum + (p.amountUSDT || 0),
        0,
      );
      market.totalPool = predictionSum;
    }
    return markets;
  }

  async pairPvP(gameEventId: string): Promise<any> {
    const matches = await this.refreshPvPPairing(gameEventId);
    return { paired: true, matchesCreated: matches.length, matches };
  }

  async resolvePvP(gameEventId: string): Promise<any> {
    const [matches, predictions] = await Promise.all([
      this.db
        .collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches)
        .find({ gameEventId, status: { $ne: 'RESOLVED' } })
        .toArray(),
      this.db
        .collection<Prediction>(MONGO_COLLECTIONS.predictions)
        .find({ gameId: gameEventId })
        .toArray(),
    ]);
    const resolvedAt = new Date().toISOString();

    for (const match of matches) {
      const playerAHits = this.countHits(predictions, match.playerAId);
      const playerBHits = match.playerBId
        ? this.countHits(predictions, match.playerBId)
        : 0;
      const result = this.getPvPResult(
        playerAHits,
        playerBHits,
        Boolean(match.playerBId),
      );
      const playerAPoints = this.getPvPPoints(result, true);
      const playerBPoints = match.playerBId
        ? this.getPvPPoints(result, false)
        : 0;

      await this.db
        .collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches)
        .updateOne(
          { id: match.id },
          {
            $set: {
              playerAHits,
              playerBHits,
              result,
              playerAPoints,
              playerBPoints,
              status: 'RESOLVED',
              resolvedAt,
            },
          },
        );

      await this.updateUserPvPStats(
        match.playerAId,
        predictions,
        result,
        true,
        playerAPoints,
      );
      if (match.playerBId) {
        await this.updateUserPvPStats(
          match.playerBId,
          predictions,
          result,
          false,
          playerBPoints,
        );
      }
    }

    return { resolved: true, matchesResolved: matches.length };
  }

  async getGamePvPMatches(gameId: string): Promise<any[]> {
    return this.db
      .collection(MONGO_COLLECTIONS.pvpMatches)
      .find({ gameEventId: gameId })
      .toArray();
  }

  async getGameNFTRewards(gameId: string): Promise<any[]> {
    return this.db
      .collection(MONGO_COLLECTIONS.nftRewards)
      .find({ gameId })
      .toArray();
  }

  private async refreshPvPPairing(gameEventId: string): Promise<PvPMatch[]> {
    const pvpCollection = this.db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches);
    const resolvedCount = await pvpCollection.countDocuments({
      gameEventId,
      status: 'RESOLVED',
    });

    if (resolvedCount > 0) {
      return pvpCollection.find({ gameEventId }).toArray();
    }

    const predictions = await this.db
      .collection<Prediction>(MONGO_COLLECTIONS.predictions)
      .find({ gameId: gameEventId })
      .toArray();
    const matches = pairEligibleUsersForPvP(gameEventId, predictions);

    await pvpCollection.deleteMany({ gameEventId, status: { $ne: 'RESOLVED' } });
    if (matches.length > 0) {
      await pvpCollection.insertMany(matches);
    }

    return matches;
  }

  private countHits(predictions: Prediction[], userId: string) {
    return predictions.filter(
      (prediction) => prediction.userId === userId && prediction.isCorrect,
    ).length;
  }

  private getPvPResult(
    playerAHits: number,
    playerBHits: number,
    hasOpponent: boolean,
  ): PvPResult {
    if (!hasOpponent) return 'BYE';
    if (playerAHits > playerBHits) return 'PLAYER_A_WIN';
    if (playerBHits > playerAHits) return 'PLAYER_B_WIN';
    return 'DRAW';
  }

  private getPvPPoints(result: PvPResult, isPlayerA: boolean) {
    if (result === 'DRAW' || result === 'BYE') return 50;
    if (result === 'PLAYER_A_WIN') return isPlayerA ? 100 : 30;
    return isPlayerA ? 30 : 100;
  }

  private async updateUserPvPStats(
    userId: string,
    predictions: Prediction[],
    result: PvPResult,
    isPlayerA: boolean,
    pointsEarned: number,
  ) {
    const existing = await this.db
      .collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats)
      .findOne({ userId });
    const current = existing ?? {
      userId,
      player:
        predictions.find((prediction) => prediction.userId === userId)
          ?.userName ?? getPlayerName(userId),
      totalPvPPoints: 0,
      rankTitle: 'Rookie',
      wins: 0,
      losses: 0,
      draws: 0,
      byes: 0,
      matchesPlayed: 0,
    };
    const delta = this.getRecordDelta(result, isPlayerA);
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

    await this.db
      .collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats)
      .updateOne({ userId }, { $set: next }, { upsert: true });
  }

  private getRecordDelta(result: PvPResult, isPlayerA: boolean) {
    const empty = { wins: 0, losses: 0, draws: 0, byes: 0 };
    if (result === 'BYE') return { ...empty, byes: 1 };
    if (result === 'DRAW') return { ...empty, draws: 1 };
    if (result === 'PLAYER_A_WIN')
      return isPlayerA ? { ...empty, wins: 1 } : { ...empty, losses: 1 };
    return isPlayerA ? { ...empty, losses: 1 } : { ...empty, wins: 1 };
  }
}
