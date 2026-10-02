import type { ReviewModelCompatible } from "./types";
import { oppositeVibe } from "./opposites";

export function buildBattlePermalink(model: ReviewModelCompatible): string {
  const params = new URLSearchParams();
  if (model.movie.id) params.set("m", model.movie.id);
  params.set("t", model.movie.title);
  params.set("a", model.vibe);
  params.set("b", oppositeVibe(model.vibe));
  params.set("h", String(model.heat));
  params.set("s", model.sentiment);
  params.set("k", model.k);
  if (model.movie.genre) params.set("g", model.movie.genre);
  return `/battle/?${params.toString()}`;
}
