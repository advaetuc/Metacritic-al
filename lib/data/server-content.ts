import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ContentManifest, MoviePack, VibePack } from "@/lib/engine/types";

const publicDirectory = path.join(process.cwd(), "public");
const dataDirectory = path.join(publicDirectory, "data");

export const getContentManifest = cache(async (): Promise<ContentManifest> => {
  return JSON.parse(await readFile(path.join(dataDirectory, "manifest.json"), "utf8")) as ContentManifest;
});

async function readContentPack<T>(relativeUrl: string): Promise<T> {
  const relativePath = relativeUrl.replace(/^[/\\]+/u, "");
  return JSON.parse(await readFile(path.join(publicDirectory, relativePath), "utf8")) as T;
}

export const getMoviePackForPage = cache(async (id: string): Promise<MoviePack | undefined> => {
  const manifest = await getContentManifest();
  const file = manifest.movies[id];
  if (!file) return undefined;
  const pack = await readContentPack<MoviePack>(file);
  return pack.id === id ? pack : undefined;
});

export const getVibePackForPage = cache(async (id: keyof ContentManifest["vibes"]): Promise<VibePack> => {
  const manifest = await getContentManifest();
  const file = manifest.vibes[id];
  if (!file) throw new Error(`No vibe content exists for "${id}".`);
  return readContentPack<VibePack>(file);
});
