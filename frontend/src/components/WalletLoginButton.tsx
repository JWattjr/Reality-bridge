"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, LogIn, LogOut, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletBalance } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import {
  claimTestUSDT,
  isXLayerContractsConfigured,
  xLayerExplorerAddress,
  type XLayerWallet,
} from "@/lib/xlayer";

type WalletLoginButtonProps = {
  compact?: boolean;
  className?: string;
};

export default function WalletLoginButton({ compact = false, className = "" }: WalletLoginButtonProps) {
  const auth = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState("");

  const walletAddress = auth.authenticated ? (auth.walletAddress ?? auth.userId ?? "") : "";
  const { data: walletBalances, isLoading: isBalanceLoading, isError: isBalanceError, refetch: refetchBalance } = useWalletBalance(walletAddress);

  const formattedBalance = walletBalances?.okb ? `${Number(walletBalances.okb).toLocaleString(undefined, {
    maximumFractionDigits: 5,
  })} OKB` : null;

  const usdtBalance = walletBalances?.usdt ?? null;
  const balanceStatus = isBalanceLoading ? "loading" : isBalanceError ? "error" : "idle";

  async function refreshBalance() {
    await refetchBalance();
  }

  if (!auth.configured) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-white/75 px-3 py-1.5 text-[10px] font-bold text-primary-900 ${className}`}
        title="Add NEXT_PUBLIC_PRIVY_APP_ID in Vercel to enable Privy login"
      >
        <Wallet size={compact ? 12 : 14} />
        {compact ? "Set Privy" : "Set Privy env"}
      </span>
    );
  }

  if (!auth.ready) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-white/75 px-3 py-1.5 text-[10px] font-bold ${className}`}>
        <Wallet size={compact ? 12 : 14} />
        Loading
      </span>
    );
  }

  if (auth.authenticated) {
    const explorerUrl = walletAddress ? xLayerExplorerAddress(walletAddress) : "";

    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-white px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none ${className}`}
          title="Open wallet details"
        >
          <Wallet size={compact ? 12 : 14} />
          <span>{compact ? auth.displayName : `Wallet ${auth.displayName}`}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-72 rounded-3xl border-3 border-primary-900 bg-white p-3 text-left shadow-[4px_4px_0px_0px_#312e81]">
            <div className="rounded-2xl border-2 border-primary-900 bg-pastel-green p-3">
              <p className="text-[10px] font-bold uppercase opacity-60">Privy wallet</p>
              <p className="mt-1 break-all text-xs font-bold">{walletAddress}</p>
            </div>

            <div className="mt-3 rounded-2xl border-2 border-primary-900 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-60">X Layer OKB</p>
                  <p className="mt-1 text-sm font-bold">
                    {balanceStatus === "loading"
                      ? "Checking..."
                      : balanceStatus === "error"
                        ? "Could not load"
                        : formattedBalance ?? "Not checked"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshBalance}
                  className="rounded-full border-2 border-primary-900 bg-pastel-purple px-3 py-1.5 text-[10px] font-bold"
                >
                  Refresh
                </button>
              </div>

              {isXLayerContractsConfigured() && (
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-60">Test USDT</p>
                    <p className="mt-1 text-sm font-bold">
                      {balanceStatus === "loading"
                        ? "Checking..."
                        : balanceStatus === "error"
                          ? "Could not load"
                          : usdtBalance !== null
                            ? `${Number(usdtBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`
                            : "Not checked"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isFauceting}
                    onClick={async () => {
                      const activeWallet = auth.wallets[0] as XLayerWallet | undefined;
                      if (!activeWallet) return;
                      setIsFauceting(true);
                      setFaucetStatus("Minting Test USDT...");
                      try {
                        await claimTestUSDT(activeWallet);
                        setFaucetStatus("Minted 1,000 USDT!");
                        await refreshBalance();
                      } catch (err) {
                        setFaucetStatus(err instanceof Error ? err.message : "Faucet error");
                      } finally {
                        setIsFauceting(false);
                        window.setTimeout(() => setFaucetStatus(""), 3500);
                      }
                    }}
                    className="rounded-full border-2 border-primary-900 bg-pastel-green px-3 py-1.5 text-[10px] font-bold disabled:opacity-50"
                  >
                    {isFauceting ? "Minting..." : "Mint USDT"}
                  </button>
                </div>
              )}
            </div>

            {faucetStatus && (
              <p className="mt-2 text-[10px] font-bold text-center text-primary-900 bg-pastel-blue p-2 rounded-xl border border-primary-900">
                {faucetStatus}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!walletAddress) return;
                  await navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-blue px-3 py-2 text-[10px] font-bold"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-yellow px-3 py-2 text-[10px] font-bold"
                >
                  Explorer
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <p className="mt-3 rounded-2xl bg-bg-base p-3 text-[10px] font-bold leading-relaxed opacity-70">
              Use X Layer testnet OKB for gas. Test USDT backs picks after the demo faucet is configured.
            </p>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                auth.logout();
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-primary-900 bg-white px-3 py-2 text-[10px] font-bold"
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
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-green px-3 py-1.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none ${className}`}
    >
      <LogIn size={compact ? 12 : 14} />
      {compact ? "Login" : "Sign in"}
    </button>
  );
}
