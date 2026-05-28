import { Controller, Get, Query } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";

@Controller("api/leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query("eventId") eventId?: string) {
    const entries = await this.leaderboardService.getLeaderboard(eventId);
    return {
      eventId: eventId ?? null,
      entries,
    };
  }
}
