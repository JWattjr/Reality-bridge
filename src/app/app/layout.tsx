"use client";

import Navbar from "@/components/Navbar";
import WalletLoginButton from "@/components/WalletLoginButton";
import { Calendar, LockKeyhole, QrCode, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

const DESKTOP_NAV = [
  { href: "/app", label: "Events", icon: Calendar, match: (p: string) => p === "/app" },
  { href: "/app/missions", label: "Missions", icon: QrCode, match: (p: string) => p.startsWith("/app/missions") },
  { href: "/app/leaderboard", label: "Rank", icon: Trophy, match: (p: string) => p.startsWith("/app/leaderboard") },
  { href: "/app/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/app/profile") },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useProofPlayAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] pb-24 lg:pb-8">
      <div className="relative mx-auto min-h-screen max-w-md border-x-4 border-[var(--color-primary-900)] bg-white lg:max-w-none lg:border-x-0 lg:bg-transparent">
        <div className="sticky top-0 z-40 border-b-4 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] shadow-sm">
          <div className="flex h-14 items-center justify-between gap-2 px-3 lg:mx-auto lg:h-16 lg:max-w-6xl lg:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-[var(--color-primary-900)] lg:text-xl"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] lg:h-8 lg:w-8">
                <Trophy size={14} />
              </div>
              <span className="truncate">ProofPlay</span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {DESKTOP_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? "bg-[var(--color-primary-900)] text-white shadow-none"
                        : "bg-white shadow-[2px_2px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-none"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5">
              <WalletLoginButton compact />
              <Link
                href="/app/profile"
                className="hidden items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none min-[390px]:flex lg:hidden"
              >
                <User size={13} />
                <span>Profile</span>
              </Link>
            </div>
          </div>
        </div>

        <main className="px-3 py-4 min-[380px]:px-4 lg:mx-auto lg:max-w-6xl lg:px-8 lg:py-8">
          {!auth.ready ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary-900)] border-t-[var(--color-pastel-blue)]" />
            </div>
          ) : !auth.authenticated ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="bubbly-card bg-white p-8 text-center max-w-sm mx-auto">
                <LockKeyhole className="mx-auto text-[var(--color-primary-900)]" size={32} />
                <p className="mt-4 font-display text-2xl font-bold">Sign in to access events</p>
                <p className="mt-2 text-sm font-bold opacity-60">
                  Sign in with your email, Google, or Twitter account to access the platform.
                </p>
                <button
                  type="button"
                  onClick={auth.login}
                  className="mt-6 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-6 py-2.5 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  Sign in
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        <Navbar />
      </div>
    </div>
  );
}
