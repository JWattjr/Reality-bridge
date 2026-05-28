import { Injectable, Inject } from "@nestjs/common";
import { Db } from "mongodb";
import { MONGO_COLLECTIONS } from "@/common/database/collections";

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject("DATABASE_CONNECTION")
    private readonly db: Db,
  ) {}

  async getLeaderboard(eventId?: string) {
    try {
      if (eventId) {
        // Match-specific leaderboard
        const predictions = await this.db
          .collection(MONGO_COLLECTIONS.predictions)
          .find({ gameId: eventId })
          .toArray();

        const userIds = [...new Set(predictions.map((p) => p.userId))];
        const users = await this.db
          .collection(MONGO_COLLECTIONS.users)
          .find({ id: { $in: userIds } })
          .toArray();
        const userMap = new Map(users.map((u) => [u.id, u]));

        const grouped = new Map<string, any>();
        for (const pick of predictions) {
          const current = grouped.get(pick.userId) ?? {
            userId: pick.userId,
            player: userMap.get(pick.userId)?.displayName ?? userMap.get(pick.userId)?.handle ?? this.shortenUserId(pick.userId),
            points: 0,
            totalPicks: 0,
            correctPicks: 0,
            winningsUSDT: 0,
            finalPickAt: pick.createdAt,
          };

          current.points += (pick.pointsEarned ?? 0);
          current.totalPicks += 1;
          current.correctPicks += pick.isCorrect ? 1 : 0;
          current.winningsUSDT += pick.winningsUSDT ?? 0;
          if (new Date(pick.createdAt) > new Date(current.finalPickAt)) {
            current.finalPickAt = pick.createdAt;
          }
          grouped.set(pick.userId, current);
        }

        return [...grouped.values()]
          .sort(
            (a, b) =>
              b.points - a.points ||
              b.winningsUSDT - a.winningsUSDT ||
              new Date(a.finalPickAt).getTime() - new Date(b.finalPickAt).getTime()
          )
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
            nftReward: index === 0 ? "Eligible" : undefined,
          }));
      }

      // Global PvP leaderboard
      const stats = await this.db
        .collection(MONGO_COLLECTIONS.userPvPStats)
        .find({})
        .toArray();

      return stats
        .sort((a, b) => b.totalPvPPoints - a.totalPvPPoints || b.wins - a.wins || a.player.localeCompare(b.player))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
    } catch (error) {
      console.error("Failed to retrieve leaderboard from database", error);
      return [];
    }
  }

  private shortenUserId(userId: string) {
    return userId.length > 12 ? `${userId.slice(0, 6)}...${userId.slice(-4)}` : userId;
  }

}
