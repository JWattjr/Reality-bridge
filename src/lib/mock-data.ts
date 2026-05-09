// ========================================
// ProofPlay Data Layer
// ========================================

export type MissionType = "qr" | "nfc" | "text" | "photo" | "manual";
export type ProofType = "qr_scan" | "nfc_tap" | "organizer_approval" | "photo_upload" | "quiz_code";
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export type MissionStatus = "available" | "completed" | "locked";

export interface StorageReference {
  provider: "0G Storage";
  network: "0G Mainnet" | "0G Testnet";
  chainId: number;
  contractAddress: string;
  rootHash: string;
  txHash?: string;
  txHashes?: string[];
  txSeq?: number;
  txSeqs?: number[];
  storageRef: string;
  explorerUrl?: string;
  uploadedAt: string;
  encrypted?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  totalXp: number;
  level: number;
  eventsAttended: number;
  missionsCompleted: number;
  badgesEarned: number;
  joinedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  organizer: string;
  category: string;
  attendees: number;
  maxAttendees: number;
  missions: number;
  color: string;
  emoji: string;
  checkedIn: boolean;
}

export interface Mission {
  id: string;
  eventId: string;
  title: string;
  description: string;
  type: MissionType;
  proofType: ProofType;
  proofLocation?: string;
  xpReward: number;
  badgeReward?: string;
  status: MissionStatus;
  sponsorTag?: string;
  completedAt?: string;
  proofRecordId?: string;
  completionCount: number;
  maxCompletions: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: BadgeRarity;
  eventName: string;
  earnedAt: string;
  color: string;
  proofRecordId?: string;
  metadataStorageRef?: StorageReference;
}

export interface ProofRecord {
  id: string;
  eventId: string;
  userId: string;
  missionId: string;
  proofType: ProofType;
  timestamp: string;
  location: string;
  xpEarned: number;
  validator: "backend" | "organizer";
  status: "validated" | "pending_review";
  evidenceLabel: string;
  storage: StorageReference;
  mediaStorage?: StorageReference;
  badgeId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  xp: number;
  missionsCompleted: number;
  level: number;
}

export const XP_LEVELS = [
  { level: 1, minXp: 0, title: "Newcomer" },
  { level: 2, minXp: 100, title: "Explorer" },
  { level: 3, minXp: 300, title: "Participant" },
  { level: 4, minXp: 700, title: "Contributor" },
  { level: 5, minXp: 1500, title: "Champion" },
  { level: 6, minXp: 3000, title: "Legend" },
  { level: 7, minXp: 6000, title: "Mythic" },
];

export function getLevelForXp(xp: number) {
  let current = XP_LEVELS[0];
  for (const level of XP_LEVELS) {
    if (xp >= level.minXp) current = level;
    else break;
  }
  const nextLevel = XP_LEVELS.find((level) => level.level === current.level + 1);
  const progress = nextLevel
    ? ((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100
    : 100;
  return { ...current, progress, nextLevel };
}

export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case "common":
      return "var(--color-pastel-blue)";
    case "rare":
      return "var(--color-pastel-purple)";
    case "epic":
      return "var(--color-pastel-pink)";
    case "legendary":
      return "var(--color-pastel-yellow)";
  }
}

export function getMissionTypeIcon(type: MissionType): string {
  switch (type) {
    case "qr":
      return "QR";
    case "nfc":
      return "NFC";
    case "text":
      return "CODE";
    case "photo":
      return "IMG";
    case "manual":
      return "OK";
  }
}

export const PROOF_TYPE_COPY: Record<ProofType, { label: string; action: string; storedAs: string }> = {
  qr_scan: {
    label: "QR verification",
    action: "Scan QR",
    storedAs: "mission proof JSON",
  },
  nfc_tap: {
    label: "NFC verification",
    action: "Tap NFC",
    storedAs: "mission proof JSON",
  },
  organizer_approval: {
    label: "Organizer approval",
    action: "Verify",
    storedAs: "approval proof JSON",
  },
  photo_upload: {
    label: "Photo proof",
    action: "Upload photo",
    storedAs: "proof JSON + media",
  },
  quiz_code: {
    label: "Quiz/code word",
    action: "Enter code",
    storedAs: "quiz proof JSON",
  },
};

