import type { ContentManifest, MovieIndexEntry } from "@/lib/engine/types";

let movieIndexPromise: Promise<MovieIndexEntry[]> | undefined;

/** Load the content-hashed index emitted by `npm run prebuild`. */
export function loadMovieIndex(): Promise<MovieIndexEntry[]> {
  if (!movieIndexPromise) {
    movieIndexPromise = fetch("/data/manifest.json", { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the content manifest (${response.status}).`);
        return response.json() as Promise<ContentManifest>;
      })
      .then(async (manifest) => {
        const response = await fetch(manifest.index, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Could not load the movie index (${response.status}).`);
        return response.json() as Promise<MovieIndexEntry[]>;
      })
      .catch((error: unknown) => {
        movieIndexPromise = undefined;
        throw error;
      });
  }
  return movieIndexPromise;
}
