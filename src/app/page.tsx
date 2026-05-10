"use client";

import BlobBackground from "@/components/BlobBackground";
import DottedGlobe from "@/components/DottedGlobe";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Zap, Trophy, QrCode, Users, ArrowRight, Star, Shield, Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: <QrCode size={28} />, title: "QR Check-In", description: "Instant event entry with a single scan", color: "var(--color-pastel-blue)" },
  { icon: <Zap size={28} />, title: "XP & Missions", description: "Complete challenges to earn experience points", color: "var(--color-pastel-yellow)" },
  { icon: <Trophy size={28} />, title: "Badges & Rank", description: "Collect achievements and climb the leaderboard", color: "var(--color-pastel-pink)" },
  { icon: <Users size={28} />, title: "Team Play", description: "Join forces with others for bonus rewards", color: "var(--color-pastel-green)" },
  { icon: <Shield size={28} />, title: "Verified Proof", description: "Tamper-proof record of what you actually did", color: "var(--color-pastel-purple)" },
  { icon: <Globe size={28} />, title: "Portable Rep", description: "Carry your reputation across all events", color: "var(--color-pastel-blue)" },
];

const STEPS = [
  { step: "1", title: "Scan In", description: "Arrive at the event and scan the QR code" },
  { step: "2", title: "Complete Missions", description: "Visit booths, attend talks, answer quizzes" },
  { step: "3", title: "Earn & Level Up", description: "Collect XP, unlock badges, climb the ranks" },
  { step: "4", title: "Build Reputation", description: "Your participation history becomes portable" },
];

const HERO_WORDS = ["PARTICIPATION", "CONTRIBUTION", "REPUTATION"];

export default function Home() {
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const heroWord = HERO_WORDS[heroWordIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % HERO_WORDS.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden">
      <BlobBackground />
      <Navbar />

      <section className="min-h-[100svh] flex flex-col items-center justify-center px-4 pt-24 pb-24 text-center relative z-10 overflow-hidden sm:px-6 md:pt-28">
        <DottedGlobe />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-bg-base)] to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-5xl"
        >
          <div className="inline-flex max-w-[92vw] items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full border-2 border-[var(--color-primary-900)] shadow-[2px_2px_0px_0px_#312e81] mb-5 sm:px-4 sm:mb-6">
            <Star size={14} fill="var(--color-primary-500)" className="text-[var(--color-primary-500)] shrink-0" />
            <span className="text-[11px] font-bold leading-tight sm:text-xs">The Reputation Layer for Physical Communities</span>
          </div>

          <h1
            className="font-display text-[clamp(2.35rem,12.2vw,8rem)] font-bold tracking-tight text-[var(--color-primary-900)] leading-[0.86] sm:text-[clamp(3rem,16vw,8rem)]"
            style={{
              textShadow: "3px 3px 0px #fff, -1.5px -1.5px 0px #fff, 1.5px -1.5px 0px #fff, -1.5px 1.5px 0px #fff",
              WebkitTextStroke: "1.5px var(--color-primary-900)",
            }}
          >
            <span className="block">PROOF IS</span>
            <span className="block">FOR</span>
            <br />
            <motion.span
              key={heroWord}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="block text-[clamp(2.35rem,12.2vw,8rem)] text-[var(--color-pastel-purple)] sm:text-[clamp(3rem,16vw,8rem)]"
              style={{ WebkitTextStroke: "1.2px var(--color-primary-900)" }}
            >
              {heroWord}
            </motion.span>
          </h1>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center px-4 sm:mt-10 sm:px-0">
            <Link
              href="/app"
              className="bg-[var(--color-pastel-pink)] text-base sm:text-lg px-7 py-3.5 rounded-full border-3 border-[var(--color-primary-900)] font-bold shadow-[4px_4px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#312e81] transition-all flex items-center justify-center gap-2"
            >
              Enter App
            </Link>
            <Link
              href="/organizer"
              className="bg-white/90 text-base sm:text-lg px-7 py-3.5 rounded-full border-3 border-[var(--color-primary-900)] font-bold shadow-[4px_4px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#312e81] transition-all flex items-center justify-center gap-2"
            >
              Create Event
            </Link>
            <Link
              href="/proofs"
              className="bg-[var(--color-pastel-green)] text-base sm:text-lg px-7 py-3.5 rounded-full border-3 border-[var(--color-primary-900)] font-bold shadow-[4px_4px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#312e81] transition-all flex items-center justify-center gap-2"
            >
              View Proofs
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 left-4 right-4 flex flex-wrap justify-center gap-x-4 gap-y-1 font-bold text-[11px] sm:bottom-8 sm:gap-8 sm:text-sm"
          style={{ textShadow: "1px 1px 0px #fff" }}
        >
          <span>1,234 Events Hosted</span>
          <span>450K+ Badges Minted</span>
          <span className="hidden md:inline">46,209 Organizers</span>
        </motion.div>
      </section>

      <section className="relative z-10 px-4 py-14 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl" style={{ textShadow: "3px 3px 0px #fff" }}>
            Turn event activity into missions, XP, badges, and portable reputation.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm font-bold leading-relaxed opacity-70 sm:text-lg">
            ProofPlay turns contribution into stored evidence with real-world missions and verifiable proof records on 0G Storage.
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 py-16 px-4 sm:px-6 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl md:text-5xl font-bold text-center mb-10 sm:mb-16"
            style={{ textShadow: "3px 3px 0px #fff" }}
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bubbly-card p-4 sm:p-5 bg-white text-center"
              >
                <div className="w-8 h-8 mx-auto rounded-full bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] flex items-center justify-center font-bold text-sm mb-3">
                  {s.step}
                </div>
                <h3 className="font-display font-bold text-lg">{s.title}</h3>
                <p className="text-xs font-bold opacity-60 mt-1">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 px-4 sm:px-6 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl md:text-5xl font-bold text-center mb-10 sm:mb-16"
            style={{ textShadow: "3px 3px 0px #fff" }}
          >
            Features
          </motion.h2>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bubbly-card p-4 sm:p-5 bg-white"
                style={{ borderColor: "var(--color-primary-900)" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl border-2 border-[var(--color-primary-900)] flex items-center justify-center mb-3"
                  style={{ backgroundColor: feature.color }}
                >
                  {feature.icon}
                </div>
                <h3 className="font-display font-bold text-lg">{feature.title}</h3>
                <p className="text-xs font-bold opacity-60 mt-1">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 px-4 sm:px-6 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto bubbly-card p-6 sm:p-10 bg-gradient-to-br from-[var(--color-pastel-purple)] to-[var(--color-pastel-pink)] text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Ready to prove it?</h2>
          <p className="font-bold opacity-70 mb-6">Start turning real event contributions into portable reputation.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/app" className="bg-white px-8 py-3 rounded-full border-3 border-[var(--color-primary-900)] font-bold shadow-[3px_3px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#312e81] transition-all flex items-center justify-center gap-2">
              Join as Attendee <ArrowRight size={16} />
            </Link>
            <Link href="/organizer/create" className="bg-[var(--color-primary-900)] text-white px-8 py-3 rounded-full border-3 border-[var(--color-primary-900)] font-bold hover:bg-[var(--color-primary-700)] transition-all flex items-center justify-center gap-2">
              Host an Event
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 py-8 px-6 text-center border-t-3 border-[var(--color-primary-900)]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] flex items-center justify-center">
            🏆
          </div>
          <span className="font-display font-bold text-lg">ProofPlay</span>
        </div>
        <p className="text-xs font-bold opacity-40">© 2026 ProofPlay. Proof of Participation for everyone.</p>
      </footer>
    </main>
  );
}
