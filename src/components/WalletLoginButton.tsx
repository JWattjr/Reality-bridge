"use client";

import { LogIn, LogOut, Wallet } from "lucide-react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

type WalletLoginButtonProps = {
  compact?: boolean;
};

export default function WalletLoginButton({ compact = false }: WalletLoginButtonProps) {
  const auth = useProofPlayAuth();

  if (!auth.configured) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[var(--color-primary-900)]"
        title="Add NEXT_PUBLIC_PRIVY_APP_ID in Vercel to enable Privy login"
      >
        <Wallet size={compact ? 12 : 14} />
        {compact ? "Privy" : "Privy not set"}
      </span>
    );
  }

  if (!auth.ready) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white/75 px-3 py-1.5 text-[10px] font-bold">
        <Wallet size={compact ? 12 : 14} />
        Loading
      </span>
    );
  }

  if (auth.authenticated) {
    return (
      <button
        type="button"
        onClick={auth.logout}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        title="Disconnect wallet"
      >
        <LogOut size={compact ? 12 : 14} />
        <span>{compact ? auth.displayName : `Wallet ${auth.displayName}`}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={auth.login}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
    >
      <LogIn size={compact ? 12 : 14} />
      {compact ? "Login" : "Sign in"}
    </button>
  );
}
