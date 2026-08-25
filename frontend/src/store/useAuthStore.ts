import { create } from "zustand";
import type { BaseWallet } from "@/lib/base-sepolia";

interface AuthState {
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  walletAddress: string | null;
  wallet: BaseWallet | null;
  displayName: string;
  error: string | null;
  login: () => void | Promise<void>;
  logout: () => void;
  setAuthState: (state: Partial<Omit<AuthState, "setAuthState">>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  configured: false,
  authenticated: false,
  walletAddress: null,
  wallet: null,
  displayName: "Connect wallet",
  error: null,
  login: () => undefined,
  logout: () => undefined,
  setAuthState: (newState) => set((state) => ({ ...state, ...newState })),
}));
