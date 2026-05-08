import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Organizer Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-[var(--color-primary-900)] shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] flex items-center justify-center">
              🏆
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-[var(--color-primary-900)]">
              ProofPlay
            </span>
            <span className="text-xs font-bold bg-[var(--color-pastel-yellow)] px-2 py-0.5 rounded-full border border-[var(--color-primary-900)]">
              Organizer
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <ThemeSwitcher compact />
            <Link href="/organizer" className="text-sm font-bold hover:text-[var(--color-primary-500)] transition-colors">Dashboard</Link>
            <Link href="/organizer/create" className="text-sm font-bold bg-[var(--color-pastel-pink)] px-4 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] shadow-[2px_2px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-none transition-all">
              + New Event
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
