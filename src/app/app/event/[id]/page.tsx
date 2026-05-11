"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { EVENTS, MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import type { LeaderboardEntry, Mission } from "@/lib/mock-data";
import { MapPin, CalendarDays, Users, Zap, ArrowLeft, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommunityEvent } from "@/lib/community-store";
import { EventIconBadge, MissionIconBadge } from "@/components/ProofPlayIcons";
import { MissionVerifyAction } from "@/components/MissionVerifyAction";
import { useMissionVerification } from "@/hooks/useMissionVerification";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const mockEvent = EVENTS.find((e) => e.id === eventId);
  const [liveEvent, setLiveEvent] = useState<CommunityEvent | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const event = mockEvent ?? liveEvent;
  const [checkedIn, setCheckedIn] = useState(mockEvent?.checkedIn ?? false);
  const {
    auth,
    proofsLoading,
    getMissionProof,
    submissionStatus,
    verifyMission,
    withProofStatus,
  } = useMissionVerification(eventId);

  useEffect(() => {
    if (mockEvent) return;

    fetch("/api/events")
      .then((response) => response.json())
      .then((data: { events?: CommunityEvent[] }) => {
        setLiveEvent(data.events?.find((item) => item.id === eventId) ?? null);
      })
      .catch(() => setLiveEvent(null));
  }, [eventId, mockEvent]);

  useEffect(() => {
    fetch(`/api/leaderboard?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { entries?: LeaderboardEntry[] }) => setLeaderboardEntries(data.entries ?? []))
      .catch(() => setLeaderboardEntries([]));
  }, [eventId]);

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="font-bold">Event not found</p>
        <Link href="/app" className="text-sm font-bold text-[var(--color-primary-500)] mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const baseEventMissions = mockEvent
    ? MISSIONS.filter((m) => m.eventId === eventId)
    : liveEvent?.missions.map((mission) => ({
        ...mission,
        eventId,
        status: "available" as const,
        sponsorTag: undefined,
        completionCount: 0,
        maxCompletions: 1,
      })) ?? [];
  const eventMissions = baseEventMissions.map((mission) => withProofStatus(mission as Mission));
  const checkInMission = eventMissions.find((mission) => mission.id === "m1" || mission.title.toLowerCase().includes("check in"));
  const checkInStatus = checkInMission ? submissionStatus[checkInMission.id] : undefined;
  const isCheckedIn = checkedIn || Boolean(checkInMission && getMissionProof(checkInMission.id));
  const checkInLabel = !auth.authenticated
    ? "Sign in to check in"
    : checkInStatus?.state === "submitting"
      ? "Uploading check-in proof..."
      : "Check In";
  const completedMissions = eventMissions.filter((m) => m.status === "completed").length;
  const earnedXp = eventMissions.filter((m) => m.status === "completed").reduce((sum, m) => sum + m.xpReward, 0);

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <Link href="/app" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Event Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bubbly-card p-5 relative overflow-hidden"
        style={{ backgroundColor: event.color }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-[var(--color-primary-900)]">
              {event.category}
            </span>
            <h1 className="font-display text-2xl font-bold mt-2 leading-tight">{event.title}</h1>
          </div>
          <EventIconBadge size="lg" />
        </div>

        <div className="space-y-1 text-xs font-bold opacity-80">
          <p className="flex items-center gap-1"><MapPin size={12} /> {event.location}</p>
          <p className="flex items-center gap-1"><CalendarDays size={12} /> {event.startDate} - {event.endDate}</p>
          <p className="flex items-center gap-1"><Users size={12} /> {event.attendees}/{event.maxAttendees} attending</p>
        </div>

        <p className="text-xs font-bold mt-3 opacity-70 leading-relaxed">{event.description}</p>

        <div className="flex gap-2 mt-4">
          {!isCheckedIn ? (
            <button
              disabled={checkInStatus?.state === "submitting"}
              onClick={() => {
                if (checkInMission) {
                  verifyMission(checkInMission);
                } else {
                  setCheckedIn(true);
                }
              }}
              className="flex-1 bg-[var(--color-primary-900)] text-white font-bold text-sm py-2.5 rounded-full border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
            >
              {checkInLabel}
            </button>
          ) : (
            <div className="flex-1 bg-white/60 backdrop-blur-sm font-bold text-sm py-2.5 rounded-full border-2 border-[var(--color-primary-900)] text-center">
              Checked In
            </div>
          )}
          <button className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border-2 border-[var(--color-primary-900)] flex items-center justify-center">
            <Share2 size={16} />
          </button>
        </div>
      </motion.div>

      {proofsLoading && (
        <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-xs font-bold opacity-70">
          Syncing your proof receipts from Supabase...
        </p>
      )}

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2"
      >
        <div className="bubbly-card p-2.5 text-center bg-[var(--color-pastel-blue)]">
          <p className="font-bold text-lg">{eventMissions.length}</p>
          <p className="text-[10px] font-bold opacity-70">Missions</p>
        </div>
        <div className="bubbly-card p-2.5 text-center bg-[var(--color-pastel-green)]">
          <p className="font-bold text-lg">{completedMissions}/{eventMissions.length}</p>
          <p className="text-[10px] font-bold opacity-70">Completed</p>
        </div>
        <div className="bubbly-card p-2.5 text-center bg-[var(--color-pastel-yellow)]">
          <p className="font-bold text-lg">{earnedXp}</p>
          <p className="text-[10px] font-bold opacity-70">XP Earned</p>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex justify-between text-xs font-bold opacity-60 mb-1">
          <span>Event Progress</span>
          <span>{eventMissions.length ? Math.round((completedMissions / eventMissions.length) * 100) : 0}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full border-2 border-[var(--color-primary-900)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--color-pastel-green)] to-[var(--color-pastel-blue)]"
            initial={{ width: 0 }}
            animate={{ width: `${eventMissions.length ? (completedMissions / eventMissions.length) * 100 : 0}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Mission List */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-lg font-bold mb-2">Missions</h2>
        <div className="space-y-2">
          {eventMissions.map((mission, i) => {
            const proof = getMissionProof(mission.id);
            const status = submissionStatus[mission.id];

            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={mission.status === "available" ? { y: -3, scale: 1.01 } : undefined}
                whileTap={{ scale: 0.985 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className={`bubbly-card premium-glint p-3 transition-all ${
                  mission.status === "completed"
                    ? "bg-green-50 opacity-80"
                    : mission.status === "locked"
                    ? "bg-gray-50 opacity-50"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MissionIconBadge title={mission.title} type={mission.type} proofType={mission.proofType} size="sm" />
                    <div className="min-w-0">
                      <p className={`font-bold text-xs truncate ${mission.status === "completed" ? "line-through" : ""}`}>
                        {mission.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <motion.span
                          className="text-[10px] font-bold text-[var(--color-primary-500)] flex items-center gap-0.5"
                          animate={mission.status === "available" ? { scale: [1, 1.08, 1] } : undefined}
                          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
                        >
                          <Zap size={8} /> +{mission.xpReward}
                        </motion.span>
                        <span className="text-[8px] font-bold bg-white px-1 py-0.5 rounded-full border border-[var(--color-primary-900)] flex items-center gap-0.5">
                          <ShieldCheck size={8} /> {PROOF_TYPE_COPY[mission.proofType].label}
                        </span>
                        {mission.sponsorTag && (
                          <span className="text-[8px] font-bold bg-[var(--color-pastel-yellow)] px-1 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                            {mission.sponsorTag}
                          </span>
                        )}
                        {proof && (
                          <span className="text-[8px] font-bold text-green-700 bg-green-100 px-1 py-0.5 rounded-full border border-green-700">
                            0G {shortHash(proof.storage.rootHash)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <MissionVerifyAction
                    mission={mission}
                    status={status}
                    onVerify={verifyMission}
                    compact
                  />
                </div>
                {status?.message && (
                  <p className={`mt-2 text-[10px] font-bold ${status.state === "error" ? "text-red-600" : "text-green-700"}`}>
                    {status.message}
                  </p>
                )}
                {proof?.mediaStorage && auth.userId && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-green-700">
                    <span>Media on 0G: {shortHash(proof.mediaStorage.rootHash)}</span>
                    <a
                      href={`/api/proofs/${proof.id}/media?${new URLSearchParams({ userId: auth.userId }).toString()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-green-700 bg-green-100 px-2 py-0.5"
                    >
                      View media
                    </a>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Event Leaderboard Preview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex justify-between items-end mb-2">
          <h2 className="font-display text-lg font-bold">Top Participants</h2>
          <Link href="/app/leaderboard" className="text-xs font-bold opacity-60 hover:opacity-100">
            Full board
          </Link>
        </div>
        <div className="space-y-1.5">
          {leaderboardEntries.slice(0, 5).map((entry) => (
            <div key={entry.userId} className="rounded-2xl border-2 border-[var(--color-primary-900)] p-2.5 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs w-5 text-center opacity-50">#{entry.rank}</span>
                <span className="text-sm">{entry.avatar}</span>
                <span className="font-bold text-xs">{entry.name}</span>
              </div>
              <span className="font-bold text-xs opacity-70">{entry.xp} XP</span>
            </div>
          ))}
          {leaderboardEntries.length === 0 && (
            <div className="rounded-2xl border-2 border-[var(--color-primary-900)] p-3 bg-white text-center">
              <p className="text-xs font-bold opacity-60">No proof-backed rankings yet.</p>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
