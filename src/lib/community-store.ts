import { EVENTS, MISSIONS, type Event, type Mission, type ProofType } from "@/lib/mock-data";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase-server";

export interface CommunityMission {
  id: string;
  title: string;
  description: string;
  type: Mission["type"];
  proofType: ProofType;
  xpReward: number;
  proofLocation?: string;
}

export interface CommunityEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  organizerId: string;
  organizerName: string;
  category: string;
  attendees: number;
  maxAttendees: number;
  color: string;
  emoji: string;
  shareUrl: string;
  missions: CommunityMission[];
  isRegistered?: boolean;
  mutuals?: string[];
  createdAt?: string;
}

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

type CommunityEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  organizer_id: string;
  organizer_name: string;
  category: string;
  max_attendees: number;
  color: string;
  emoji: string;
  missions: CommunityMission[];
  share_url: string | null;
  created_at?: string;
};

type UserProfileRow = {
  id: string;
  privy_user_id: string | null;
  wallet_address: string | null;
  handle: string;
  display_name: string;
  user_tag: string;
  bio: string | null;
  avatar: string | null;
};

const memoryEvents: CommunityEvent[] = EVENTS.map((event) => eventFromMock(event));
const memoryRegistrations = new Map<string, Set<string>>();
const memoryProfiles = new Map<string, UserProfile>();
const memoryConnections: Array<{
  id: string;
  eventId?: string;
  requesterUserId: string;
  targetUserId: string;
  targetUserTag: string;
}> = [];

export async function listCommunityEvents({ query, userId }: { query?: string; userId?: string } = {}) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!hasSupabaseConfig()) {
    return memoryEvents
      .filter((event) => eventMatchesQuery(event, normalizedQuery))
      .map((event) => applyMemoryRegistration(event, userId));
  }

  const supabase = createSupabaseServerClient();
  let request = supabase
    .from("community_events")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (normalizedQuery) {
    request = request.or(`title.ilike.%${normalizedQuery}%,location.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to read community events: ${error.message}`);
  }

  const events = await Promise.all((data ?? []).map((row) => eventFromRowWithCounts(row, userId)));
  const fallbackEvents = EVENTS.map(eventFromMock).filter((event) => eventMatchesQuery(event, normalizedQuery));
  const savedIds = new Set(events.map((event) => event.id));

  return [...events, ...fallbackEvents.filter((event) => !savedIds.has(event.id))];
}

export async function createCommunityEvent(input: {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  organizerId: string;
  organizerName?: string;
  category: string;
  maxAttendees?: number;
  missions?: CommunityMission[];
}) {
  const id = `evt_${stableSegment(`${input.title}:${input.location}:${Date.now()}`)}`;
  const slug = uniqueSlug(input.title, id);
  const shareUrl = `/events/${slug}`;
  const event: CommunityEvent = {
    id,
    slug,
    title: input.title,
    description: input.description,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    organizerId: input.organizerId,
    organizerName: input.organizerName ?? "ProofPlay Organizer",
    category: input.category,
    attendees: 0,
    maxAttendees: input.maxAttendees ?? 100,
    color: "var(--color-pastel-purple)",
    emoji: "BN",
    shareUrl,
    missions: input.missions?.length ? input.missions : defaultMissions(id),
  };

  if (!hasSupabaseConfig()) {
    memoryEvents.unshift(event);
    return event;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("community_events")
    .insert(eventToRow(event))
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create community event: ${error.message}`);
  }

  return eventFromRow(data);
}

export async function registerForEvent(eventId: string, userId: string) {
  const id = `reg_${stableSegment(`${eventId}:${userId}`)}`;

  if (!hasSupabaseConfig()) {
    const eventRegistrations = memoryRegistrations.get(eventId) ?? new Set<string>();
    eventRegistrations.add(userId);
    memoryRegistrations.set(eventId, eventRegistrations);
    return { id, eventId, userId, status: "registered" };
  }

  const supabase = createSupabaseServerClient();
  await ensureEventExistsForRegistration(eventId);

  const { error } = await supabase
    .from("event_registrations")
    .upsert({
      id,
      event_id: eventId,
      user_id: userId,
      status: "registered",
      source: "web",
    }, { onConflict: "event_id,user_id" });

  if (error) {
    throw new Error(`Failed to register for event: ${error.message}`);
  }

  return { id, eventId, userId, status: "registered" };
}

async function ensureEventExistsForRegistration(eventId: string) {
  const fallbackEvent = EVENTS.find((event) => event.id === eventId);
  if (!fallbackEvent) return;

  const supabase = createSupabaseServerClient();
  const { data, error: readError } = await supabase
    .from("community_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to check event before registration: ${readError.message}`);
  }

  if (data) return;

  const event = eventFromMock(fallbackEvent);
  const { error: writeError } = await supabase
    .from("community_events")
    .upsert(eventToRow(event), { onConflict: "id" });

  if (writeError) {
    throw new Error(`Failed to prepare event for registration: ${writeError.message}`);
  }
}

