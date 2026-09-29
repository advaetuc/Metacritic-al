const MAX_TITLE_LENGTH = 80;

/** Normalize user input for matching and deterministic seeding. */
export function normalizeTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/gu, " ").slice(0, MAX_TITLE_LENGTH).toLowerCase();
}

/** Keep a display-ready title with normalized whitespace and a bounded length. */
export function displayTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/gu, " ").slice(0, MAX_TITLE_LENGTH);
}

export function normalizeForLookup(title: string): string {
  return normalizeTitle(title).replace(/^(?:the|a|an)\s+/u, "");
}

export function normalizeRerollCounter(k = 0): string {
  if (!Number.isSafeInteger(k) || k < 0) {
    throw new RangeError("Reroll counter k must be a non-negative safe integer.");
  }
  return k.toString(36);
}
