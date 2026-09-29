import { create } from "zustand";
import type { GenreId, Heat, Sentiment, VibeId } from "@/lib/engine/types";

export type StudioPhase = "idle" | "screening" | "revealed";

export interface StudioDraft {
  title: string;
  sentiment: Sentiment;
  genre: GenreId | "";
  vibe: VibeId;
  heat: Heat;
}

interface StudioState {
  draft: StudioDraft;
  phase: StudioPhase;
  setTitle: (title: string) => void;
  setSentiment: (sentiment: Sentiment) => void;
  setGenre: (genre: GenreId | "") => void;
  setVibe: (vibe: VibeId) => void;
  setHeat: (heat: Heat) => void;
  setPhase: (phase: StudioPhase) => void;
}

const initialDraft: StudioDraft = {
  title: "",
  sentiment: "love",
  genre: "",
  vibe: "film-student",
  heat: 0,
};

export const useStudioStore = create<StudioState>((set) => ({
  draft: initialDraft,
  phase: "idle",
  setTitle: (title) => set((state) => ({ draft: { ...state.draft, title } })),
  setSentiment: (sentiment) => set((state) => ({ draft: { ...state.draft, sentiment } })),
  setGenre: (genre) => set((state) => ({ draft: { ...state.draft, genre } })),
  setVibe: (vibe) => set((state) => ({ draft: { ...state.draft, vibe } })),
  setHeat: (heat) => set((state) => ({ draft: { ...state.draft, heat } })),
  setPhase: (phase) => set({ phase }),
}));
