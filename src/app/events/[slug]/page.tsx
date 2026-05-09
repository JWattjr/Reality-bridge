import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { listCommunityEvents } from "@/lib/community-store";
import { EventIconBadge, MissionIconBadge } from "@/components/ProofPlayIcons";

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();

  const { slug } = await params;
  const events = await listCommunityEvents();
  const event = events.find((item) => item.slug === slug || item.id === slug);

  if (!event) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-base)] px-4 py-16 text-center">
        <div className="mx-auto max-w-md bubbly-card bg-white p-6">
          <h1 className="font-display text-3xl font-bold">Event not found</h1>
          <p className="mt-2 text-sm font-bold opacity-60">This ProofPlay event link may have changed.</p>
          <Link href="/app" className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-5 py-2 text-sm font-bold">
            Browse events
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-3xl bubbly-card bg-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-3 py-1 text-xs font-bold">
              {event.category}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-[var(--color-primary-900)] sm:text-5xl">
              {event.title}
            </h1>
          </div>
          <EventIconBadge size="lg" />
        </div>

        <p className="mt-4 text-sm font-bold leading-relaxed opacity-70">{event.description}</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <InfoPill icon={<MapPin size={14} />} label={event.location} />
          <InfoPill icon={<CalendarDays size={14} />} label={`${event.startDate} - ${event.endDate}`} />
          <InfoPill icon={<Users size={14} />} label={`${event.attendees}/${event.maxAttendees} registered`} />
        </div>

        <div className="mt-6 rounded-3xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-4">
          <p className="font-display text-xl font-bold">Venue missions</p>
          <div className="mt-3 space-y-2">
            {event.missions.map((mission) => (
              <div key={mission.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3">
                <MissionIconBadge title={mission.title} type={mission.type} proofType={mission.proofType} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{mission.title}</p>
                  <p className="text-xs font-bold opacity-50">{mission.proofType} - {mission.xpReward} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/app" className="inline-flex flex-1 justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81]">
            Register in app
          </Link>
          <Link href="/proofs" className="inline-flex flex-1 justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81]">
            View proof ledger
          </Link>
        </div>
      </section>
    </main>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] p-3 text-xs font-bold">
      {icon}
      <span>{label}</span>
    </div>
  );
}