export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function getProofRecordForMission(missionId: string) {
  return PROOF_RECORDS.find((proof) => proof.missionId === missionId);
}

export function getProofRecordById(proofRecordId?: string) {
  return PROOF_RECORDS.find((proof) => proof.id === proofRecordId);
}

export const CURRENT_USER: User = {
  id: "user_1",
  name: "Alex Rivera",
  avatar: "AR",
  bio: "ProofPlay attendee building real-world reputation from verified contribution.",
  totalXp: 1240,
  level: 4,
  eventsAttended: 12,
  missionsCompleted: 47,
  badgesEarned: 23,
  joinedAt: "2025-09-15",
};

export const EVENTS: Event[] = [
  {
    id: "evt_1",
    title: "BlockNova Event",
    description: "A Lagos event where attendees prove venue check-in, booth visits, new connections, BlockNova knowledge, sponsor merch collection, and their best venue photo.",
    location: "Lagos, Nigeria",
    startDate: "May 15, 2026",
    endDate: "May 15, 2026",
    organizer: "BlockNova",
    category: "Community",
    attendees: 0,
    maxAttendees: 500,
    missions: 6,
    color: "var(--color-pastel-purple)",
    emoji: "BN",
    checkedIn: false,
  },
];

export const MISSIONS: Mission[] = [
  {
    id: "m1",
    eventId: "evt_1",
    title: "Check in at entrance",
    description: "Scan the venue entrance QR code when you arrive at BlockNova.",
    type: "qr",
    proofType: "qr_scan",
    proofLocation: "BlockNova Entrance",
    xpReward: 50,
    badgeReward: "badge_checkin",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
  {
    id: "m2",
    eventId: "evt_1",
    title: "Connect with 3 other attendees",
    description: "Connect with three people on ground who are not already in your friend list.",
    type: "manual",
    proofType: "organizer_approval",
    proofLocation: "BlockNova Venue",
    xpReward: 120,
    badgeReward: "badge_connector",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
  {
    id: "m3",
    eventId: "evt_1",
    title: "Scan QR code at Superteam booth",
    description: "Visit the Superteam booth and scan their mission QR code.",
    type: "qr",
    proofType: "qr_scan",
    proofLocation: "Superteam Booth",
    xpReward: 80,
    sponsorTag: "Superteam",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
  {
    id: "m4",
    eventId: "evt_1",
    title: "Test your knowledge on BlockNova",
    description: "Enter the BlockNova quiz or speaker code to prove what you learned.",
    type: "text",
    proofType: "quiz_code",
    proofLocation: "BlockNova Quiz",
    xpReward: 100,
    badgeReward: "badge_quiz",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
  {
    id: "m5",
    eventId: "evt_1",
    title: "Collect any sponsor Merch",
    description: "Upload a quick proof photo of any sponsor merch you collected.",
    type: "photo",
    proofType: "photo_upload",
    proofLocation: "Sponsor Booths",
    xpReward: 90,
    badgeReward: "badge_merch",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
  {
    id: "m6",
    eventId: "evt_1",
    title: "Upload the best picture you took at the venue",
    description: "Share your best BlockNova venue photo as proof media.",
    type: "photo",
    proofType: "photo_upload",
    proofLocation: "BlockNova Venue",
    xpReward: 110,
    badgeReward: "badge_photo",
    status: "available",
    completionCount: 0,
    maxCompletions: 1,
  },
];

// Real proof records are returned by /api/proofs after successful 0G uploads.
export const PROOF_RECORDS: ProofRecord[] = [];

export const BADGES: Badge[] = [
  { id: "badge_checkin", name: "BlockNova Arrival", description: "Checked in at the BlockNova entrance", emoji: "IN", rarity: "common", eventName: "BlockNova Event", earnedAt: "2026-05-15", color: "var(--color-pastel-blue)" },
  { id: "badge_connector", name: "On-Ground Connector", description: "Connected with 3 new attendees", emoji: "3X", rarity: "rare", eventName: "BlockNova Event", earnedAt: "2026-05-15", color: "var(--color-pastel-green)" },
  { id: "badge_quiz", name: "BlockNova Brain", description: "Passed the BlockNova knowledge check", emoji: "QA", rarity: "rare", eventName: "BlockNova Event", earnedAt: "2026-05-15", color: "var(--color-pastel-purple)" },
  { id: "badge_merch", name: "Merch Claimer", description: "Collected sponsor merch", emoji: "MC", rarity: "common", eventName: "BlockNova Event", earnedAt: "2026-05-15", color: "var(--color-pastel-pink)" },
  { id: "badge_photo", name: "Venue Lens", description: "Uploaded the best venue photo", emoji: "PX", rarity: "epic", eventName: "BlockNova Event", earnedAt: "2026-05-15", color: "var(--color-pastel-yellow)" },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "user_9", name: "Sophia Chen", avatar: "SC", xp: 2850, missionsCompleted: 18, level: 5 },
  { rank: 2, userId: "user_5", name: "Marcus Johnson", avatar: "MJ", xp: 2340, missionsCompleted: 16, level: 5 },
  { rank: 3, userId: "user_12", name: "Aisha Bello", avatar: "AB", xp: 1980, missionsCompleted: 14, level: 5 },
  { rank: 4, userId: "user_1", name: "Alex Rivera", avatar: "AR", xp: 1240, missionsCompleted: 11, level: 4 },
  { rank: 5, userId: "user_7", name: "Kim Soo-yeon", avatar: "KS", xp: 1100, missionsCompleted: 10, level: 4 },
  { rank: 6, userId: "user_3", name: "Liam O'Brien", avatar: "LO", xp: 950, missionsCompleted: 9, level: 4 },
  { rank: 7, userId: "user_8", name: "Priya Patel", avatar: "PP", xp: 820, missionsCompleted: 8, level: 4 },
  { rank: 8, userId: "user_2", name: "Jordan Blake", avatar: "JB", xp: 680, missionsCompleted: 7, level: 3 },
  { rank: 9, userId: "user_6", name: "Emma Williams", avatar: "EW", xp: 540, missionsCompleted: 5, level: 3 },
  { rank: 10, userId: "user_4", name: "Tomas Garcia", avatar: "TG", xp: 390, missionsCompleted: 4, level: 3 },
  { rank: 11, userId: "user_10", name: "Fatima Zahra", avatar: "FZ", xp: 280, missionsCompleted: 3, level: 2 },
  { rank: 12, userId: "user_11", name: "Chris Taylor", avatar: "CT", xp: 150, missionsCompleted: 2, level: 2 },
];

export const ANALYTICS = {
  totalCheckIns: 0,
  activeAttendees: 0,
  totalMissionsCompleted: 0,
  avgMissionsPerAttendee: 0,
  topMissions: [
    { name: "Check in at entrance", completions: 0 },
    { name: "Connect with 3 other attendees", completions: 0 },
    { name: "Scan QR code at Superteam booth", completions: 0 },
    { name: "Test your knowledge on BlockNova", completions: 0 },
    { name: "Upload the best picture you took at the venue", completions: 0 },
  ],
  sponsorVisits: [
    { sponsor: "Superteam", visits: 0 },
    { sponsor: "Sponsor Merch", visits: 0 },
    { sponsor: "BlockNova", visits: 0 },
  ],
  hourlyActivity: [
    { hour: "9AM", checkins: 0, missions: 0 },
    { hour: "10AM", checkins: 0, missions: 0 },
    { hour: "11AM", checkins: 0, missions: 0 },
    { hour: "12PM", checkins: 0, missions: 0 },
    { hour: "1PM", checkins: 0, missions: 0 },
    { hour: "2PM", checkins: 0, missions: 0 },
    { hour: "3PM", checkins: 0, missions: 0 },
    { hour: "4PM", checkins: 0, missions: 0 },
  ],
};
