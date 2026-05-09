"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, LogIn, LogOut, Wallet } from "lucide-react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

type WalletLoginButtonProps = {
  compact?: boolean;
  className?: string;
};

export default function WalletLoginButton({ compact = false, className = "" }: WalletLoginButtonProps) {
  const auth = useProofPlayAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!auth.configured) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[var(--color-primary-900)] ${className}`}
        title="Add NEXT_PUBLIC_PRIVY_APP_ID in Vercel to enable Privy login"
      >
        <Wallet size={compact ? 12 : 14} />
        {compact ? "Set Privy" : "Set Privy env"}
      </span>
    );
  }

  if (!auth.ready) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white/75 px-3 py-1.5 text-[10px] font-bold ${className}`}>
        <Wallet size={compact ? 12 : 14} />
        Loading
      </span>
    );
  }

  if (auth.authenticated) {
    const walletAddress = auth.walletAddress ?? auth.userId ?? "";
    const explorerUrl = walletAddress ? `https://chainscan.0g.ai/address/${walletAddress}` : "";

    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none ${className}`}
          title="Open wallet details"
        >
          <Wallet size={compact ? 12 : 14} />
          <span>{compact ? auth.displayName : `Wallet ${auth.displayName}`}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-72 rounded-3xl border-3 border-[var(--color-primary-900)] bg-white p-3 text-left shadow-[4px_4px_0px_0px_#312e81]">
            <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3">
              <p className="text-[10px] font-bold uppercase opacity-60">Privy wallet</p>
              <p className="mt-1 break-all text-xs font-bold">{walletAddress}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!walletAddress) return;
                  await navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-2 text-[10px] font-bold"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-3 py-2 text-[10px] font-bold"
                >
                  Explorer
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <p className="mt-3 rounded-2xl bg-[var(--color-bg-base)] p-3 text-[10px] font-bold leading-relaxed opacity-70">
              Send $0G to this address for user-paid gas. ProofPlay still uses the server wallet for backend 0G Storage uploads.
            </p>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                auth.logout();
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-2 text-[10px] font-bold"
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={auth.login}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none ${className}`}
    >
      <LogIn size={compact ? 12 : 14} />
      {compact ? "Login" : "Sign in"}
    </button>
  );
}
