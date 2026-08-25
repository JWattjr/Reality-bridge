"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { getAddress, isAddress } from "ethers";
import { BASE_SEPOLIA, type BaseWallet } from "@/lib/base-sepolia";
import { useAuthStore } from "@/store/useAuthStore";

type EthereumProvider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (value: unknown) => void) => void;
  removeListener?: (event: string, listener: (value: unknown) => void) => void;
};

function injectedProvider() {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

function firstAddress(value: unknown) {
  if (!Array.isArray(value) || typeof value[0] !== "string" || !isAddress(value[0])) {
    return null;
  }
  return getAddress(value[0]);
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return Number((error as { code: unknown }).code);
}

async function switchInjectedChain(provider: EthereumProvider, chainId: number) {
  const chainIdHex = `0x${chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA.chainIdHex,
          chainName: BASE_SEPOLIA.name,
          nativeCurrency: BASE_SEPOLIA.nativeCurrency,
          rpcUrls: [BASE_SEPOLIA.rpcUrl],
          blockExplorerUrls: [BASE_SEPOLIA.explorerUrl],
        },
      ],
    });
  }
}

function walletFor(provider: EthereumProvider, address: string): BaseWallet {
  return {
    address,
    getEthereumProvider: async () => provider,
    switchChain: async (chainId: number) => switchInjectedChain(provider, chainId),
  };
}

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const setAuthState = useAuthStore((state) => state.setAuthState);

  const disconnect = useCallback(() => {
    setAuthState({
      authenticated: false,
      walletAddress: null,
      wallet: null,
      displayName: "Connect wallet",
      error: null,
    });
  }, [setAuthState]);

  const connect = useCallback(async () => {
    const provider = injectedProvider();
    if (!provider) {
      setAuthState({ error: "Install an EVM browser wallet such as MetaMask or Rabby." });
      return;
    }

    setAuthState({ error: null });
    try {
      const address = firstAddress(
        await provider.request({ method: "eth_requestAccounts" }),
      );
      if (!address) throw new Error("The wallet did not return an account.");
      setAuthState({
        authenticated: true,
        walletAddress: address,
        wallet: walletFor(provider, address),
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        error: null,
      });
    } catch (error) {
      setAuthState({
        error: error instanceof Error ? error.message : "Wallet connection was cancelled.",
      });
    }
  }, [setAuthState]);

  useEffect(() => {
    const provider = injectedProvider();
    setAuthState({
      ready: true,
      configured: Boolean(provider),
      login: connect,
      logout: disconnect,
    });
    if (!provider) return;

    provider.request({ method: "eth_accounts" }).then((accounts) => {
      const address = firstAddress(accounts);
      if (!address) return;
      setAuthState({
        authenticated: true,
        walletAddress: address,
        wallet: walletFor(provider, address),
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    }).catch(() => undefined);

    const handleAccountsChanged = (accounts: unknown) => {
      const address = firstAddress(accounts);
      if (!address) {
        disconnect();
        return;
      }
      setAuthState({
        authenticated: true,
        walletAddress: address,
        wallet: walletFor(provider, address),
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        error: null,
      });
    };
    provider.on?.("accountsChanged", handleAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [connect, disconnect, setAuthState]);

  return <>{children}</>;
}
