import Link from "next/link";
import { Plus, Trophy } from "lucide-react";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <header className="sticky top-0 z-50 border-b-4 border-[var(--color-primary-900)] bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)]">
              <Trophy size={17} />
            </div>
            <span className="truncate font-display text-lg font-bold tracking-tight text-[var(--color-primary-900)] sm:text-xl">
              ProofPlay
            </span>
            <span className="hidden rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-2 py-0.5 text-xs font-bold sm:inline">
              Organizer
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link href="/organizer" className="whitespace-nowrap text-xs font-bold transition-colors hover:text-[var(--color-primary-500)] sm:text-sm">
              Dashboard
            </Link>
            <Link href="/organizer/create" className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:px-4 sm:text-sm">
              <Plus size={13} />
              <span>New Event</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
