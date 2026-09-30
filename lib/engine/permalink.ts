import type { GenerateReviewInput, GenreId, Heat, Sentiment, VibeId } from "./types";
import { normalizeRerollCounter } from "./normalize";

const VIBES: readonly VibeId[] = ["film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin", "conspiracy", "sports", "victorian", "nature"];
const GENRES: readonly GenreId[] = ["action", "animation", "comedy", "drama", "fantasy", "horror", "romance", "scifi", "superhero", "thriller", "arthouse", "documentary"];

export interface PermalinkState {
  title?: string;
  movieId?: string;
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  k: number;
  genre?: GenreId;
}

export type PermalinkParseResult = { ok: true; state: PermalinkState } | { ok: false; reason: string };

export function buildReviewPermalink(input: GenerateReviewInput, movieId?: string, origin?: string): string {
  const params = new URLSearchParams();
  if (movieId) params.set("m", movieId);
  params.set("t", input.title.trim());
  params.set("v", input.vibe);
  params.set("h", String(input.heat));
  params.set("s", input.sentiment);
  params.set("k", normalizeRerollCounter(input.k));
  if (input.genre) params.set("g", input.genre);
  return (origin ?? "") + "/r/?" + params.toString();
}

export function parseReviewPermalink(params: URLSearchParams): PermalinkParseResult {
  const movieId = params.get("m")?.trim();
  const title = params.get("t")?.trim();
  const vibe = params.get("v");
  const heatValue = params.get("h");
  const sentiment = params.get("s");
  const kValue = params.get("k") ?? "0";
  const genreValue = params.get("g");
  if (!movieId && !title) return { ok: false, reason: "The link needs a movie ID or title." };
  if (movieId && !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(movieId)) return { ok: false, reason: "The movie ID is invalid." };
  if (!vibe || !VIBES.includes(vibe as VibeId)) return { ok: false, reason: "The vibe in this link is invalid." };
  if (!heatValue || !/^[0-3]$/u.test(heatValue)) return { ok: false, reason: "The heat setting in this link is invalid." };
  if (sentiment !== "love" && sentiment !== "hate") return { ok: false, reason: "The sentiment in this link is invalid." };
  if (!/^[0-9a-z]{1,11}$/u.test(kValue)) return { ok: false, reason: "The reroll counter is invalid." };
  const k = Number.parseInt(kValue, 36);
  if (!Number.isSafeInteger(k) || k < 0 || k.toString(36) !== kValue.toLowerCase()) return { ok: false, reason: "The reroll counter is invalid." };
  if (genreValue && !GENRES.includes(genreValue as GenreId)) return { ok: false, reason: "The genre in this link is invalid." };
  return { ok: true, state: { ...(movieId ? { movieId } : {}), ...(title ? { title } : {}), vibe: vibe as VibeId, heat: Number(heatValue) as Heat, sentiment, k, ...(genreValue ? { genre: genreValue as GenreId } : {}) } };
}
