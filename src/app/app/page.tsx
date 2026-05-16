"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PlusCircle,
  ScanLine,
  Search,
  Users,
} from "lucide-react";
import { EVENTS } from "@/lib/mock-data";
import type { CommunityEvent } from "@/lib/community-store";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { EventIconBadge } from "@/components/ProofPlayIcons";
import EnterEventDialog from "@/components/EnterEventDialog";

type EventsTab = "my" | "created" | "discover";

function isEventsTab(value: string | null): value is EventsTab {
  return value === "my" || value === "created" || value === "discover";
}

export default function AppDashboard() {
  const auth = useProofPlayAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: EventsTab = isEventsTab(tabParam) ? (tabParam as EventsTab) : "my";

  const setActiveTab = (tab: EventsTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/app?${next.toString()}`, { scroll: false });
  };

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [enterOpen, setEnterOpen] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (auth.userId) params.set("userId", auth.userId);

    fetch(`/api/events?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { events?: CommunityEvent[] }) => setEvents(data.events ?? []))
      .catch(() => setEvents(fallbackEvents()))
      .finally(() => setEventsLoading(false));
  }, [auth.userId, query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setDiscoverPage(1);
  };

  const DISCOVER_PAGE_SIZE = 9;
  const publicEvents = useMemo(
    () => events.filter((event) => event.visibility !== "private"),
    [events],
  );
  const discoverTotalPages = Math.max(1, Math.ceil(publicEvents.length / DISCOVER_PAGE_SIZE));
  const discoverCurrentPage = Math.min(discoverPage, discoverTotalPages);
  const discoverPageEvents = useMemo(
    () =>
      publicEvents.slice(
        (discoverCurrentPage - 1) * DISCOVER_PAGE_SIZE,
        discoverCurrentPage * DISCOVER_PAGE_SIZE,
      ),
    [publicEvents, discoverCurrentPage],
  );
  const myEvents = useMemo(() => events.filter((event) => event.isRegistered), [events]);
  const createdEvents = useMemo(
    () => (auth.userId ? events.filter((event) => event.organizerId === auth.userId) : []),
    [auth.userId, events],
  );

  async function register(eventId: string) {
    if (!auth.configured || !auth.authenticated || !auth.userId) {
      auth.login();
      return;
    }

    setRegisteringId(eventId);
    setStatusMessage("");

    try {
      const headers = await auth.authHeaders();
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ userId: auth.userId }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Registration failed");

      setEvents((current) => current.map((event) => (
        event.id === eventId
          ? { ...event, isRegistered: true, attendees: event.attendees + 1 }
          : event
      )));
      setStatusMessage("Registered. Your venue check-in missions unlock when you arrive.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 gap-3 lg:max-w-3xl"
      >
        <Link
          href="/app/create"
          className="bubbly-card flex flex-col items-start gap-2 bg-[var(--color-pastel-purple)] p-4 transition-all active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81]">
            <PlusCircle size={18} />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight">Create an Event</p>
            <p className="text-[10px] font-bold opacity-60">Host your own with missions and proofs</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setEnterOpen(true)}
          className="bubbly-card flex flex-col items-start gap-2 bg-[var(--color-pastel-green)] p-4 text-left transition-all active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81]">
            <ScanLine size={18} />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight">Enter an Event</p>
            <p className="text-[10px] font-bold opacity-60">Scan a QR code or enter a code</p>
          </div>
        </button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div role="tablist" className="mb-3 flex gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-white p-1">
          <TabButton active={activeTab === "my"} onClick={() => setActiveTab("my")}>
            Joined {myEvents.length > 0 && <span className="opacity-60">({myEvents.length})</span>}
          </TabButton>
          <TabButton active={activeTab === "created"} onClick={() => setActiveTab("created")}>
            Created {createdEvents.length > 0 && <span className="opacity-60">({createdEvents.length})</span>}
          </TabButton>
          <TabButton active={activeTab === "discover"} onClick={() => setActiveTab("discover")}>
            Discover
          </TabButton>
        </div>

        {activeTab === "my" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventsLoading ? (
              <EventCardSkeletons count={3} />
            ) : myEvents.length === 0 ? (
              <div className="bubbly-card flex min-h-72 flex-col items-center justify-center bg-white p-8 text-center sm:col-span-2 lg:col-span-3">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] shadow-[3px_3px_0px_0px_#312e81]">
                  <ScanLine size={26} />
                </div>
                <p className="font-display text-xl font-bold">No events joined yet</p>
                <p className="mt-2 max-w-xs text-xs font-bold opacity-60">
                  Tap <span className="font-bold">Enter an Event</span> above to scan a QR or paste a code.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("discover")}
                  className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-5 py-2 text-xs font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  Browse Discover
                </button>
              </div>
            ) : (
              myEvents.map((event, index) => (
                <EventDiscoveryCard
                  key={event.id}
                  event={event}
                  index={index}
                  registering={registeringId === event.id}
                  onRegister={() => register(event.id)}
                  isOwner={auth.userId === event.organizerId}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "created" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventsLoading ? (
              <EventCardSkeletons count={3} />
            ) : createdEvents.length === 0 ? (
              <div className="bubbly-card flex min-h-72 flex-col items-center justify-center bg-white p-8 text-center sm:col-span-2 lg:col-span-3">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] shadow-[3px_3px_0px_0px_#312e81]">
                  <PlusCircle size={26} />
                </div>
                <p className="font-display text-xl font-bold">No events created yet</p>
                <p className="mt-2 max-w-xs text-xs font-bold opacity-60">
                  Events you host show up here so you can manage them anytime.
                </p>
                <Link
                  href="/app/create"
                  className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] px-5 py-2 text-xs font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  Create your first event
                </Link>
              </div>
            ) : (
              createdEvents.map((event, index) => (
                <EventDiscoveryCard
                  key={event.id}
                  event={event}
                  index={index}
                  registering={registeringId === event.id}
                  onRegister={() => register(event.id)}
                  isOwner={auth.userId === event.organizerId}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "discover" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white px-3 py-2 lg:max-w-xl">
              <Search size={16} className="opacity-50" />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Search events, cities, categories"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {eventsLoading && events.length === 0 ? (
                <EventCardSkeletons count={4} />
              ) : publicEvents.length === 0 ? (
                <div className="bubbly-card bg-white p-5 text-center sm:col-span-2 lg:col-span-3">
                  <p className="font-bold">No events found yet.</p>
                  <p className="mt-1 text-xs font-bold opacity-60">
                    Hosts can publish events from the organizer dashboard.
                  </p>
                </div>
              ) : (
                discoverPageEvents.map((event, index) => (
                  <EventDiscoveryCard
                    key={event.id}
                    event={event}
                    index={index}
                    registering={registeringId === event.id}
                    onRegister={() => register(event.id)}
                    isOwner={auth.userId === event.organizerId}
                  />
                ))
              )}
            </div>

            {publicEvents.length > 0 && discoverTotalPages > 1 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDiscoverPage((p) => Math.max(1, p - 1))}
                  disabled={discoverCurrentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs font-bold opacity-70">
                  Page {discoverCurrentPage} of {discoverTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setDiscoverPage((p) => Math.min(discoverTotalPages, p + 1))}
                  disabled={discoverCurrentPage >= discoverTotalPages}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <p className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3 text-xs font-bold">
            {statusMessage}
          </p>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="font-display text-lg font-bold mb-2">Friend Signals</h2>
        <div className="bubbly-card bg-white p-4">
          <p className="text-sm font-bold">Coming into the feed next: events your friends registered for.</p>
          <p className="mt-1 text-xs font-bold opacity-60">
            The data model now supports user tags, event connections, friend lists, and mutual attendance signals.
          </p>
        </div>
      </motion.section>

      <EnterEventDialog open={enterOpen} onClose={() => setEnterOpen(false)} />
    </div>
  );
}

function EventDiscoveryCard({
  event,
  index,
  registering,
  onRegister,
  isOwner,
}: {
  event: CommunityEvent;
  index: number;
  registering: boolean;
  onRegister: () => void;
  isOwner: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.04 }}
      className="bubbly-card bg-white p-3"
    >
      <div className="flex items-start gap-2 min-[380px]:gap-3">
        <EventIconBadge />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{event.title}</p>
              <p className="text-[10px] font-bold opacity-60 truncate">{event.organizerName} - {event.category}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {event.visibility === "private" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-2 py-0.5 text-[9px] font-bold">
                  Private
                </span>
              )}
              {event.isRegistered && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-700 bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                  <CheckCircle size={10} /> Joined
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold opacity-70">
            <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={10} className="shrink-0" /> <span className="truncate">{event.location}</span></span>
            <span className="inline-flex items-center gap-1"><Users size={10} className="shrink-0" /> {event.attendees}/{event.maxAttendees}</span>
            <span>{event.missions.length} missions</span>
          </div>
          {event.mutuals?.length ? (
            <p className="mt-2 text-[10px] font-bold text-[var(--color-primary-500)]">
              {event.mutuals.length} mutuals planning to attend
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {isOwner ? (
              <Link
                href={`/organizer/event/${event.id}`}
                className="min-w-20 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] px-3 py-1.5 text-center text-[10px] font-bold"
              >
                Manage
              </Link>
            ) : (
              <button
                type="button"
                onClick={onRegister}
                disabled={registering || event.isRegistered}
                className="min-w-20 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-3 py-1.5 text-[10px] font-bold disabled:opacity-60"
              >
                {event.isRegistered ? "Registered" : registering ? "Registering" : "Register"}
              </button>
            )}
            <Link
              href={`/app/event/${event.id}`}
              className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1.5 text-[10px] font-bold"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EventCardSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="bubbly-card animate-pulse bg-white p-3"
        >
          <div className="flex items-start gap-2 min-[380px]:gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-2 w-1/2 rounded bg-gray-100" />
              <div className="flex gap-2 pt-2">
                <div className="h-2 w-16 rounded bg-gray-100" />
                <div className="h-2 w-10 rounded bg-gray-100" />
                <div className="h-2 w-12 rounded bg-gray-100" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 rounded-full bg-gray-200" />
                <div className="h-6 w-14 rounded-full bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
        active
          ? "bg-[var(--color-primary-900)] text-white"
          : "bg-transparent text-[var(--color-primary-900)] hover:bg-[var(--color-bg-base)]"
      }`}
    >
      {children}
    </button>
  );
}

function fallbackEvents(): CommunityEvent[] {
  return EVENTS.map((event) => ({
    id: event.id,
    slug: event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
    shareUrl: `/events/${event.id}`,
    visibility: "public",
    missions: [],
    isRegistered: event.checkedIn,
  }));
}
