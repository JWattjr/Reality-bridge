import { create } from "zustand";
import { ConnectedWallet } from "@privy-io/react-auth";

interface AuthState {
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  wallets: ConnectedWallet[];
  displayName: string;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  authHeaders: () => Promise<Record<string, string>>;
  setAuthState: (state: Partial<Omit<AuthState, "setAuthState">>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
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
  setAuthState: (newState) => set((state) => ({ ...state, ...newState })),
}));
