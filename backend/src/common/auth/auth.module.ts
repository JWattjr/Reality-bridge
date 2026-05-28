import { Module } from "@nestjs/common";
import { PrivyAuthGuard } from "./privy.guard";

@Module({
  providers: [PrivyAuthGuard],
  exports: [PrivyAuthGuard],
})
export class AuthModule {}
