import { create } from "zustand";

interface ActiveDraft {
  marketId: string;
  gameId: string;
  optionId: string;
  amountUSDT: number;
}

interface AppState {
  activeDraft: ActiveDraft | null;
  setActiveDraft: (draft: ActiveDraft | null) => void;
  clearDraft: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDraft: null,
  setActiveDraft: (draft) => set({ activeDraft: draft }),
  clearDraft: () => set({ activeDraft: null }),
  theme: "light",
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
