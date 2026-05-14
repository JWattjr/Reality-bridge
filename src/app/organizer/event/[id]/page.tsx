"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, ShieldAlert, Target, Trophy, Users } from "lucide-react";
import type { CommunityEvent } from "@/lib/community-store";
import type { LeaderboardEntry } from "@/lib/mock-data";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import MissionQRCodePanel from "@/components/MissionQRCodePanel";

export default function OrganizerEventDashboard() {
  const params = useParams();
  const eventId = params.id as string;
  const auth = useProofPlayAuth();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/events/${encodeURIComponent(eventId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Event not found");
        return data.event as CommunityEvent;
      })
      .then((found) => {
        if (!cancelled) setEvent(found);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load event");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/leaderboard?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { entries?: LeaderboardEntry[] }) => setLeaderboard(data.entries ?? []))
      .catch(() => setLeaderboard([]));
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary-900)] border-t-[var(--color-pastel-blue)]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md bubbly-card bg-white p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Event not found</h1>
        <p className="mt-2 text-xs font-bold opacity-60">{error || "This event link may have changed."}</p>
        <Link href="/organizer" className="mt-4 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-5 py-2 text-xs font-bold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isOwner = auth.userId === event.organizerId;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md bubbly-card bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)]">
          <ShieldAlert size={22} />
        </div>
        <h1 className="font-display text-2xl font-bold">Not your event</h1>
        <p className="mt-2 text-xs font-bold opacity-60">
          Only <span className="font-bold">{event.organizerName}</span> can manage this event. Sign in with the organizer account to access this dashboard.
        </p>
        <Link href={`/app/event/${event.id}`} className="mt-4 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-5 py-2 text-xs font-bold">
          View attendee page
        </Link>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${event.shareUrl}` : event.shareUrl;
  const totalXp = event.missions.reduce((sum, mission) => sum + mission.xpReward, 0);

  const stats = [
    { label: "Attendees", value: `${event.attendees}/${event.maxAttendees}`, icon: <Users size={18} />, color: "var(--color-pastel-blue)" },
    { label: "Missions", value: event.missions.length.toString(), icon: <Target size={18} />, color: "var(--color-pastel-green)" },
    { label: "Total XP", value: totalXp.toLocaleString(), icon: <Trophy size={18} />, color: "var(--color-pastel-yellow)" },
    { label: "Top score", value: leaderboard[0]?.xp?.toLocaleString() ?? "—", icon: <Trophy size={18} />, color: "var(--color-pastel-purple)" },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      <Link href="/organizer" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bubbly-card bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-2 py-0.5 text-[10px] font-bold">
              {event.category}
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
            <p className="mt-2 text-xs font-bold opacity-60 sm:text-sm">{event.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold opacity-70 sm:text-xs">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {event.startDate} → {event.endDate}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/40 bg-[var(--color-bg-base)] p-3">
          <span className="text-[10px] font-bold opacity-60">Share link</span>
          <span className="truncate font-mono text-[11px] font-bold">{shareUrl}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                },
                () => undefined,
              );
            }}
            className="ml-auto rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <Link
            href={event.shareUrl}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1 text-[10px] font-bold"
          >
            Open <ExternalLink size={10} />
          </Link>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="bubbly-card p-3 sm:p-4" style={{ backgroundColor: stat.color }}>
            <div className="mb-1.5">{stat.icon}</div>
            <p className="font-display text-lg font-bold sm:text-2xl">{stat.value}</p>
            <p className="text-[10px] font-bold opacity-70 sm:text-xs">{stat.label}</p>
          </div>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Missions</h2>
        <div className="bubbly-card bg-white p-3 sm:p-4">
          {event.missions.length === 0 ? (
            <p className="text-xs font-bold opacity-60">No missions configured yet.</p>
          ) : (
            <ul className="space-y-2">
              {event.missions.map((mission) => (
                <li key={mission.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold sm:text-sm">{mission.title}</p>
                    <p className="truncate text-[10px] font-bold opacity-60">{mission.proofType} · {mission.proofLocation ?? "Anywhere"}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2 py-0.5 text-[10px] font-bold">
                    +{mission.xpReward} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Mission QR codes</h2>
        <MissionQRCodePanel
          eventId={event.id}
          eventTitle={event.title}
          missions={event.missions.map((mission) => ({
            id: mission.id,
            title: mission.title,
            type: mission.type,
            proofType: mission.proofType,
            xpReward: mission.xpReward,
          }))}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Top participants</h2>
        <div className="bubbly-card bg-white p-3 sm:p-4">
          {leaderboard.length === 0 ? (
            <p className="text-xs font-bold opacity-60">No proof-backed rankings yet. Submissions from attendees will populate this list.</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.slice(0, 10).map((entry) => (
                <li key={entry.userId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold opacity-50">#{entry.rank}</span>
                    <span>{entry.avatar}</span>
                    <span className="truncate text-xs font-bold">{entry.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold opacity-70">{entry.xp} XP</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>
    </div>
  );
}
