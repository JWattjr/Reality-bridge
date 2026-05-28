"use client";

import {
  PrivyProvider,
  usePrivy,
  useWallets,
  type PrivyProviderProps,
} from "@privy-io/react-auth";
import { useCallback, useEffect, type ReactNode } from "react";
import { XLAYER_TESTNET } from "@/lib/xlayer";
import { useAuthStore } from "@/store/useAuthStore";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const xLayerTestnetChain = {
  id: XLAYER_TESTNET.chainId,
  name: XLAYER_TESTNET.name,
  nativeCurrency: {
    decimals: XLAYER_TESTNET.nativeCurrency.decimals,
    name: XLAYER_TESTNET.nativeCurrency.name,
    symbol: XLAYER_TESTNET.nativeCurrency.symbol,
  },
  rpcUrls: {
    default: {
      http: [...XLAYER_TESTNET.rpcUrls],
    },
  },
  blockExplorers: {
    default: {
      name: "OKX X Layer Explorer",
      url: XLAYER_TESTNET.explorerUrl,
    },
  },
};

const privyConfig: PrivyProviderProps["config"] = {
  loginMethods: ["email", "google", "twitter"],
  supportedChains: [xLayerTestnetChain],
  defaultChain: xLayerTestnetChain,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
    showWalletUIs: true,
  },
};

export function ProofPlayAuthProvider({ children }: { children: ReactNode }) {
  if (!privyAppId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken: privyGetAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const setAuthState = useAuthStore((state) => state.setAuthState);

  const walletAddress = user?.wallet?.address ?? null;
  const userId = authenticated ? walletAddress ?? user?.id ?? null : null;
  const displayName = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : user?.email?.address ?? "Signed in";

  const getAccessToken = useCallback(async () => {
    if (!authenticated) return null;
    try {
      return await privyGetAccessToken();
    } catch {
      return null;
    }
  }, [authenticated, privyGetAccessToken]);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  useEffect(() => {
    setAuthState({
      ready,
      configured: true,
      authenticated,
      userId,
      walletAddress,
      wallets,
      displayName,
      login,
      logout,
      getAccessToken,
      authHeaders,
    });
  }, [
    ready,
    authenticated,
    userId,
    walletAddress,
    wallets,
    displayName,
    login,
    logout,
    getAccessToken,
    authHeaders,
    setAuthState,
  ]);

  return <>{children}</>;
}
