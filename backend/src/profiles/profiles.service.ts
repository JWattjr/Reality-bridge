import { Injectable, Inject } from "@nestjs/common";
import { Db } from "mongodb";
import { MONGO_COLLECTIONS } from "@/common/database/collections";

export interface UserProfile {
  id: string;
  privyUserId?: string;
  walletAddress?: string;
  handle: string;
  displayName: string;
  userTag: string;
  bio?: string;
  avatar?: string;
}

type UserProfileRow = {
  id: string;
  privyUserId: string | null;
  walletAddress: string | null;
  handle: string;
  displayName: string;
  userTag: string;
  bio: string | null;
  avatar: string | null;
};

@Injectable()
export class ProfilesService {
  constructor(
    @Inject("DATABASE_CONNECTION")
    private readonly db: Db,
  ) {}

  async findUserProfile(userId: string): Promise<UserProfile | null> {
    const data = await this.db.collection<UserProfileRow>(MONGO_COLLECTIONS.users).findOne({ id: userId });
    return data ? this.profileFromRow(data) : null;
  }

  async upsertUserProfile(input: {
    userId: string;
    walletAddress?: string;
    displayName?: string;
    handle?: string;
    userTag?: string;
    bio?: string;
    avatar?: string;
    mode?: "ensure" | "update";
  }): Promise<UserProfile> {
    const mode = input.mode ?? "ensure";
    const existing = await this.findUserProfile(input.userId);
    const profile: UserProfile = existing ?? {
      id: input.userId,
      privyUserId: input.userId.startsWith("did:privy") ? input.userId : undefined,
      walletAddress: input.walletAddress,
      handle: `user-${this.stableSegment(input.userId).slice(0, 6)}`,
      displayName: input.displayName ?? "ProofPlayer",
      userTag: `PP-${this.stableSegment(input.userId).slice(0, 6).toUpperCase()}`,
      bio: "ProofPlay attendee",
      avatar: this.initialsFor(input.displayName ?? "ProofPlayer"),
    };

    const nextProfile: UserProfile = {
      ...profile,
      walletAddress: input.walletAddress ?? profile.walletAddress,
      displayName: mode === "update" ? this.normalizeDisplayName(input.displayName, profile.displayName) : profile.displayName,
      handle: mode === "update" ? this.normalizeHandle(input.handle, profile.handle) : profile.handle,
      userTag: mode === "update" ? this.normalizeUserTag(input.userTag, profile.userTag) : profile.userTag,
      bio: mode === "update" ? this.normalizeBio(input.bio, profile.bio) : profile.bio,
      avatar: mode === "update"
        ? this.normalizeAvatar(input.avatar, profile.avatar, input.displayName ?? profile.displayName)
        : this.normalizeAvatar(undefined, profile.avatar, profile.displayName),
    };

    await this.db.collection(MONGO_COLLECTIONS.users).updateOne(
      { id: input.userId },
      { $set: this.profileToRow(nextProfile) },
      { upsert: true }
    );

    return nextProfile;
  }

  private normalizeDisplayName(value: string | undefined, fallback: string) {
    const normalized = value?.trim().replace(/\s+/g, " ");
    return normalized ? normalized.slice(0, 40) : fallback;
  }

  private normalizeHandle(value: string | undefined, fallback: string) {
    const normalized = value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalized && normalized.length >= 3 ? normalized.slice(0, 24) : fallback;
  }

  private normalizeUserTag(value: string | undefined, fallback: string) {
    const normalized = value
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!normalized) return fallback;

    const withPrefix = normalized.startsWith("PP-") ? normalized : `PP-${normalized}`;
    return withPrefix.slice(0, 18);
  }

  private normalizeBio(value: string | undefined, fallback: string | undefined) {
    const normalized = value?.trim().replace(/\s+/g, " ");
    return normalized ? normalized.slice(0, 140) : fallback;
  }

  private normalizeAvatar(value: string | undefined, fallback: string | undefined, displayName: string) {
    const normalized = value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
    const fallbackAvatar = fallback?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
    return normalized ? normalized.slice(0, 3) : fallbackAvatar ? fallbackAvatar.slice(0, 3) : this.initialsFor(displayName);
  }

  private initialsFor(displayName: string) {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
    return initials || "PP";
  }

  private stableSegment(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString(16);
  }

  private profileToRow(profile: UserProfile): UserProfileRow {
    return {
      id: profile.id,
      privyUserId: profile.privyUserId ?? null,
      walletAddress: profile.walletAddress ?? null,
      handle: profile.handle,
      displayName: profile.displayName,
      userTag: profile.userTag,
      bio: profile.bio ?? null,
      avatar: profile.avatar ?? null,
    };
  }

  private profileFromRow(row: UserProfileRow): UserProfile {
    return {
      id: row.id,
      privyUserId: row.privyUserId ?? undefined,
      walletAddress: row.walletAddress ?? undefined,
      handle: row.handle,
      displayName: row.displayName,
      userTag: row.userTag,
      bio: row.bio ?? undefined,
      avatar: row.avatar ?? undefined,
    };
  }
}
