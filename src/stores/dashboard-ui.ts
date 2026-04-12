import { create } from "zustand";

export type VerdictFilter = "all" | "SAFE" | "RISKY" | "BLOCK";

type DashboardUiState = {
  verdictFilter: VerdictFilter;
  setVerdictFilter: (v: VerdictFilter) => void;
};

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  verdictFilter: "all",
  setVerdictFilter: (verdictFilter) => set({ verdictFilter }),
}));
