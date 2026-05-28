import { Controller, Post, Body, Req, UseGuards, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrivyAuthGuard } from "@/common/auth/privy.guard";
import { ProfilesService } from "./profiles.service";
import { EventsGateway } from "@/common/events/events.gateway";

@Controller("api/profiles")
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @UseGuards(PrivyAuthGuard)
  async upsertProfile(@Req() req: any, @Body() body: any) {
    if (typeof body.userId !== "string" || !body.userId) {
      throw new BadRequestException("userId is required");
    }

    // Verify requesting user is updating their own profile
    if (req.user) {
      const isOwner = req.user.walletAddresses?.some(
        (addr: string) => addr.toLowerCase() === body.userId.toLowerCase()
      ) || req.user.userId.toLowerCase() === body.userId.toLowerCase();

      if (!isOwner) {
        throw new ForbiddenException("Not authorized to update this profile.");
      }
    }

    const profile = await this.profilesService.upsertUserProfile({
      userId: body.userId,
      walletAddress: typeof body.walletAddress === "string" ? body.walletAddress : undefined,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      handle: typeof body.handle === "string" ? body.handle : undefined,
      userTag: typeof body.userTag === "string" ? body.userTag : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      avatar: typeof body.avatar === "string" ? body.avatar : undefined,
      mode: body.mode === "update" ? "update" : "ensure",
    });

    this.eventsGateway.sendProfileUpdated(profile);

    return { status: "saved", profile };
  }
}
