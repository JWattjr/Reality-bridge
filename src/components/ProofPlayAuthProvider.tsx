"use client";

import {
  PrivyProvider,
  usePrivy,
  type PrivyProviderProps,
} from "@privy-io/react-auth";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

type ProofPlayAuth = {
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  displayName: string;
  login: () => void;
  logout: () => void;
};

const fallbackAuth: ProofPlayAuth = {
  ready: true,
  configured: false,
  authenticated: false,
  userId: null,
  walletAddress: null,
  displayName: "Connect wallet",
  login: () => undefined,
  logout: () => undefined,
};

const ProofPlayAuthContext = createContext<ProofPlayAuth>(fallbackAuth);

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

const privyConfig: PrivyProviderProps["config"] = {
  loginMethods: ["wallet", "email", "google", "twitter"],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
};

export function ProofPlayAuthProvider({ children }: { children: ReactNode }) {
  if (!privyAppId) {
    return (
      <ProofPlayAuthContext.Provider value={fallbackAuth}>
        {children}
      </ProofPlayAuthContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId || undefined}
      config={privyConfig}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}

export function useProofPlayAuth() {
  return useContext(ProofPlayAuthContext);
}

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const walletAddress = user?.wallet?.address ?? null;
  const userId = authenticated ? walletAddress ?? user?.id ?? null : null;
  const displayName = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : user?.email?.address ?? "Signed in";

  return (
    <ProofPlayAuthContext.Provider
      value={{
        ready,
        configured: true,
        authenticated,
        userId,
        walletAddress,
        displayName,
        login,
        logout,
      }}
    >
      {children}
    </ProofPlayAuthContext.Provider>
  );
}
