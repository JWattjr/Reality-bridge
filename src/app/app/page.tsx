"use client";

import Link from "next/link";
import { QrCode, ArrowRight, CheckCircle, MapPin, CalendarDays, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { EVENTS, MISSIONS, CURRENT_USER, PROOF_TYPE_COPY, getLevelForXp, getProofRecordForMission, shortHash } from "@/lib/mock-data";

const event = EVENTS[0];
const eventMissions = MISSIONS.filter((m) => m.eventId === event.id);
const completedCount = eventMissions.filter((m) => m.status === "completed").length;
const levelInfo = getLevelForXp(CURRENT_USER.totalXp);

export default function AppDashboard() {
  return (
    <div className="space-y-6">

      {/* Level Progress */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <div className="bubbly-card p-4 bg-white">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">Level {levelInfo.level} — {levelInfo.title}</span>
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

      {/* Active Event Card */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 flex items-center gap-2">
          📍 Current Event
        </h2>
        <div className="bubbly-card p-4 bg-[var(--color-pastel-purple)] relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-display font-bold text-xl leading-tight">{event.title}</h3>
              <p className="font-bold text-xs flex items-center gap-1 mt-1 opacity-80">
                <MapPin size={12} /> {event.location}
              </p>
              <p className="font-bold text-xs flex items-center gap-1 opacity-80">
                <CalendarDays size={12} /> {event.startDate} — {event.endDate}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bubbly-border flex items-center justify-center text-2xl shrink-0">
              {event.emoji}
            </div>
          </div>

          <div className="bg-white/50 p-3 rounded-xl border-2 border-[var(--color-primary-900)] flex justify-between items-center backdrop-blur-sm">
            <span className="font-bold text-xs">✅ Checked In • {completedCount}/{eventMissions.length} Missions</span>
            <Link href={`/app/event/${event.id}`} className="bg-[var(--color-primary-900)] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[var(--color-primary-700)] transition-colors">
              View →
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <motion.section
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button className="bubbly-card p-4 bg-[var(--color-pastel-pink)] flex flex-col items-center justify-center gap-2 text-center transition-all h-20 active:translate-y-0.5 active:shadow-none">
          <QrCode size={22} />
          <span className="font-bold text-xs">Scan Proof</span>
        </button>
        <button className="bubbly-card p-4 bg-[var(--color-pastel-yellow)] flex flex-col items-center justify-center gap-2 text-center transition-all h-20 active:translate-y-0.5 active:shadow-none">
          <span className="text-xl">📸</span>
          <span className="font-bold text-xs">Photo Proof</span>
        </button>
      </motion.section>

      {/* Active Missions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-end mb-2">
          <h2 className="font-display text-lg font-bold">🚀 Missions</h2>
          <Link href="/app/missions" className="text-xs font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
            See all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="space-y-2">
          {eventMissions.slice(0, 5).map((mission, i) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={mission.status === "available" ? { y: -3, scale: 1.01 } : undefined}
              whileTap={{ scale: 0.985 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className={`premium-glint rounded-2xl border-2 border-[var(--color-primary-900)] p-3 flex items-center justify-between transition-all ${
                mission.status === "completed"
                  ? "bg-gray-50 opacity-60"
                  : mission.status === "locked"
                  ? "bg-gray-50 opacity-40"
                  : "bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#312e81]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {mission.status === "completed" ? (
                  <CheckCircle size={20} className="text-green-500 shrink-0" />
                ) : mission.status === "locked" ? (
                  <span className="text-lg shrink-0">🔒</span>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${mission.status === "completed" ? "line-through" : ""}`}>{mission.title}</p>
                  <div className="flex items-center gap-2">
                    <motion.span
                      className="text-xs font-bold text-[var(--color-primary-500)] flex items-center gap-0.5"
                      animate={mission.status === "available" ? { scale: [1, 1.08, 1] } : undefined}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
                    >
                      <Zap size={10} /> +{mission.xpReward} XP
                    </motion.span>
                    <span className="text-[10px] font-bold bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                      {PROOF_TYPE_COPY[mission.proofType].label}
                    </span>
                    {mission.sponsorTag && (
                      <span className="text-[10px] font-bold bg-[var(--color-pastel-yellow)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                        {mission.sponsorTag}
                      </span>
                    )}
                    {mission.status === "completed" && getProofRecordForMission(mission.id) && (
                      <span className="text-[10px] font-bold text-green-700">
                        0G {shortHash(getProofRecordForMission(mission.id)!.storage.rootHash)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {mission.status === "available" && (
                <motion.button
                  whileHover={{ x: 2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="bg-[var(--color-pastel-blue)] font-bold text-[10px] px-2.5 py-1 border-2 border-[var(--color-primary-900)] rounded-full hover:bg-[var(--color-primary-900)] hover:text-white transition-colors shrink-0"
                >
                  {PROOF_TYPE_COPY[mission.proofType].action}
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Upcoming Events */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="font-display text-lg font-bold mb-2">📅 Upcoming Events</h2>
        <div className="space-y-2">
          {EVENTS.filter((e) => !e.checkedIn).slice(0, 3).map((ev) => (
            <Link key={ev.id} href={`/app/event/${ev.id}`} className="bubbly-card p-3 bg-white flex items-center gap-3 transition-all active:translate-y-0.5 active:shadow-none block">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 border-[var(--color-primary-900)] shrink-0" style={{ backgroundColor: ev.color }}>
                {ev.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{ev.title}</p>
                <p className="text-xs font-bold opacity-60">{ev.startDate} • {ev.location}</p>
              </div>
              <ArrowRight size={16} className="opacity-40 shrink-0" />
            </Link>
          ))}
        </div>
      </motion.section>

    </div>
  );
}
