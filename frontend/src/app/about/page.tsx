import Link from "next/link";
import { ShieldCheck, Trophy, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-base px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/" className="text-xs font-bold opacity-60">Back home</Link>
        <section className="bubbly-card bg-white p-6">
          <h1 className="font-display text-4xl font-bold">ProofPlay X Cup</h1>
          <p className="mt-3 text-sm font-bold leading-relaxed opacity-70">
            ProofPlay X Cup is a minimal USDT-backed football prediction game where each match becomes a prediction event. Users back official admin-created markets, earn 1 point for every correct prediction, compete on match and PvP leaderboards, and can win rare football NFTs in selected events.
          </p>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <Card icon={<ShieldCheck size={20} />} title="USDT-backed" copy="Every prediction requires a USDT stake. There are no free votes." />
          <Card icon={<Trophy size={20} />} title="Simple scoring" copy="Correct Pick = 1 point. Wrong Pick = 0 points." />
          <Card icon={<Users size={20} />} title="Auto PvP" copy="Back at least one pick to enter automatic 1v1 PvP for the match." />
        </section>
      </div>
    </main>
  );
}

function Card({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="bubbly-card bg-white p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-primary-900 bg-pastel-green">
        {icon}
      </div>
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="mt-1 text-xs font-bold opacity-60">{copy}</p>
    </div>
  );
}
