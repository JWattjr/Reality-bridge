import { Module } from "@nestjs/common";
import { AuthModule } from "@/common/auth/auth.module";
import { EventsModule } from "@/common/events/events.module";
import { XCupService } from "./xcup.service";
import { XCupController } from "./xcup.controller";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [XCupController],
  providers: [XCupService],
  exports: [XCupService],
})
export class XCupModule {}
