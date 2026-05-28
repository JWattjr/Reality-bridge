import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { getXLayerUSDTBalance, isXLayerContractsConfigured } from "@/lib/xlayer";

export interface UserProfile {
  id: string;
  privyUserId?: string;
  walletAddress?: string;
  handle: string;
  displayName: string;
  userTag: string;
  bio?: string;
  avatar?: string;
}

export function useUserProfile(auth: {
  authenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  displayName: string;
  authHeaders: () => Promise<Record<string, string>>;
}) {
  return useQuery({
    queryKey: ["profile", auth.userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!auth.authenticated || !auth.userId) return null;
      const headers = await auth.authHeaders();
      const { data } = await api.post<{ profile?: UserProfile }>("/api/profiles", {
        userId: auth.userId,
        walletAddress: auth.walletAddress,
        displayName: auth.displayName,
        mode: "ensure",
      }, { headers });
      return data.profile ?? null;
    },
    enabled: auth.authenticated && Boolean(auth.userId),
  });
}

export function useUpdateProfile(auth: {
  authenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  authHeaders: () => Promise<Record<string, string>>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: {
      displayName: string;
      handle: string;
      userTag: string;
      bio: string;
      avatar: string;
    }): Promise<UserProfile> => {
      if (!auth.authenticated || !auth.userId) {
        throw new Error("User is not authenticated");
      }
      const headers = await auth.authHeaders();
      try {
        const { data } = await api.post<{ profile?: UserProfile }>("/api/profiles", {
          userId: auth.userId,
          walletAddress: auth.walletAddress,
          mode: "update",
          ...form,
        }, { headers });
        if (!data.profile) throw new Error("Profile save failed");
        return data.profile;
      } catch (error: any) {
        const issues = error.response?.data?.issues;
        throw new Error(issues?.join(", ") ?? error.message ?? "Profile save failed");
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", auth.userId], data);
    },
  });
}

export interface IndexPredictionInput {
  chainPredictionId: string;
  userId: string;
  walletAddress: string | null;
  gameId?: string;
  marketId: string;
  chainMarketId: number;
  optionId: string;
  optionIndex: number;
  optionLabel: string;
  amountUSDT: string;
  txHash: string;
}

export function useIndexPrediction(auth: {
  authHeaders: () => Promise<Record<string, string>>;
}) {
  return useMutation({
    mutationFn: async (input: IndexPredictionInput) => {
      const headers = await auth.authHeaders();
      try {
        const { data } = await api.post("/api/xcup/predictions", input, { headers });
        return data;
      } catch (error: any) {
        const issues = error.response?.data?.issues;
        throw new Error(issues?.join(", ") ?? error.message ?? "Prediction indexing failed");
      }
    },
  });
}

export interface WalletBalances {
  okb: string;
  usdt: string | null;
}

export function useWalletBalance(walletAddress: string | null) {
  return useQuery({
    queryKey: ["walletBalance", walletAddress],
    queryFn: async (): Promise<WalletBalances> => {
      if (!walletAddress) return { okb: "0", usdt: null };
      
      const { data } = await api.get<{ balance: { balance: string } }>(
        `/api/wallet/balance?address=${encodeURIComponent(walletAddress)}`
      );
      
      const okb = data.balance.balance;
      let usdt: string | null = null;
      if (isXLayerContractsConfigured()) {
        usdt = await getXLayerUSDTBalance(walletAddress);
      }
      
      return { okb, usdt };
    },
    enabled: Boolean(walletAddress),
    refetchInterval: 30000,
  });
}

export function useUserPredictions(auth: {
  authenticated: boolean;
  userId: string | null;
  authHeaders: () => Promise<Record<string, string>>;
}) {
  return useQuery({
    queryKey: ["predictions", auth.userId],
    queryFn: async (): Promise<any[]> => {
      if (!auth.authenticated || !auth.userId) return [];
      const headers = await auth.authHeaders();
      try {
        const { data } = await api.get<any[]>("/api/xcup/predictions", { headers });
        return data;
      } catch (error) {
        console.error("Failed to fetch user predictions", error);
        return [];
      }
    },
    enabled: auth.authenticated && Boolean(auth.userId),
  });
}

export function useGames() {
  return useQuery({
    queryKey: ["games"],
    queryFn: async (): Promise<any[]> => {
      const { data } = await api.get<any[]>("/api/xcup/games");
      return data;
    },
  });
}

export function useGameDetails(gameId: string) {
  return useQuery({
    queryKey: ["gameDetails", gameId],
    queryFn: async (): Promise<any> => {
      if (!gameId) return null;
      const { data } = await api.get<any>(`/api/xcup/games/${gameId}`);
      return data;
    },
    enabled: Boolean(gameId),
  });
}

export function useGameMarkets(gameId: string) {
  return useQuery({
    queryKey: ["gameMarkets", gameId],
    queryFn: async (): Promise<any[]> => {
      if (!gameId) return [];
      const { data } = await api.get<any[]>(`/api/xcup/games/${gameId}/markets`);
      return data;
    },
    enabled: Boolean(gameId),
  });
}

export function usePvPLeaderboard() {
  return useQuery({
    queryKey: ["pvpLeaderboard"],
    queryFn: async (): Promise<any[]> => {
      const { data } = await api.get<{ entries: any[] }>("/api/leaderboard");
      return data.entries ?? [];
    },
  });
}

export function useMatchLeaderboard(gameId: string) {
  return useQuery({
    queryKey: ["matchLeaderboard", gameId],
    queryFn: async (): Promise<any[]> => {
      if (!gameId) return [];
      const { data } = await api.get<{ entries: any[] }>(`/api/leaderboard?eventId=${encodeURIComponent(gameId)}`);
      return data.entries ?? [];
    },
    enabled: Boolean(gameId),
  });
}

export function useGamePvPMatches(gameId: string) {
  return useQuery({
    queryKey: ["gamePvPMatches", gameId],
    queryFn: async (): Promise<any[]> => {
      if (!gameId) return [];
      const { data } = await api.get<any[]>(`/api/xcup/games/${gameId}/pvp`);
      return data;
    },
    enabled: Boolean(gameId),
  });
}

export function useGameNFTRewards(gameId: string) {
  return useQuery({
    queryKey: ["gameNFTRewards", gameId],
    queryFn: async (): Promise<any[]> => {
      if (!gameId) return [];
      const { data } = await api.get<any[]>(`/api/xcup/games/${gameId}/rewards`);
      return data;
    },
    enabled: Boolean(gameId),
  });
}