export async function upsertUserProfile(input: {
  userId: string;
  walletAddress?: string;
  displayName?: string;
  handle?: string;
  userTag?: string;
  bio?: string;
  avatar?: string;
  mode?: "ensure" | "update";
}) {
  const mode = input.mode ?? "ensure";
  const existing = await findUserProfile(input.userId);
  const profile: UserProfile = existing ?? {
    id: input.userId,
    privyUserId: input.userId.startsWith("did:privy") ? input.userId : undefined,
    walletAddress: input.walletAddress,
    handle: `user-${stableSegment(input.userId).slice(0, 6)}`,
    displayName: input.displayName ?? "ProofPlayer",
    userTag: `PP-${stableSegment(input.userId).slice(0, 6).toUpperCase()}`,
    bio: "ProofPlay attendee",
    avatar: initialsFor(input.displayName ?? "ProofPlayer"),
  };

  const nextProfile = {
    ...profile,
    walletAddress: input.walletAddress ?? profile.walletAddress,
    displayName: mode === "update" ? normalizeDisplayName(input.displayName, profile.displayName) : profile.displayName,
    handle: mode === "update" ? normalizeHandle(input.handle, profile.handle) : profile.handle,
    userTag: mode === "update" ? normalizeUserTag(input.userTag, profile.userTag) : profile.userTag,
    bio: mode === "update" ? normalizeBio(input.bio, profile.bio) : profile.bio,
    avatar: mode === "update"
      ? normalizeAvatar(input.avatar, profile.avatar, input.displayName ?? profile.displayName)
      : normalizeAvatar(undefined, profile.avatar, profile.displayName),
  };

  if (!hasSupabaseConfig()) {
    memoryProfiles.set(input.userId, nextProfile);
    return nextProfile;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profileToRow(nextProfile), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("Supabase table public.user_profiles is missing. Run supabase/schema.sql in the Supabase SQL Editor, then retry.");
    }

    throw new Error(`Failed to save user profile: ${error.message}`);
  }

  return profileFromRow(data);
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  if (!hasSupabaseConfig()) {
    return [...memoryProfiles.values()];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*");

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      return [];
    }

    throw new Error(`Failed to read user profiles: ${error.message}`);
  }

  return (data ?? []).map(profileFromRow);
}

function normalizeDisplayName(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 40) : fallback;
}

function normalizeHandle(value: string | undefined, fallback: string) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized && normalized.length >= 3 ? normalized.slice(0, 24) : fallback;
}

function normalizeUserTag(value: string | undefined, fallback: string) {
  const normalized = value
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return fallback;

  const withPrefix = normalized.startsWith("PP-") ? normalized : `PP-${normalized}`;
  return withPrefix.slice(0, 18);
}

function normalizeBio(value: string | undefined, fallback: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 140) : fallback;
}

function normalizeAvatar(value: string | undefined, fallback: string | undefined, displayName: string) {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const fallbackAvatar = fallback?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return normalized ? normalized.slice(0, 3) : fallbackAvatar ? fallbackAvatar.slice(0, 3) : initialsFor(displayName);
}

function initialsFor(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return initials || "PP";
}

export async function connectWithUser(input: { requesterUserId: string; targetUserTag: string; eventId?: string }) {
  const target = await findProfileByTag(input.targetUserTag);

  if (!target) {
    throw new Error("No user found for that tag.");
  }

  if (target.id === input.requesterUserId) {
    throw new Error("You cannot connect with yourself.");
  }

  const id = `conn_${stableSegment(`${input.eventId ?? "global"}:${input.requesterUserId}:${target.id}`)}`;

  if (!hasSupabaseConfig()) {
    const connection = {
      id,
      eventId: input.eventId,
      requesterUserId: input.requesterUserId,
      targetUserId: target.id,
      targetUserTag: target.userTag,
    };
    memoryConnections.push(connection);
    return { ...connection, targetProfile: target };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("user_connections")
    .upsert({
      id,
      event_id: input.eventId ?? null,
      requester_user_id: input.requesterUserId,
      target_user_id: target.id,
      target_user_tag: target.userTag,
    }, { onConflict: "event_id,requester_user_id,target_user_id" });

  if (error) {
    throw new Error(`Failed to connect with user: ${error.message}`);
  }

  return { id, eventId: input.eventId, requesterUserId: input.requesterUserId, targetUserId: target.id, targetUserTag: target.userTag, targetProfile: target };
}

async function findUserProfile(userId: string) {
  if (!hasSupabaseConfig()) {
    return memoryProfiles.get(userId);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("Supabase table public.user_profiles is missing. Run supabase/schema.sql in the Supabase SQL Editor, then retry.");
    }

    throw new Error(`Failed to read user profile: ${error.message}`);
  }

  return data ? profileFromRow(data) : undefined;
}

async function findProfileByTag(userTag: string) {
  const normalized = userTag.trim().toUpperCase();

  if (!hasSupabaseConfig()) {
    return [...memoryProfiles.values()].find((profile) => profile.userTag.toUpperCase() === normalized);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_tag", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("Supabase table public.user_profiles is missing. Run supabase/schema.sql in the Supabase SQL Editor, then retry.");
    }

    throw new Error(`Failed to find user profile: ${error.message}`);
  }

  return data ? profileFromRow(data) : undefined;
}

