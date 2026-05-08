// ========================================
// ProofPlay Mock Data Layer
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

// ---- XP Level System ----
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
  const nextLevel = XP_LEVELS.find((l) => l.level === current.level + 1);
  const progress = nextLevel
    ? ((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100
    : 100;
  return { ...current, progress, nextLevel };
}

export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case "common": return "var(--color-pastel-blue)";
    case "rare": return "var(--color-pastel-purple)";
    case "epic": return "var(--color-pastel-pink)";
    case "legendary": return "var(--color-pastel-yellow)";
  }
}

export function getMissionTypeIcon(type: MissionType): string {
  switch (type) {
    case "qr": return "📱";
    case "nfc": return "📡";
    case "text": return "✏️";
    case "photo": return "📸";
    case "manual": return "🤝";
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
    action: "Request approval",
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

// ---- Current User ----
export const CURRENT_USER: User = {
  id: "user_1",
  name: "Alex Rivera",
  avatar: "🧑‍💻",
  bio: "Web3 builder & hackathon enthusiast. Always looking for the next mission.",
  totalXp: 1240,
  level: 4,
  eventsAttended: 12,
  missionsCompleted: 47,
  badgesEarned: 23,
  joinedAt: "2025-09-15",
};

// ---- Events ----
export const EVENTS: Event[] = [
  {
    id: "evt_1",
    title: "Web3 Summit 2026",
    description: "The biggest Web3 gathering in Europe. Three days of talks, hackathons, workshops, and networking. Earn participation badges and prove what you did!",
    location: "Berlin, DE",
    startDate: "May 8, 2026",
    endDate: "May 10, 2026",
    organizer: "Web3 Foundation",
    category: "Conference",
    attendees: 847,
    maxAttendees: 1200,
    missions: 14,
    color: "var(--color-pastel-purple)",
    emoji: "🌐",
    checkedIn: true,
  },
  {
    id: "evt_2",
    title: "ETH Hackathon Lagos",
    description: "48-hour hackathon building the next generation of decentralized applications. Submit a project and win prizes!",
    location: "Lagos, NG",
    startDate: "May 15, 2026",
    endDate: "May 17, 2026",
    organizer: "ETH Nigeria",
    category: "Hackathon",
    attendees: 230,
    maxAttendees: 300,
    missions: 8,
    color: "var(--color-pastel-green)",
    emoji: "⚡",
    checkedIn: false,
  },
  {
    id: "evt_3",
    title: "Creator Economy Meetup",
    description: "Monthly meetup for creators, builders, and innovators. Share your work, get feedback, and connect with like-minded people.",
    location: "London, UK",
    startDate: "May 20, 2026",
    endDate: "May 20, 2026",
    organizer: "Creator DAO",
    category: "Meetup",
    attendees: 65,
    maxAttendees: 100,
    missions: 5,
    color: "var(--color-pastel-pink)",
    emoji: "🎨",
    checkedIn: false,
  },
  {
    id: "evt_4",
    title: "DeFi Deep Dive",
    description: "Intensive workshop covering the latest in decentralized finance protocols, yield strategies, and security best practices.",
    location: "Singapore, SG",
    startDate: "Jun 2, 2026",
    endDate: "Jun 3, 2026",
    organizer: "DeFi Academy",
    category: "Workshop",
    attendees: 120,
    maxAttendees: 150,
    missions: 10,
    color: "var(--color-pastel-yellow)",
    emoji: "💰",
    checkedIn: false,
  },
];

// ---- Missions ----
export const MISSIONS: Mission[] = [
  // Event 1 missions
  { id: "m1", eventId: "evt_1", title: "Check In at Entrance", description: "Scan the QR code at the main entrance to register your event presence.", type: "qr", proofType: "qr_scan", proofLocation: "Main Entrance", xpReward: 50, badgeReward: "badge_checkin", status: "completed", completedAt: "2026-05-08T09:15:00Z", proofRecordId: "proof_m1_checkin", completionCount: 1, maxCompletions: 1 },
  { id: "m2", eventId: "evt_1", title: "Join a Team", description: "Find a team or form your own for the hackathon track.", type: "manual", proofType: "organizer_approval", proofLocation: "Team Formation Desk", xpReward: 100, status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m3", eventId: "evt_1", title: "Visit Polygon Booth", description: "Head to the Polygon sponsor booth and scan their mission QR code.", type: "qr", proofType: "qr_scan", proofLocation: "Polygon Booth", xpReward: 70, sponsorTag: "Polygon", status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m4", eventId: "evt_1", title: "Attend Opening Keynote", description: "Be present at the opening keynote session and scan the session QR.", type: "qr", proofType: "qr_scan", proofLocation: "Main Stage", xpReward: 80, badgeReward: "badge_keynote", status: "completed", completedAt: "2026-05-08T10:00:00Z", proofRecordId: "proof_m4_keynote", completionCount: 1, maxCompletions: 1 },
  { id: "m5", eventId: "evt_1", title: "Submit Hackathon Project", description: "Submit your completed hackathon project for judging. Upload a screenshot of your submission.", type: "photo", proofType: "photo_upload", proofLocation: "Hackathon Portal", xpReward: 300, badgeReward: "badge_builder", status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m6", eventId: "evt_1", title: "Help Another Team", description: "Provide meaningful help to another team. Get verified by an organizer.", type: "manual", proofType: "organizer_approval", proofLocation: "Mentor Desk", xpReward: 100, badgeReward: "badge_helper", status: "available", completionCount: 0, maxCompletions: 3 },
  { id: "m7", eventId: "evt_1", title: "Workshop: ZK Proofs 101", description: "Attend the ZK Proofs workshop and enter the speaker code at the end.", type: "text", proofType: "quiz_code", proofLocation: "Workshop Room B", xpReward: 120, status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m8", eventId: "evt_1", title: "Visit Chainlink Booth", description: "Tap the NFC checkpoint at the Chainlink booth to learn about price feeds.", type: "nfc", proofType: "nfc_tap", proofLocation: "Chainlink Booth", xpReward: 70, sponsorTag: "Chainlink", status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m9", eventId: "evt_1", title: "Demo on Stage", description: "Present your project during the demo session. Verified by organizers.", type: "manual", proofType: "organizer_approval", proofLocation: "Demo Stage", xpReward: 500, badgeReward: "badge_speaker", status: "locked", completionCount: 0, maxCompletions: 1 },
  { id: "m10", eventId: "evt_1", title: "Networking Photo", description: "Take a group photo with at least 3 other attendees and upload it.", type: "photo", proofType: "photo_upload", proofLocation: "Networking Lounge", xpReward: 60, status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m11", eventId: "evt_1", title: "Quiz: Web3 Trivia", description: "Answer 5 trivia questions about Web3 history and concepts.", type: "text", proofType: "quiz_code", proofLocation: "Workshop Room A", xpReward: 90, badgeReward: "badge_quiz", status: "completed", completedAt: "2026-05-08T11:30:00Z", proofRecordId: "proof_m11_quiz", completionCount: 1, maxCompletions: 1 },
  { id: "m12", eventId: "evt_1", title: "Visit Arbitrum Booth", description: "Learn about Arbitrum's latest L2 innovations at their booth.", type: "qr", proofType: "qr_scan", proofLocation: "Arbitrum Booth", xpReward: 70, sponsorTag: "Arbitrum", status: "available", completionCount: 0, maxCompletions: 1 },
  { id: "m13", eventId: "evt_1", title: "Closing Ceremony", description: "Attend the closing ceremony and awards presentation.", type: "qr", proofType: "qr_scan", proofLocation: "Main Stage", xpReward: 80, status: "locked", completionCount: 0, maxCompletions: 1 },
  { id: "m14", eventId: "evt_1", title: "Win a Prize", description: "Win any prize category during the hackathon.", type: "manual", proofType: "organizer_approval", proofLocation: "Judging Desk", xpReward: 1000, badgeReward: "badge_winner", status: "locked", completionCount: 0, maxCompletions: 1 },
];

// Real proof records are returned by /api/proofs after successful 0G uploads.
export const PROOF_RECORDS: ProofRecord[] = [];

// ---- Badges ----
export const BADGES: Badge[] = [
  { id: "badge_checkin", name: "First Steps", description: "Checked in to your first event", emoji: "👣", rarity: "common", eventName: "Web3 Summit 2026", earnedAt: "2026-05-08", color: "var(--color-pastel-blue)" },
  { id: "badge_keynote", name: "Knowledge Seeker", description: "Attended a keynote session", emoji: "🎤", rarity: "common", eventName: "Web3 Summit 2026", earnedAt: "2026-05-08", color: "var(--color-pastel-green)" },
  { id: "badge_networker", name: "Social Butterfly", description: "Connected with 10+ attendees", emoji: "🦋", rarity: "rare", eventName: "Creator Economy Meetup", earnedAt: "2026-04-20", color: "var(--color-pastel-purple)" },
  { id: "badge_builder", name: "Master Builder", description: "Submitted a hackathon project", emoji: "🏗️", rarity: "epic", eventName: "ETH Hackathon Lagos", earnedAt: "2026-03-17", color: "var(--color-pastel-pink)" },
  { id: "badge_helper", name: "Helping Hand", description: "Helped another team during a hackathon", emoji: "🤝", rarity: "rare", eventName: "ETH Hackathon Lagos", earnedAt: "2026-03-16", color: "var(--color-pastel-blue)" },
  { id: "badge_speaker", name: "Stage Presence", description: "Demoed a project on stage", emoji: "🎭", rarity: "epic", eventName: "DeFi Deep Dive", earnedAt: "2026-02-03", color: "var(--color-pastel-yellow)" },
  { id: "badge_winner", name: "Champion", description: "Won a hackathon prize", emoji: "🏆", rarity: "legendary", eventName: "ETH Hackathon Lagos", earnedAt: "2026-03-17", color: "var(--color-pastel-yellow)" },
  { id: "badge_5events", name: "Globetrotter", description: "Attended 5 different events", emoji: "🌍", rarity: "rare", eventName: "Multiple Events", earnedAt: "2026-01-10", color: "var(--color-pastel-green)" },
  { id: "badge_quiz", name: "Brain Power", description: "Scored 100% on an event quiz", emoji: "🧠", rarity: "rare", eventName: "Web3 Summit 2026", earnedAt: "2026-05-08", color: "var(--color-pastel-purple)" },
  { id: "badge_sponsor", name: "Booth Explorer", description: "Visited 3 sponsor booths at one event", emoji: "🏪", rarity: "common", eventName: "Web3 Summit 2026", earnedAt: "2026-05-08", color: "var(--color-pastel-pink)" },
];

// ---- Leaderboard ----
export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "user_9", name: "Sophia Chen", avatar: "👩‍🔬", xp: 2850, missionsCompleted: 18, level: 5 },
  { rank: 2, userId: "user_5", name: "Marcus Johnson", avatar: "👨‍🚀", xp: 2340, missionsCompleted: 16, level: 5 },
  { rank: 3, userId: "user_12", name: "Aisha Bello", avatar: "👩‍💼", xp: 1980, missionsCompleted: 14, level: 5 },
  { rank: 4, userId: "user_1", name: "Alex Rivera", avatar: "🧑‍💻", xp: 1240, missionsCompleted: 11, level: 4 },
  { rank: 5, userId: "user_7", name: "Kim Soo-yeon", avatar: "👨‍🎨", xp: 1100, missionsCompleted: 10, level: 4 },
  { rank: 6, userId: "user_3", name: "Liam O'Brien", avatar: "👨‍🔧", xp: 950, missionsCompleted: 9, level: 4 },
  { rank: 7, userId: "user_8", name: "Priya Patel", avatar: "👩‍🏫", xp: 820, missionsCompleted: 8, level: 4 },
  { rank: 8, userId: "user_2", name: "Jordan Blake", avatar: "🧑‍🎤", xp: 680, missionsCompleted: 7, level: 3 },
  { rank: 9, userId: "user_6", name: "Emma Williams", avatar: "👩‍🚒", xp: 540, missionsCompleted: 5, level: 3 },
  { rank: 10, userId: "user_4", name: "Tomás García", avatar: "👨‍🍳", xp: 390, missionsCompleted: 4, level: 3 },
  { rank: 11, userId: "user_10", name: "Fatima Zahra", avatar: "👩‍⚕️", xp: 280, missionsCompleted: 3, level: 2 },
  { rank: 12, userId: "user_11", name: "Chris Taylor", avatar: "🧑‍🏭", xp: 150, missionsCompleted: 2, level: 2 },
];

// ---- Organizer Analytics ----
export const ANALYTICS = {
  totalCheckIns: 847,
  activeAttendees: 623,
  totalMissionsCompleted: 4218,
  avgMissionsPerAttendee: 5.1,
  topMissions: [
    { name: "Check In at Entrance", completions: 847 },
    { name: "Visit Polygon Booth", completions: 412 },
    { name: "Attend Opening Keynote", completions: 398 },
    { name: "Quiz: Web3 Trivia", completions: 287 },
    { name: "Networking Photo", completions: 234 },
  ],
  sponsorVisits: [
    { sponsor: "Polygon", visits: 412 },
    { sponsor: "Chainlink", visits: 356 },
    { sponsor: "Arbitrum", visits: 298 },
  ],
  hourlyActivity: [
    { hour: "9AM", checkins: 234, missions: 89 },
    { hour: "10AM", checkins: 187, missions: 312 },
    { hour: "11AM", checkins: 98, missions: 456 },
    { hour: "12PM", checkins: 45, missions: 389 },
    { hour: "1PM", checkins: 32, missions: 234 },
    { hour: "2PM", checkins: 28, missions: 478 },
    { hour: "3PM", checkins: 15, missions: 512 },
    { hour: "4PM", checkins: 8, missions: 398 },
  ],
};
