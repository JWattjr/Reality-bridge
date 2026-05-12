import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle,
  Database,
  MapPinCheck,
  QrCode,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

const TRUST_SIGNALS = [
  {
    icon: ShieldCheck,
    title: "Proof records, not promises",
    body: "Every completed mission creates a receipt with event, user, mission, proof type, timestamp, location, and XP earned.",
    color: "var(--color-pastel-green)",
  },
  {
    icon: Database,
    title: "Evidence stored on 0G",
    body: "Proof JSON, photo evidence, and reputation credentials are stored on 0G Storage so activity can be checked later.",
    color: "var(--color-pastel-blue)",
  },
  {
    icon: Wallet,
    title: "Wallet-owned activity",
    body: "Mission proofs are scoped to the signed-in Privy wallet, and proof anchors are paid from the user's own wallet.",
    color: "var(--color-pastel-purple)",
  },
  {
    icon: CheckCircle,
    title: "On-chain anchors",
    body: "Proof roots can be anchored through the ProofPlay registry contract, giving each proof a public transaction trail.",
    color: "var(--color-pastel-yellow)",
  },
];

const WHO_IT_IS_FOR = [
  {
    title: "Attendees",
    body: "Turn check-ins, booth visits, quizzes, photos, and real-world connections into XP, badges, and portable reputation.",
  },
  {
    title: "Organizers",
    body: "Create events with missions, share registration links, and see proof-backed engagement instead of vanity attendance.",
  },
  {
    title: "Sponsors",
    body: "Reward people who actually visited, learned, participated, or contributed on the ground.",
  },
];

const FLOW = [
  {
    icon: QrCode,
    title: "Check in",
    body: "Users arrive at a venue and prove presence with QR, NFC, organizer approval, quiz codes, or photo proof.",
  },
  {
    icon: Trophy,
    title: "Earn reputation",
    body: "Completed missions unlock XP, badges, rank, event history, and friend graph signals.",
  },
  {
    icon: Brain,
    title: "Build a record",
    body: "0G Compute can summarize verified activity into a readable reputation credential.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          <ArrowLeft size={14} />
          Back home
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-xs font-bold">
              <MapPinCheck size={14} />
              About ProofPlay
            </p>
            <h1
              className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.92] text-[var(--color-primary-900)] sm:text-6xl"
              style={{ textShadow: "3px 3px 0px #fff" }}
            >
              Gamified participation layer for physical events.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-relaxed opacity-70 sm:text-lg">
              ProofPlay helps communities turn real-world event activity into missions, XP, badges,
              and reputation that can be verified after the event is over.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-full border-3 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                Explore events
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/organizer/create"
                className="inline-flex items-center justify-center gap-2 rounded-full border-3 border-[var(--color-primary-900)] bg-white px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                Create an event
              </Link>
            </div>
          </div>

          <div className="bubbly-card bg-white p-5">
            <p className="font-display text-2xl font-bold">The problem</p>
            <p className="mt-3 text-sm font-bold leading-relaxed opacity-70">
              Most people walk into physical events without a clear path. They do not know who to meet,
              which booths matter, what sessions to join, or how to turn attendance into real opportunity.
              That confusion can make even good events feel passive, boring, or easy to waste.
            </p>
            <div className="mt-4 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] p-4">
              <p className="text-xs font-bold uppercase opacity-60">Our answer</p>
              <p className="mt-1 font-display text-2xl font-bold leading-tight">
                A mission layer that guides people through events and turns participation into reputation.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {WHO_IT_IS_FOR.map((item) => (
            <div key={item.title} className="bubbly-card bg-white p-5">
              <p className="font-display text-2xl font-bold">{item.title}</p>
              <p className="mt-2 text-sm font-bold leading-relaxed opacity-65">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="mb-5 max-w-2xl">
            <p className="font-display text-3xl font-bold">How it works</p>
            <p className="mt-2 text-sm font-bold leading-relaxed opacity-65">
              ProofPlay is simple for users, useful for organizers, and verifiable for anyone who needs to trust the record.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FLOW.map((item) => (
              <div key={item.title} className="bubbly-card bg-white p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] shadow-[2px_2px_0px_0px_#312e81]">
                  <item.icon size={22} />
                </span>
                <p className="mt-4 font-display text-2xl font-bold">{item.title}</p>
                <p className="mt-2 text-sm font-bold leading-relaxed opacity-65">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 max-w-2xl">
            <p className="font-display text-3xl font-bold">Trust signals</p>
            <p className="mt-2 text-sm font-bold leading-relaxed opacity-65">
              The app is built so participation can be checked, owned, and reused instead of disappearing after an event.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal.title} className="bubbly-card bg-white p-5">
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] shadow-[2px_2px_0px_0px_#312e81]"
                    style={{ backgroundColor: signal.color }}
                  >
                    <signal.icon size={22} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-bold">{signal.title}</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed opacity-65">{signal.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="bubbly-card bg-[var(--color-pastel-yellow)] p-5">
            <div className="flex items-center gap-3">
              <Users size={24} />
              <p className="font-display text-2xl font-bold">The vision</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed opacity-75">
              Events should create lasting reputation, not just temporary attendance counts.
              ProofPlay is building a reputation network where physical contribution can travel
              across events, communities, sponsors, and protocols.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Layer" value="Participation" />
            <Metric label="Evidence" value="0G Storage" />
            <Metric label="Identity" value="Privy wallet" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-4 text-center shadow-[3px_3px_0px_0px_#312e81]">
      <p className="text-[10px] font-bold uppercase opacity-50">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
