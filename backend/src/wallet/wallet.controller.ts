import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { WalletService } from "./wallet.service";

@Controller("api/wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("balance")
  async getBalance(@Query("address") address: string) {
    if (!address) {
      throw new BadRequestException("address is required");
    }

    try {
      const balance = await this.walletService.getBalance(address);
      return { status: "ok", balance };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Could not read X Layer balance",
      );
    }
  }
}
