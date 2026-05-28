import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./common/database/database.module";
import { AuthModule } from "./common/auth/auth.module";
import { EventsModule } from "./common/events/events.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { WalletModule } from "./wallet/wallet.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { XCupModule } from "./xcup/xcup.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    EventsModule,
    ProfilesModule,
    WalletModule,
    LeaderboardModule,
    XCupModule,
    AdminModule,
    // Enforce 100 requests per minute by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
