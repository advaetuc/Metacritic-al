import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { parse } from "yaml";
import type { ContentManifest, MovieIndexEntry, MoviePack, VibePack } from "../lib/engine/types";

const genreIds = [
  "action", "animation", "comedy", "drama", "fantasy", "horror", "romance", "scifi",
  "superhero", "thriller", "arthouse", "documentary",
] as const;
const vibeIds = [
  "film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin",
  "conspiracy", "sports", "victorian", "nature",
] as const;
const sentiments = ["love", "hate"] as const;
const consensusValues = ["acclaimed", "divisive", "panned", "cult", "blockbuster"] as const;

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "must be a lowercase slug");
const genreSchema = z.enum(genreIds);
const sentimentSchema = z.enum(sentiments);
const heatSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

const movieSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  year: z.number().int().min(1888).max(2200),
  director: z.string().trim().min(1),
  leads: z.array(z.string().trim().min(1)),
  runtimeMin: z.number().int().positive(),
  genres: z.array(genreSchema).min(1).max(2),
  consensus: z.enum(consensusValues),
  aliases: z.array(z.string().trim().min(1)).optional(),
  popularity: z.number().int().min(1).max(100),
  hooks: z.object({
    setpieces: z.array(z.string()),
    tropes: z.array(z.string()),
    memes: z.array(z.string()),
    runtimeJoke: z.string().optional(),
    titleJoke: z.string().optional(),
  }),
  gold: z.array(z.object({
    v: z.enum(vibeIds),
    s: z.union([sentimentSchema, z.literal("any")]),
    h: z.array(heatSchema).optional(),
    text: z.string().trim().min(1).max(800),
  })),
});

const distributionSchema = z.object({ mean: z.number().finite(), standardDeviation: z.number().positive() });
const ratingModelSchema = z.object({
  love: distributionSchema,
  hate: distributionSchema,
  heatShift: z.object({
    love: z.object({ 0: z.number(), 1: z.number(), 2: z.number(), 3: z.number() }),
    hate: z.object({ 0: z.number(), 1: z.number(), 2: z.number(), 3: z.number() }),
  }),
  sentimentBias: z.object({ love: z.number().optional(), hate: z.number().optional() }).optional(),
  consensusBias: z.record(z.enum(consensusValues), z.object({ love: z.number().optional(), hate: z.number().optional() }).partial()).optional(),
  override: z.union([
    z.object({ type: z.literal("range"), min: z.number(), max: z.number() }).refine((range) => range.min <= range.max),
    z.object({ type: z.literal("minimum"), min: z.number() }),
    z.object({ type: z.literal("bimodal"), low: z.number(), high: z.number(), extremeProbability: z.number().min(0).max(1) }),
  ]).optional(),
});

const vibeSchema = z.object({
  id: z.enum(vibeIds),
  name: z.string().trim().min(1),
  accent: z.string().regex(/^#[\da-f]{6}$/iu),
  username: z.object({
    prefixes: z.array(z.string()),
    cores: z.array(z.string()),
    suffixes: z.array(z.string()),
    casing: z.enum(["snake", "camel", "lower", "title"]),
  }),
  tags: z.array(z.string()),
  ratingModel: ratingModelSchema,
  rules: z.record(z.string().regex(/^[a-zA-Z][\w-]*$/u), z.array(z.object({
    t: z.string().trim().min(1).max(800),
    w: z.number().positive().optional(),
    s: sentimentSchema.optional(),
    h: z.array(heatSchema).optional(),
    g: z.array(genreSchema).optional(),
    when: z.object({
      colon: z.boolean().optional(), sequel: z.boolean().optional(), oneWord: z.boolean().optional(),
      long: z.boolean().optional(), question: z.boolean().optional(), exclaim: z.boolean().optional(),
      possessive: z.boolean().optional(), startsThe: z.boolean().optional(), hasYear: z.boolean().optional(),
    }).optional(),
  }))),
});

const collectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("movies"), movies: z.array(movieSchema) }),
  z.object({ kind: z.literal("vibes"), vibes: z.array(vibeSchema) }),
]);

type MovieContent = z.infer<typeof movieSchema> & { aliases?: string[]; popularity: number };
type Collection = z.infer<typeof collectionSchema>;

const root = process.cwd();
const contentDir = path.join(root, "content");
const outputDir = path.join(root, "public", "data");

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

async function writeHashedJson(directory: string, baseName: string, value: unknown): Promise<string> {
  const serialized = compactJson(value);
  const hash = contentHash(serialized);
  const fileName = `${baseName}.${hash}.json`;
  const relativePath = directory ? `${directory}/${fileName}` : fileName;
  const absolutePath = path.join(outputDir, directory, fileName);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, serialized, "utf8");
  return `/data/${relativePath}`;
}

function uniqueById<T extends { id: string }>(items: T[], kind: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate ${kind} ID "${item.id}".`);
    ids.add(item.id);
  }
}

async function main(): Promise<void> {
  const files = (await readdir(contentDir)).filter((file) => /\.ya?ml$/iu.test(file)).sort();
  if (files.length === 0) throw new Error(`No YAML content files found in ${contentDir}.`);

  const movies: MovieContent[] = [];
  const vibes: VibePack[] = [];
  for (const file of files) {
    const fullPath = path.join(contentDir, file);
    const source = await readFile(fullPath, "utf8");
    let parsed: unknown;
    try {
      parsed = parse(source, { uniqueKeys: true });
    } catch (error) {
      throw new Error(`Could not parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const result = collectionSchema.safeParse(parsed);
    if (!result.success) {
      const detail = result.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ");
      throw new Error(`Invalid content in ${file}: ${detail}`);
    }
    const collection: Collection = result.data;
    if (collection.kind === "movies") movies.push(...collection.movies);
    else vibes.push(...collection.vibes);
  }

  if (movies.length === 0) throw new Error("At least one movie is required to generate the search index.");
  uniqueById(movies, "movie");
  uniqueById(vibes, "vibe");

  const movieKeys = new Set<string>();
  for (const movie of movies) {
    for (const name of [movie.title, ...(movie.aliases ?? [])]) {
      const key = name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase().replace(/^(?:the|a|an)\s+/u, "");
      if (movieKeys.has(key)) throw new Error(`Duplicate movie title or alias "${name}".`);
      movieKeys.add(key);
    }
  }

  const index: MovieIndexEntry[] = movies.map((movie) => ({
    id: movie.id,
    t: movie.title,
    y: movie.year,
    ...(movie.aliases?.length ? { a: movie.aliases } : {}),
    g: movie.genres,
    p: movie.popularity,
  }));

  const manifest: ContentManifest = { version: 1, index: "", movies: {}, vibes: {} };
  manifest.index = await writeHashedJson("", "index", index);
  for (const movie of movies) {
    const pack: MoviePack = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      leads: movie.leads,
      runtimeMin: movie.runtimeMin,
      genres: movie.genres,
      consensus: movie.consensus,
      hooks: movie.hooks,
      gold: movie.gold,
    };
    manifest.movies[movie.id] = await writeHashedJson("movies", movie.id, pack);
  }
  for (const vibe of vibes) {
    manifest.vibes[vibe.id] = await writeHashedJson("vibes", vibe.id, vibe);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "manifest.json"), compactJson(manifest), "utf8");
  console.log(`Built ${movies.length} movie packs and ${vibes.length} vibe packs into ${outputDir}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
