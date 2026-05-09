"use client";

import Link from "next/link";
import { QrCode, User, Trophy, Calendar } from "lucide-react";
import { usePathname } from "next/navigation";
import WalletLoginButton from "@/components/WalletLoginButton";
import { motion } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  
  if (pathname === "/") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-pastel-purple)] bubbly-border flex items-center justify-center">
            <Trophy size={20} className="text-[var(--color-primary-900)]" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-[var(--color-primary-900)]" style={{ textShadow: "2px 2px 0px #fff" }}>
            ProofPlay
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-bold font-sans">
          <Link href="/about" className="hover:text-[var(--color-primary-500)] transition-colors">About</Link>
          <Link href="/events" className="hover:text-[var(--color-primary-500)] transition-colors">Events</Link>
          <Link href="/proofs" className="hover:text-[var(--color-primary-500)] transition-colors">Proofs</Link>
          <Link href="/communities" className="hover:text-[var(--color-primary-500)] transition-colors">Communities</Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <WalletLoginButton compact className="hidden min-[420px]:inline-flex" />
          <Link href="/app" className="bg-[var(--color-pastel-blue)] px-6 py-2 rounded-full bubbly-card font-bold hover:bubbly-card-hover transition-all inline-block">
            Launch App
          </Link>
        </div>
      </nav>
    );
  }

  // App Navigation
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white bubbly-border p-2 flex items-center gap-2 shadow-[var(--shadow-bubbly)]">
      <NavItem href="/app" icon={<Calendar size={24} />} label="Events" active={pathname === "/app"} />
      <NavItem href="/app/missions" icon={<QrCode size={24} />} label="Missions" active={pathname === "/app/missions"} />
      <NavItem href="/app/leaderboard" icon={<Trophy size={24} />} label="Rank" active={pathname === "/app/leaderboard"} />
      <NavItem href="/app/profile" icon={<User size={24} />} label="Profile" active={pathname === "/app/profile"} />
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all hover:bg-gray-100 overflow-hidden">
      {active && (
        <motion.div
          layoutId="bottom-nav-active"
          className="absolute inset-0 rounded-2xl bg-[var(--color-pastel-purple)] border-3 border-[var(--color-primary-900)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      <motion.span
        className="relative z-10 flex flex-col items-center"
        animate={{ y: active ? -1 : 0, scale: active ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
      >
        {icon}
        <span className="text-[10px] font-bold mt-1">{label}</span>
      </motion.span>
    </Link>
  );
}
