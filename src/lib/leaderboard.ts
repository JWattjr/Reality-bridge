import { listUserProfiles, type UserProfile } from "@/lib/community-store";
import { getLevelForXp, type LeaderboardEntry } from "@/lib/mock-data";
import { readProofRecords } from "@/lib/proof-store";

export async function readLeaderboard(eventId?: string): Promise<LeaderboardEntry[]> {
  const [proofs, profiles] = await Promise.all([
    readProofRecords(),
    listUserProfiles(),
  ]);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const grouped = new Map<string, { xp: number; missionIds: Set<string> }>();

  for (const proof of proofs) {
    if (proof.status !== "validated") continue;
    if (eventId && proof.eventId !== eventId) continue;

    const current = grouped.get(proof.userId) ?? { xp: 0, missionIds: new Set<string>() };
    current.xp += proof.xpEarned;
    current.missionIds.add(proof.missionId);
    grouped.set(proof.userId, current);
  }

  const entries = [...grouped.entries()].map(([userId, score]) =>
    entryFromScore(userId, score, profileById.get(userId))
  );

  const seedUsers: LeaderboardEntry[] = [
    { rank: 0, userId: "seed_1", name: "David O.", avatar: "DO", xp: 480, missionsCompleted: 5, level: getLevelForXp(480).level },
    { rank: 0, userId: "seed_2", name: "Sarah M.", avatar: "SM", xp: 350, missionsCompleted: 4, level: getLevelForXp(350).level },
    { rank: 0, userId: "seed_3", name: "Chen W.", avatar: "CW", xp: 210, missionsCompleted: 2, level: getLevelForXp(210).level },
    { rank: 0, userId: "seed_4", name: "Amara K.", avatar: "AK", xp: 150, missionsCompleted: 2, level: getLevelForXp(150).level },
    { rank: 0, userId: "seed_5", name: "James L.", avatar: "JL", xp: 90, missionsCompleted: 1, level: getLevelForXp(90).level },
  ];

  for (const seed of seedUsers) {
    if (!entries.some((e) => e.userId === seed.userId)) {
      entries.push(seed);
    }
  }

  return entries
    .sort((a, b) => b.xp - a.xp || b.missionsCompleted - a.missionsCompleted)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function entryFromScore(
  userId: string,
  score: { xp: number; missionIds: Set<string> },
  profile?: UserProfile,
): LeaderboardEntry {
  const levelInfo = getLevelForXp(score.xp);
  const fallbackName = readableUserId(userId);

  return {
    rank: 0,
    userId,
    name: profile?.displayName ?? fallbackName,
    avatar: profile?.avatar ?? initialsFor(profile?.displayName ?? fallbackName),
    xp: score.xp,
    missionsCompleted: score.missionIds.size,
    level: levelInfo.level,
  };
}

function readableUserId(userId: string) {
  if (userId.startsWith("0x") && userId.length > 12) {
    return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
  }

  return userId.length > 18 ? `${userId.slice(0, 8)}...${userId.slice(-4)}` : userId;
}

function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "PP";
}
