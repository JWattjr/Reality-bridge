"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  MapPin,
  QrCode,
  Search,
  Users,
  Zap,
} from "lucide-react";
import {
  CURRENT_USER,
  EVENTS,
  PROOF_TYPE_COPY,
  getLevelForXp,
  getProofRecordForMission,
  shortHash,
} from "@/lib/mock-data";
import type { CommunityEvent } from "@/lib/community-store";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { EventIconBadge, MissionIconBadge } from "@/components/ProofPlayIcons";

const levelInfo = getLevelForXp(CURRENT_USER.totalXp);

export default function AppDashboard() {
  const auth = useProofPlayAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [query, setQuery] = useState("");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (auth.userId) params.set("userId", auth.userId);

    fetch(`/api/events?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { events?: CommunityEvent[] }) => setEvents(data.events ?? []))
      .catch(() => setEvents(fallbackEvents()));
  }, [auth.userId, query]);

  const suggestedEvents = useMemo(() => events.slice(0, 4), [events]);
  const activeEvent = events.find((event) => event.isRegistered) ?? events[0];
  const activeMissions = activeEvent?.missions ?? [];

  async function register(eventId: string) {
    if (!auth.configured || !auth.authenticated || !auth.userId) {
      auth.login();
      return;
    }

    setRegisteringId(eventId);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      >
        <div className="bubbly-card bg-white p-3 min-[380px]:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-bold text-sm">Level {levelInfo.level} - {levelInfo.title}</span>
            {levelInfo.nextLevel && (
              <span className="text-xs font-bold opacity-60">
                {CURRENT_USER.totalXp} / {levelInfo.nextLevel.minXp} XP
              </span>
            )}
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full border-2 border-[var(--color-primary-900)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-pastel-purple)] to-[var(--color-pastel-pink)]"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.3 }}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Current Events</h2>
          <Link href="/organizer/create" className="text-[10px] font-bold opacity-60 hover:opacity-100">
            Host one
          </Link>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white px-3 py-2">
          <Search size={16} className="opacity-50" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, cities, categories"
            className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
          />
        </div>

        <div className="space-y-3">
          {suggestedEvents.map((event, index) => (
            <EventDiscoveryCard
              key={event.id}
              event={event}
              index={index}
              registering={registeringId === event.id}
              onRegister={() => register(event.id)}
            />
          ))}

          {statusMessage && (
            <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3 text-xs font-bold">
              {statusMessage}
            </p>
          )}

          {suggestedEvents.length === 0 && (
            <div className="bubbly-card bg-white p-5 text-center">
              <p className="font-bold">No events found yet.</p>
              <p className="mt-1 text-xs font-bold opacity-60">
                Hosts can publish events from the organizer dashboard.
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {activeEvent && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-display text-lg font-bold mb-2">Registered Event</h2>
          <div className="bubbly-card relative overflow-hidden bg-[var(--color-pastel-purple)] p-3 min-[380px]:p-4">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none" />

            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-xl leading-tight">{activeEvent.title}</h3>
                <p className="font-bold text-xs flex items-center gap-1 mt-1 opacity-80">
                  <MapPin size={12} className="shrink-0" /> <span className="truncate">{activeEvent.location}</span>
                </p>
                <p className="font-bold text-xs flex items-center gap-1 opacity-80">
                  <CalendarDays size={12} className="shrink-0" /> <span className="truncate">{activeEvent.startDate} - {activeEvent.endDate}</span>
                </p>
              </div>
              <EventIconBadge size="lg" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--color-primary-900)] bg-white/50 p-3 backdrop-blur-sm">
              <span className="font-bold text-xs">
                {activeEvent.isRegistered ? "Registered" : "Open"} - {activeMissions.length} missions
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {!activeEvent.isRegistered && (
                  <button
                    type="button"
                    onClick={() => register(activeEvent.id)}
                    disabled={registeringId === activeEvent.id}
                    className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
                  >
                    {registeringId === activeEvent.id ? "Registering" : "Register"}
                  </button>
                )}
                <Link href={`/app/event/${activeEvent.id}`} className="rounded-full bg-[var(--color-primary-900)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--color-primary-700)]">
                  View
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      <motion.section
        className="grid grid-cols-2 gap-2 min-[380px]:gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link href={activeEvent ? `/app/event/${activeEvent.id}` : "/app/missions"} className="bubbly-card flex h-20 flex-col items-center justify-center gap-2 bg-[var(--color-pastel-pink)] p-3 text-center transition-all active:translate-y-0.5 active:shadow-none min-[380px]:p-4">
          <QrCode size={22} />
          <span className="font-bold text-xs">Scan Proof</span>
        </Link>
        <Link href="/app/profile" className="bubbly-card flex h-20 flex-col items-center justify-center gap-2 bg-[var(--color-pastel-yellow)] p-3 text-center transition-all active:translate-y-0.5 active:shadow-none min-[380px]:p-4">
          <Users size={22} />
          <span className="font-bold text-xs">Profile Tag</span>
        </Link>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-end mb-2">
          <h2 className="font-display text-lg font-bold">Missions</h2>
          <Link href="/app/missions" className="text-xs font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
            See all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="space-y-2">
          {activeMissions.slice(0, 5).map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="premium-glint flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#312e81]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MissionIconBadge title={mission.title} type={mission.type} proofType={mission.proofType} size="sm" />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{mission.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 min-[380px]:gap-2">
                    <motion.span
                      className="text-xs font-bold text-[var(--color-primary-500)] flex items-center gap-0.5"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
                    >
                      <Zap size={10} /> +{mission.xpReward} XP
                    </motion.span>
                    <span className="text-[10px] font-bold bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                      {PROOF_TYPE_COPY[mission.proofType].label}
                    </span>
                    {getProofRecordForMission(mission.id) && (
                      <span className="max-w-[8.5rem] truncate text-[10px] font-bold text-green-700">
                        0G {shortHash(getProofRecordForMission(mission.id)!.storage.rootHash)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <motion.div
                whileHover={{ x: 2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="shrink-0 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-2 py-1 text-[10px] font-bold transition-colors hover:bg-[var(--color-primary-900)] hover:text-white min-[380px]:px-2.5"
              >
                <Link href={`/app/event/${activeEvent?.id ?? "evt_1"}`}>
                  {PROOF_TYPE_COPY[mission.proofType].action}
                </Link>
              </motion.div>
            </motion.div>
          ))}

          {activeMissions.length === 0 && (
            <div className="bubbly-card p-4 bg-white text-center">
              <p className="text-sm font-bold">Register for an event to begin venue missions.</p>
            </div>
          )}
        </div>
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
    </div>
  );
}

function EventDiscoveryCard({
  event,
  index,
  registering,
  onRegister,
}: {
  event: CommunityEvent;
  index: number;
  registering: boolean;
  onRegister: () => void;
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
            {event.isRegistered && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-700 bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                <CheckCircle size={10} /> Joined
              </span>
            )}
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
            <button
              type="button"
              onClick={onRegister}
              disabled={registering || event.isRegistered}
              className="min-w-20 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-3 py-1.5 text-[10px] font-bold disabled:opacity-60"
            >
              {event.isRegistered ? "Registered" : registering ? "Registering" : "Register"}
            </button>
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
    missions: [],
    isRegistered: event.checkedIn,
  }));
}
