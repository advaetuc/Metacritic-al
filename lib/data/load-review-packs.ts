import { loadContentManifest, loadMovieIndex } from "./load-movie-index";
import { matchMovieTitle } from "@/lib/engine/matcher";
import type { MoviePack, VibeId, VibePack } from "@/lib/engine/types";

const vibeCache = new Map<VibeId, Promise<VibePack>>();
const movieCache = new Map<string, Promise<MoviePack>>();

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Could not load content (${response.status}).`);
  return response.json() as Promise<T>;
}

export function loadVibePack(id: VibeId): Promise<VibePack> {
  const cached = vibeCache.get(id);
  if (cached) return cached;

  const request = loadContentManifest().then((manifest) => {
    const path = manifest.vibes[id];
    if (!path) throw new Error(`No content pack is available for vibe "${id}".`);
    return loadJson<VibePack>(path);
  });
  vibeCache.set(id, request);
  request.catch(() => vibeCache.delete(id));
  return request;
}

export async function loadCuratedMoviePack(title: string): Promise<MoviePack | undefined> {
  const index = await loadMovieIndex();
  const match = matchMovieTitle(title, index);
  if (match.kind !== "exact") return undefined;

 const cached = movieCache.get(match.entry.id);
  return cached ?? loadMoviePackById(match.entry.id);
}

export function loadMoviePackById(id: string): Promise<MoviePack> {
  const cached = movieCache.get(id);
  if (cached) return cached;
  const request = loadContentManifest().then((manifest) => {
    const path = manifest.movies[id];
    if (!path) throw new Error(`No content pack is available for movie "${id}".`);
    return loadJson<MoviePack>(path);
  });
  movieCache.set(id, request);
  request.catch(() => movieCache.delete(id));
  return request;
}
