import { create } from "zustand";
import type { GenreId, Heat, Sentiment, VibeId } from "@/lib/engine/types";
import type { SelectedTmdbMovie } from "@/lib/tmdb/client";

export type StudioPhase = "idle" | "screening" | "revealed";

export interface StudioDraft {
  title: string;
  sentiment: Sentiment;
  genre: GenreId | "";
  vibe: VibeId;
  heat: Heat;
  selectedMovie: SelectedTmdbMovie | null;
}

interface StudioState {
  draft: StudioDraft;
  phase: StudioPhase;
  setTitle: (title: string) => void;
  selectTmdbMovie: (movie: SelectedTmdbMovie) => void;
  clearSelectedMovie: () => void;
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
  selectedMovie: null,
};

export const useStudioStore = create<StudioState>((set) => ({
  draft: initialDraft,
  phase: "idle",
  setTitle: (title) => set((state) => ({
    draft: {
      ...state.draft,
      title,
      genre: state.draft.selectedMovie?.genre === state.draft.genre ? "" : state.draft.genre,
      selectedMovie: null,
    },
  })),
  selectTmdbMovie: (selectedMovie) => set((state) => ({
    draft: {
      ...state.draft,
      title: selectedMovie.title,
      genre: selectedMovie.genre ?? state.draft.genre,
      selectedMovie,
    },
  })),
  clearSelectedMovie: () => set((state) => ({
    draft: {
      ...state.draft,
      genre: state.draft.selectedMovie?.genre === state.draft.genre ? "" : state.draft.genre,
      selectedMovie: null,
    },
  })),
  setSentiment: (sentiment) => set((state) => ({ draft: { ...state.draft, sentiment } })),
  setGenre: (genre) => set((state) => ({ draft: { ...state.draft, genre } })),
  setVibe: (vibe) => set((state) => ({ draft: { ...state.draft, vibe } })),
  setHeat: (heat) => set((state) => ({ draft: { ...state.draft, heat } })),
  setPhase: (phase) => set({ phase }),
}));
