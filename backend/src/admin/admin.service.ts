import { Injectable, Inject, BadRequestException, NotFoundException } from "@nestjs/common";
import { Db } from "mongodb";
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MONGO_COLLECTIONS } from "@/common/database/collections";
import { EventsGateway } from "@/common/events/events.gateway";
import {
  pairEligibleUsersForPvP,
  getPvPRankTitle,
  type Prediction,
  type PvPMatch,
  type PvPResult,
  type UserPvPStats
} from "@/shared/football-data";

const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech/terigon"] },
  },
});

const contractAbi = parseAbi([
  "function resolveMarket(uint256 marketId, uint256 winningOption) external"
]);

@Injectable()
export class AdminService {
  constructor(
    @Inject("DATABASE_CONNECTION")
    private readonly db: Db,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async resolveMarket(marketId: string, winningOptionIndex: number) {
    const market = await this.db.collection(MONGO_COLLECTIONS.markets).findOne({ id: marketId });
    if (!market) {
      throw new NotFoundException(`Market not found: ${marketId}`);
    }

    if (winningOptionIndex < 0 || winningOptionIndex >= market.options.length) {
      throw new BadRequestException(`Invalid winningOptionIndex ${winningOptionIndex}`);
    }

    const winningOption = market.options[winningOptionIndex];

    // 1. Perform On-Chain Settlement
    const adminPrivateKey = (process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}` | undefined;
    const gameContractAddr = process.env.FOOTBALL_PREDICTION_ADDRESS as `0x${string}`;
    const rpcUrl = process.env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon";

    let txHash = "";

    if (adminPrivateKey && gameContractAddr) {
      try {
        const account = privateKeyToAccount(adminPrivateKey);
        const publicClient = createPublicClient({
          chain: xLayerTestnet,
          transport: http(rpcUrl),
        });
        const walletClient = createWalletClient({
          account,
          chain: xLayerTestnet,
          transport: http(rpcUrl),
        });

        const hash = await walletClient.writeContract({
          address: gameContractAddr,
          abi: contractAbi,
          functionName: "resolveMarket",
          args: [BigInt(market.chainMarketId), BigInt(winningOptionIndex)]
        });
        txHash = hash;

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (error: any) {
        console.error("On-chain resolution failed:", error);
        throw new BadRequestException(`On-chain transaction failed: ${error.message || error}`);
      }
    }

    // 2. Update Market in Database
    await this.db.collection(MONGO_COLLECTIONS.markets).updateOne(
      { id: marketId },
      { $set: { status: "RESOLVED", winningOptionId: winningOption.id } }
    );

    // 3. Fetch and Settle Predictions in Database
    const predictions = await this.db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ marketId }).toArray();
    
    const totalPool = predictions.reduce((sum, p) => sum + (p.amountUSDT || 0), 0);
    const winningStakes = predictions
      .filter((p) => p.optionId === winningOption.id)
      .reduce((sum, p) => sum + (p.amountUSDT || 0), 0);

    for (const pred of predictions) {
      const isCorrect = pred.optionId === winningOption.id;
      const pointsEarned = isCorrect ? 1 : 0;
      let winningsUSDT = 0;

      if (isCorrect && winningStakes > 0) {
        winningsUSDT = (pred.amountUSDT * totalPool) / winningStakes;
      }

      await this.db.collection(MONGO_COLLECTIONS.predictions).updateOne(
        { id: pred.id },
        {
          $set: {
            status: isCorrect ? "WON" : "LOST",
            isCorrect,
            pointsEarned,
            winningsUSDT,
          }
        }
      );
    }

    // 4. Trigger PvP Battles pairing & resolution for the associated game event
    const gameEventId = market.gameId;
    await this.pairAndResolvePvP(gameEventId);

    // 5. Emit live WebSocket update to invalidate frontend queries
    this.eventsGateway.sendPredictionUpdated({
      marketId,
      status: "RESOLVED",
      winningOptionId: winningOption.id,
      txHash,
    });

    return {
      success: true,
      txHash,
      marketId,
      winningOptionId: winningOption.id,
    };
  }

  async pairPvP(gameEventId: string) {
    const existingPvPCount = await this.db.collection(MONGO_COLLECTIONS.pvpMatches).countDocuments({ gameEventId });
    if (existingPvPCount > 0) {
      return { success: false, message: "PvP pairing already exists for this game." };
    }

    const allGamePredictions = await this.db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ gameId: gameEventId }).toArray();
    const matches = pairEligibleUsersForPvP(gameEventId, allGamePredictions);
    if (matches.length > 0) {
      await this.db.collection(MONGO_COLLECTIONS.pvpMatches).insertMany(matches);
    }

    this.eventsGateway.sendPredictionUpdated({ gameId: gameEventId, action: "pair-pvp" });
    return { success: true, matchesCreated: matches.length };
  }

  async resolvePvP(gameEventId: string) {
    const predictions = await this.db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ gameId: gameEventId }).toArray();
    const pvpMatches = await this.db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches).find({ gameEventId, status: { $ne: "RESOLVED" } }).toArray();
    
    if (pvpMatches.length === 0) {
      return { success: false, message: "No unresolved PvP matches found for this game." };
    }

    const resolvedAt = new Date().toISOString();
    for (const match of pvpMatches) {
      const countHits = (userId: string) => {
        return predictions.filter((p) => p.userId === userId && p.isCorrect).length;
      };

      const playerAHits = countHits(match.playerAId);
      const playerBHits = match.playerBId ? countHits(match.playerBId) : 0;
      
      const getPvPResult = (pAHits: number, pBHits: number, hasOpponent: boolean): PvPResult => {
        if (!hasOpponent) return "BYE";
        if (pAHits > pBHits) return "PLAYER_A_WIN";
        if (pBHits > pAHits) return "PLAYER_B_WIN";
        return "DRAW";
      };

      const getPvPPoints = (res: PvPResult, isPlayerA: boolean) => {
        if (res === "DRAW" || res === "BYE") return 50;
        if (res === "PLAYER_A_WIN") return isPlayerA ? 100 : 30;
        return isPlayerA ? 30 : 100;
      };

      const result = getPvPResult(playerAHits, playerBHits, Boolean(match.playerBId));
      const playerAPoints = getPvPPoints(result, true);
      const playerBPoints = match.playerBId ? getPvPPoints(result, false) : 0;

      await this.db.collection(MONGO_COLLECTIONS.pvpMatches).updateOne(
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
          }
        }
      );

      const updateUserPvPStats = async (userId: string, isPlayerA: boolean, points: number) => {
        const existingStats = await this.db.collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats).findOne({ userId });
        const user = await this.db.collection(MONGO_COLLECTIONS.users).findOne({ id: userId });
        const playerName = user?.displayName ?? user?.handle ?? userId;

        const current = existingStats ?? {
          userId,
          player: playerName,
          totalPvPPoints: 0,
          rankTitle: "Rookie",
          wins: 0,
          losses: 0,
          draws: 0,
          byes: 0,
          matchesPlayed: 0,
        };

        const empty = { wins: 0, losses: 0, draws: 0, byes: 0 };
        const getRecordDelta = (res: PvPResult, isA: boolean) => {
          if (res === "BYE") return { ...empty, byes: 1 };
          if (res === "DRAW") return { ...empty, draws: 1 };
          if (res === "PLAYER_A_WIN") return isA ? { ...empty, wins: 1 } : { ...empty, losses: 1 };
          return isA ? { ...empty, losses: 1 } : { ...empty, wins: 1 };
        };

        const delta = getRecordDelta(result, isPlayerA);
        const next = {
          ...current,
          totalPvPPoints: current.totalPvPPoints + points,
          wins: current.wins + delta.wins,
          losses: current.losses + delta.losses,
          draws: current.draws + delta.draws,
          byes: current.byes + delta.byes,
          matchesPlayed: current.matchesPlayed + 1,
        };
        next.rankTitle = getPvPRankTitle(next.totalPvPPoints);

        await this.db.collection(MONGO_COLLECTIONS.userPvPStats).updateOne(
          { userId },
          { $set: next },
          { upsert: true }
        );
      };

      await updateUserPvPStats(match.playerAId, true, playerAPoints);
      if (match.playerBId) {
        await updateUserPvPStats(match.playerBId, false, playerBPoints);
      }
    }

    this.eventsGateway.sendPredictionUpdated({ gameId: gameEventId, action: "resolve-pvp" });
    return { success: true, matchesResolved: pvpMatches.length };
  }

  private async pairAndResolvePvP(gameEventId: string) {
    try {
      // 1. Run Pairing if not done
      const existingPvPCount = await this.db.collection(MONGO_COLLECTIONS.pvpMatches).countDocuments({ gameEventId });
      if (existingPvPCount === 0) {
        const allGamePredictions = await this.db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ gameId: gameEventId }).toArray();
        const matches = pairEligibleUsersForPvP(gameEventId, allGamePredictions);
        if (matches.length > 0) {
          await this.db.collection(MONGO_COLLECTIONS.pvpMatches).insertMany(matches);
        }
      }

      // 2. Resolve matches
      const predictions = await this.db.collection<Prediction>(MONGO_COLLECTIONS.predictions).find({ gameId: gameEventId }).toArray();
      const pvpMatches = await this.db.collection<PvPMatch>(MONGO_COLLECTIONS.pvpMatches).find({ gameEventId, status: { $ne: "RESOLVED" } }).toArray();
      
      const resolvedAt = new Date().toISOString();
      for (const match of pvpMatches) {
        const countHits = (userId: string) => {
          return predictions.filter((p) => p.userId === userId && p.isCorrect).length;
        };

        const playerAHits = countHits(match.playerAId);
        const playerBHits = match.playerBId ? countHits(match.playerBId) : 0;
        
        const getPvPResult = (pAHits: number, pBHits: number, hasOpponent: boolean): PvPResult => {
          if (!hasOpponent) return "BYE";
          if (pAHits > pBHits) return "PLAYER_A_WIN";
          if (pBHits > pAHits) return "PLAYER_B_WIN";
          return "DRAW";
        };

        const getPvPPoints = (res: PvPResult, isPlayerA: boolean) => {
          if (res === "DRAW" || res === "BYE") return 50;
          if (res === "PLAYER_A_WIN") return isPlayerA ? 100 : 30;
          return isPlayerA ? 30 : 100;
        };

        const result = getPvPResult(playerAHits, playerBHits, Boolean(match.playerBId));
        const playerAPoints = getPvPPoints(result, true);
        const playerBPoints = match.playerBId ? getPvPPoints(result, false) : 0;

        await this.db.collection(MONGO_COLLECTIONS.pvpMatches).updateOne(
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
            }
          }
        );

        const updateUserPvPStats = async (userId: string, isPlayerA: boolean, points: number) => {
          const existingStats = await this.db.collection<UserPvPStats>(MONGO_COLLECTIONS.userPvPStats).findOne({ userId });
          const user = await this.db.collection(MONGO_COLLECTIONS.users).findOne({ id: userId });
          const playerName = user?.displayName ?? user?.handle ?? userId;

          const current = existingStats ?? {
            userId,
            player: playerName,
            totalPvPPoints: 0,
            rankTitle: "Rookie",
            wins: 0,
            losses: 0,
            draws: 0,
            byes: 0,
            matchesPlayed: 0,
          };

          const empty = { wins: 0, losses: 0, draws: 0, byes: 0 };
          const getRecordDelta = (res: PvPResult, isA: boolean) => {
            if (res === "BYE") return { ...empty, byes: 1 };
            if (res === "DRAW") return { ...empty, draws: 1 };
            if (res === "PLAYER_A_WIN") return isA ? { ...empty, wins: 1 } : { ...empty, losses: 1 };
            return isA ? { ...empty, losses: 1 } : { ...empty, wins: 1 };
          };

          const delta = getRecordDelta(result, isPlayerA);
          const next = {
            ...current,
            totalPvPPoints: current.totalPvPPoints + points,
            wins: current.wins + delta.wins,
            losses: current.losses + delta.losses,
            draws: current.draws + delta.draws,
            byes: current.byes + delta.byes,
            matchesPlayed: current.matchesPlayed + 1,
          };
          next.rankTitle = getPvPRankTitle(next.totalPvPPoints);

          await this.db.collection(MONGO_COLLECTIONS.userPvPStats).updateOne(
            { userId },
            { $set: next },
            { upsert: true }
          );
        };

        await updateUserPvPStats(match.playerAId, true, playerAPoints);
        if (match.playerBId) {
          await updateUserPvPStats(match.playerBId, false, playerBPoints);
        }
      }
    } catch (err) {
      console.error("Auto PvP resolution failed during market resolution:", err);
    }
  }
}
