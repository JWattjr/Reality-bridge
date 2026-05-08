"use client";

import Navbar from "@/components/Navbar";
import { CURRENT_USER } from "@/lib/mock-data";
import { Trophy } from "lucide-react";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] pb-24">
      <div className="max-w-md mx-auto min-h-screen border-x-4 border-[var(--color-primary-900)] bg-white relative">
        {/* Top bar */}
        <div className="h-14 bg-[var(--color-pastel-blue)] border-b-4 border-[var(--color-primary-900)] flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
          <Link href="/" className="font-display font-bold text-lg tracking-tight text-[var(--color-primary-900)] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] flex items-center justify-center">
              <Trophy size={14} />
            </div>
            ProofPlay
          </Link>
          <Link href="/app/profile" className="font-bold flex items-center gap-1.5 bg-white border-2 border-[var(--color-primary-900)] px-2.5 py-1 rounded-full shadow-[2px_2px_0px_0px_#312e81] text-xs hover:translate-y-0.5 hover:shadow-none transition-all">
            <span>{CURRENT_USER.avatar}</span>
            <span>⭐ {CURRENT_USER.totalXp.toLocaleString()}</span>
          </Link>
        </div>

        <main className="p-4">
          {children}
        </main>

        <Navbar />
      </div>
    </div>
  );
}
