const BLOCKED_TERMS = [
  "nigger", "nigga", "faggot", "dyke", "tranny", "kike", "chink", "spic", "retard", "retarded",
  "porn", "pornography", "blowjob", "handjob", "masturbation", "masturbate", "incest", "bestiality",
  "violence", "violent", "torture",
  "rape", "raped", "raping", "rapist", "pussy", "cunt", "cock", "penis", "vagina",
] as const;

function normalizeForSafety(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Hard safety terms apply regardless of vibe, sentiment, or heat. */
export function containsBlockedSafetyContent(value: string): boolean {
  const normalized = normalizeForSafety(value);
  if (!normalized) return false;
  const padded = ` ${normalized} `;
  if (BLOCKED_TERMS.some((term) => padded.includes(` ${term} `))) return true;
  if (/\b(?:i|we|you|they|he|she) (?:will|shall|gonna|going to|want to|hope to) (?:kill|hurt|shoot|stab|beat|rape)\b/u.test(normalized)) return true;
  if (/\b(?:kill|hurt|shoot|stab|beat|rape) (?:yourself|you|them|him|her|us|all of you)\b/u.test(normalized)) return true;
  return false;
}

export function isSafeGeneratedCopy(value: string): boolean {
  return !containsBlockedSafetyContent(value);
}

export const SAFE_COPY_FALLBACK = "The film makes a choice, and the projector has notes.";
