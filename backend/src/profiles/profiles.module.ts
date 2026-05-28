import { Module } from "@nestjs/common";
import { AuthModule } from "@/common/auth/auth.module";
import { EventsModule } from "@/common/events/events.module";
import { ProfilesService } from "./profiles.service";
import { ProfilesController } from "./profiles.controller";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
