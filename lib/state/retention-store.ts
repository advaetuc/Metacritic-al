import { create } from "zustand";
import type { VibeId } from "@/lib/engine/types";
import { readAppStorage, writeAppStorage } from "./storage";
import { EMPTY_STREAK, recordStreakDay, type DailyStreak } from "./streak";

export const MAX_HISTORY_ITEMS = 50;
const RETENTION_STORAGE_KEY = "retention";
const VIBE_IDS: readonly VibeId[] = ["film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin", "conspiracy", "sports", "victorian", "nature"];

export interface RoastHistoryItem {
  url: string;
  title: string;
  vibe: VibeId;
  rating: number;
  ts: number;
}

interface PersistedRetention {
  history: RoastHistoryItem[];
  streak: DailyStreak;
  totalRoasts: number;
}

interface RetentionState extends PersistedRetention {
  hydrated: boolean;
  hydrate: () => void;
  recordRoast: (item: RoastHistoryItem) => void;
  clearHistory: () => void;
}

const INITIAL_RETENTION: PersistedRetention = { history: [], streak: EMPTY_STREAK, totalRoasts: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHistoryItem(value: unknown): value is RoastHistoryItem {
  if (!isRecord(value)) return false;
  return typeof value.url === "string" && value.url.startsWith("/r/") && !value.url.startsWith("//")
    && typeof value.title === "string" && value.title.length > 0 && value.title.length <= 120
    && typeof value.vibe === "string" && VIBE_IDS.includes(value.vibe as VibeId)
    && typeof value.rating === "number" && Number.isFinite(value.rating) && value.rating >= 0.5 && value.rating <= 5 && Number.isInteger(value.rating * 2)
    && typeof value.ts === "number" && Number.isFinite(value.ts) && value.ts > 0;
}

function validDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function sanitizeRetention(value: unknown): PersistedRetention {
  if (!isRecord(value)) return INITIAL_RETENTION;
  const total = typeof value.totalRoasts === "number" && Number.isSafeInteger(value.totalRoasts) && value.totalRoasts >= 0 ? value.totalRoasts : 0;
  const history = Array.isArray(value.history) ? value.history.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS) : [];
  const rawStreak = isRecord(value.streak) ? value.streak : {};
  const current = typeof rawStreak.current === "number" && Number.isSafeInteger(rawStreak.current) && rawStreak.current >= 0 ? rawStreak.current : 0;
  const lastRoastDay = validDayKey(rawStreak.lastRoastDay) ? rawStreak.lastRoastDay : null;
  const streak = current > 0 && lastRoastDay ? { current, lastRoastDay } : EMPTY_STREAK;
  return { history, streak, totalRoasts: Math.max(total, history.length) };
}

function persist(data: PersistedRetention): void {
  writeAppStorage(RETENTION_STORAGE_KEY, data);
}

export const useRetentionStore = create<RetentionState>((set, get) => ({
  ...INITIAL_RETENTION,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const saved = sanitizeRetention(readAppStorage<unknown>(RETENTION_STORAGE_KEY, null));
    set({ ...saved, hydrated: true });
  },
  recordRoast: (item) => {
    if (!get().hydrated) get().hydrate();
    const state = get();
    const next: PersistedRetention = {
      history: [item, ...state.history].slice(0, MAX_HISTORY_ITEMS),
      streak: recordStreakDay(state.streak, new Date(item.ts)),
      totalRoasts: state.totalRoasts + 1,
    };
    set({ ...next, hydrated: true });
    persist(next);
  },
  clearHistory: () => {
    if (!get().hydrated) get().hydrate();
    const state = get();
    const next = { history: [], streak: state.streak, totalRoasts: state.totalRoasts };
    set({ ...next, hydrated: true });
    persist(next);
  },
}));
