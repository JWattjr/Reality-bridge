import { Controller, Post, Body, UseGuards, BadRequestException } from "@nestjs/common";
import { AdminGuard } from "@/common/auth/admin.guard";
import { AdminService } from "./admin.service";

@Controller("api/admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("login")
  async login() {
    return { success: true };
  }

  @Post("resolve-market")
  async resolveMarket(@Body() body: { marketId: string; winningOptionIndex: number }) {
    if (!body.marketId || body.winningOptionIndex === undefined) {
      throw new BadRequestException("marketId and winningOptionIndex are required");
    }
    return this.adminService.resolveMarket(body.marketId, Number(body.winningOptionIndex));
  }

  @Post("pair-pvp")
  async pairPvP(@Body() body: { gameId: string }) {
    if (!body.gameId) {
      throw new BadRequestException("gameId is required");
    }
    return this.adminService.pairPvP(body.gameId);
  }

  @Post("resolve-pvp")
  async resolvePvP(@Body() body: { gameId: string }) {
    if (!body.gameId) {
      throw new BadRequestException("gameId is required");
    }
    return this.adminService.resolvePvP(body.gameId);
  }
}