async function eventFromRowWithCounts(row: CommunityEventRow, userId?: string) {
  const event = eventFromRow(row);
  const supabase = createSupabaseServerClient();
  const [{ count }, registration] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id),
    userId
      ? supabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...event,
    attendees: count ?? 0,
    isRegistered: Boolean("data" in registration && registration.data),
  };
}

function eventFromMock(event: Event): CommunityEvent {
  return {
    id: event.id,
    slug: slugify(event.title),
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    organizerId: event.organizer,
    organizerName: event.organizer,
    category: event.category,
    attendees: event.attendees,
    maxAttendees: event.maxAttendees,
    color: event.color,
    emoji: event.emoji,
    shareUrl: `/events/${slugify(event.title)}`,
    missions: MISSIONS.filter((mission) => mission.eventId === event.id).map((mission) => ({
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type,
      proofType: mission.proofType,
      xpReward: mission.xpReward,
      proofLocation: mission.proofLocation,
    })),
    isRegistered: event.checkedIn,
  };
}

function eventToRow(event: CommunityEvent) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    location: event.location,
    start_date: normalizeDate(event.startDate),
    end_date: normalizeDate(event.endDate),
    organizer_id: event.organizerId,
    organizer_name: event.organizerName,
    category: event.category,
    max_attendees: event.maxAttendees,
    color: event.color,
    emoji: event.emoji,
    missions: event.missions,
    share_url: event.shareUrl,
  };
}

function eventFromRow(row: CommunityEventRow): CommunityEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    category: row.category,
    attendees: 0,
    maxAttendees: row.max_attendees,
    color: row.color,
    emoji: row.emoji,
    shareUrl: row.share_url ?? `/events/${row.slug}`,
    missions: row.missions ?? [],
    createdAt: row.created_at,
  };
}

function profileToRow(profile: UserProfile) {
  return {
    id: profile.id,
    privy_user_id: profile.privyUserId ?? null,
    wallet_address: profile.walletAddress ?? null,
    handle: profile.handle,
    display_name: profile.displayName,
    user_tag: profile.userTag,
    bio: profile.bio ?? null,
    avatar: profile.avatar ?? null,
  };
}

function profileFromRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    privyUserId: row.privy_user_id ?? undefined,
    walletAddress: row.wallet_address ?? undefined,
    handle: row.handle,
    displayName: row.display_name,
    userTag: row.user_tag,
    bio: row.bio ?? undefined,
    avatar: row.avatar ?? undefined,
  };
}

function isMissingSupabaseTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || error.message?.includes("Could not find the table");
}

function applyMemoryRegistration(event: CommunityEvent, userId?: string) {
  const registeredUsers = memoryRegistrations.get(event.id);
  return {
    ...event,
    attendees: event.attendees + (registeredUsers?.size ?? 0),
    isRegistered: Boolean(userId && registeredUsers?.has(userId)) || event.isRegistered,
  };
}

function eventMatchesQuery(event: CommunityEvent, query?: string) {
  if (!query) return true;
  return `${event.title} ${event.location} ${event.category} ${event.organizerName}`.toLowerCase().includes(query);
}

function defaultMissions(eventId: string): CommunityMission[] {
  return [
    {
      id: `${eventId}_checkin`,
      title: "Check in at entrance",
      description: "Scan the venue entrance QR code when you arrive.",
      type: "qr",
      proofType: "qr_scan",
      proofLocation: "Entrance",
      xpReward: 50,
    },
    {
      id: `${eventId}_connect`,
      title: "Connect with 3 other attendees",
      description: "Connect with three people on ground who are not already in your friend list.",
      type: "manual",
      proofType: "organizer_approval",
      proofLocation: "Event venue",
      xpReward: 120,
    },
    {
      id: `${eventId}_superteam`,
      title: "Scan QR code at Superteam booth",
      description: "Visit the Superteam booth and scan their mission QR code.",
      type: "qr",
      proofType: "qr_scan",
      proofLocation: "Superteam Booth",
      xpReward: 80,
    },
    {
      id: `${eventId}_knowledge`,
      title: "Test your knowledge on BlockNova",
      description: "Enter the BlockNova quiz or speaker code to prove what you learned.",
      type: "text",
      proofType: "quiz_code",
      proofLocation: "BlockNova Quiz",
      xpReward: 100,
    },
    {
      id: `${eventId}_merch`,
      title: "Collect any sponsor Merch",
      description: "Upload a quick proof photo of any sponsor merch you collected.",
      type: "photo",
      proofType: "photo_upload",
      proofLocation: "Sponsor Booths",
      xpReward: 90,
    },
    {
      id: `${eventId}_best_photo`,
      title: "Upload the best picture you took at the venue",
      description: "Share your best venue photo as proof media.",
      type: "photo",
      proofType: "photo_upload",
      proofLocation: "Event venue",
      xpReward: 110,
    },
  ];
}

function uniqueSlug(title: string, id: string) {
  return `${slugify(title)}-${id.slice(-6)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48) || "event";
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function stableSegment(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
