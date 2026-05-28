import { Controller, Post, Get, Body, Req, UseGuards, Param, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrivyAuthGuard } from "@/common/auth/privy.guard";
import { XCupService } from "./xcup.service";
import { EventsGateway } from "@/common/events/events.gateway";

@Controller("api/xcup")
export class XCupController {
  constructor(
    private readonly xcupService: XCupService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Get("games")
  async getGames() {
    return this.xcupService.getGames();
  }

  @Get("games/:id")
  async getGame(@Param("id") id: string) {
    const game = await this.xcupService.getGameById(id);
    if (!game) {
      throw new NotFoundException("Game not found");
    }
    return game;
  }

  @Get("games/:id/markets")
  async getMarkets(@Param("id") id: string) {
    return this.xcupService.getMarketsForGame(id);
  }

  @Get("games/:id/pvp")
  async getGamePvP(@Param("id") id: string) {
    return this.xcupService.getGamePvPMatches(id);
  }

  @Get("games/:id/rewards")
  async getGameRewards(@Param("id") id: string) {
    return this.xcupService.getGameNFTRewards(id);
  }


  @Get("predictions")
  @UseGuards(PrivyAuthGuard)
  async getUserPredictions(@Req() req: any) {
    const userId = req.user.userId;
    return this.xcupService.getUserPredictions(userId);
  }

  @Post("predictions")
  @UseGuards(PrivyAuthGuard)
  async indexPrediction(@Req() req: any, @Body() body: any) {
    const issues = this.validatePredictionBody(body);
    if (issues.length > 0) {
      throw new BadRequestException({ status: "rejected", issues });
    }

    // Verify requesting user matches prediction user
    if (req.user) {
      const isOwner = req.user.walletAddresses?.some(
        (addr: string) => addr.toLowerCase() === body.userId.toLowerCase()
      ) || req.user.userId.toLowerCase() === body.userId.toLowerCase();

      if (!isOwner) {
        throw new ForbiddenException("Not authorized to index this prediction.");
      }
    }

    const result = await this.xcupService.indexPrediction(body);
    if (result.status === "indexed") {
      this.eventsGateway.sendPredictionUpdated(result.prediction);
    }
    return result;
  }

  @Post("pvp/pair")
  async pairPvP(@Body() body: any) {
    const gameEventId = typeof body.gameEventId === "string" ? body.gameEventId : "";
    if (!gameEventId) {
      throw new BadRequestException("gameEventId is required");
    }
    return this.xcupService.pairPvP(gameEventId);
  }

  @Post("pvp/resolve")
  async resolvePvP(@Body() body: any) {
    const gameEventId = typeof body.gameEventId === "string" ? body.gameEventId : "";
    if (!gameEventId) {
      throw new BadRequestException("gameEventId is required");
    }
    return this.xcupService.resolvePvP(gameEventId);
  }

  private validatePredictionBody(body: Record<string, any>) {
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
}
