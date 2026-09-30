import type { VibeId } from "@/lib/engine/types";

export const VIBE_UNLOCKS: Partial<Record<VibeId, number>> = {
  sports: 5,
  victorian: 12,
  nature: 25,
};

export function isVibeUnlocked(vibe: VibeId, totalRoasts: number): boolean {
  const threshold = VIBE_UNLOCKS[vibe];
  return threshold === undefined || totalRoasts >= threshold;
}

export function unlockedVibes(totalRoasts: number): VibeId[] {
  const all: VibeId[] = ["film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin", "conspiracy", "sports", "victorian", "nature"];
  return all.filter((vibe) => isVibeUnlocked(vibe, totalRoasts));
}
