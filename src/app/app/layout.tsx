"use client";

import Navbar from "@/components/Navbar";
import WalletLoginButton from "@/components/WalletLoginButton";
import { Trophy, User, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useProofPlayAuth();

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] pb-24">
      <div className="relative mx-auto min-h-screen max-w-md border-x-4 border-[var(--color-primary-900)] bg-white">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b-4 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 shadow-sm">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-[var(--color-primary-900)]">
            <img src="/logo.png" alt="ProofPlay Logo" className="h-8 w-8 shrink-0 object-contain" />
            <span className="truncate">ProofPlay</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <WalletLoginButton compact />
            <Link href="/app/profile" className="hidden items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none min-[390px]:flex">
              <User size={13} />
              <span>Profile</span>
            </Link>
          </div>
        </div>

        <main className="px-3 py-4 min-[380px]:px-4">
          {!auth.ready ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary-900)] border-t-[var(--color-pastel-blue)]" />
            </div>
          ) : !auth.authenticated ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="bubbly-card bg-white p-8 text-center max-w-sm mx-auto">
                <LockKeyhole className="mx-auto text-[var(--color-primary-900)]" size={32} />
                <p className="mt-4 font-display text-2xl font-bold">Sign in required</p>
                <p className="mt-2 text-sm font-bold opacity-60">
                  Sign in with your email, Google, or Twitter account to access the platform.
                </p>
                <button
                  type="button"
                  onClick={auth.login}
                  className="mt-6 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-6 py-2.5 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  Sign in now
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
