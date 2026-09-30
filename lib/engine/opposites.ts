import type { VibeId } from "./types";

/** Counter-critic pairings; the two core contrasts are kept explicit and reversible. */
export const OPPOSITE_VIBES: Readonly<Record<VibeId, VibeId>> = {
  "film-student": "shitposter",
  shitposter: "film-student",
  mid: "linkedin",
  dad: "festival-snob",
  stan: "conspiracy",
  "festival-snob": "dad",
  linkedin: "mid",
  conspiracy: "stan",
  sports: "nature",
  victorian: "film-student",
  nature: "sports",
};

export function oppositeVibe(vibe: VibeId): VibeId {
  return OPPOSITE_VIBES[vibe];
}
