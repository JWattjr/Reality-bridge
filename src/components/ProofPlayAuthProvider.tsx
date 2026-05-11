"use client";

import {
  PrivyProvider,
  usePrivy,
  useWallets,
  type ConnectedWallet,
  type PrivyProviderProps,
} from "@privy-io/react-auth";
import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";

type ProofPlayAuth = {
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  wallets: ConnectedWallet[];
  displayName: string;
  login: () => void;
  logout: () => void;
  /** Returns a Privy access token for server-side verification, or null. */
  getAccessToken: () => Promise<string | null>;
  /** Returns fetch headers with the Authorization bearer token attached. */
  authHeaders: () => Promise<Record<string, string>>;
};

const fallbackAuth: ProofPlayAuth = {
  ready: true,
  configured: false,
  authenticated: false,
  userId: null,
  walletAddress: null,
  wallets: [],
  displayName: "Connect wallet",
  login: () => undefined,
  logout: () => undefined,
  getAccessToken: async () => null,
  authHeaders: async () => ({}),
};

const ProofPlayAuthContext = createContext<ProofPlayAuth>(fallbackAuth);

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

const zeroGMainnetChain = {
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "0G",
    symbol: "0G",
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan.0g.ai",
    },
  },
};

const privyConfig: PrivyProviderProps["config"] = {
  loginMethods: ["wallet", "email", "google", "twitter"],
  supportedChains: [zeroGMainnetChain],
  defaultChain: zeroGMainnetChain,
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
  const { ready, authenticated, user, login, logout, getAccessToken: privyGetAccessToken } = usePrivy();
  const { wallets } = useWallets();
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

  return (
    <ProofPlayAuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </ProofPlayAuthContext.Provider>
  );
}
