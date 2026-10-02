import { chooseTags, composeReviewBody, createUsername, truncateText } from "./compose";
import { displayTitle, normalizeRerollCounter, normalizeTitle } from "./normalize";
import { calculateRating } from "./rating";
import { createReviewRandom } from "./prng";
import { normalizeMovieMetadata } from "./metadata";
import type { GenerateReviewInput, ReviewModelV2, VibePack } from "./types";

const WATCHED_LABELS = [
  "Watched 3h ago",
  "Watched yesterday",
  "Rewatched Tuesday",
  "Watched last weekend",
  "Rewatched last night",
] as const;

function assertInput(input: GenerateReviewInput): void {
  if (!normalizeTitle(input.title)) throw new RangeError("Movie title must not be empty.");
  if (![0, 1, 2, 3].includes(input.heat)) throw new RangeError("Heat must be between 0 and 3.");
  normalizeRerollCounter(input.k);
}

export function generateReview(input: GenerateReviewInput, vibe: VibePack): ReviewModelV2 {
  assertInput(input);
  if (input.vibe !== vibe.id) {
    throw new RangeError(`Input vibe "${input.vibe}" does not match vibe pack "${vibe.id}".`);
  }
  const random = createReviewRandom(input);
  const metadata = normalizeMovieMetadata(input.metadata);
  const generationInput = { ...input, ...(metadata ? { metadata } : { metadata: undefined }) };
  const title = displayTitle(input.moviePack?.title ?? input.title);
  const genre = input.genre ?? input.moviePack?.genres[0];
  const body = truncateText(
    composeReviewBody({ input: generationInput, vibe, random }),
    800,
  );
  const rating = calculateRating({
    sentiment: input.sentiment,
    heat: input.heat,
    random,
    model: vibe.ratingModel,
    consensus: input.moviePack?.consensus,
  });
  const username = createUsername(vibe, random);
  const avatarSeed = Math.floor(random() * 0x100000000) >>> 0;
  const watchedLabel = WATCHED_LABELS[Math.floor(random() * WATCHED_LABELS.length)]!;
  const rewatch = random() < 0.12;
  const tags = chooseTags(vibe.tags, random);
  const likes = Math.round(Math.exp(2 + random() * 2.5) * (1 + input.heat * 0.12));
  const comments = Math.round(Math.exp(0.2 + random() * 1.8));
  const tweet = truncateText(`${rating}★ “${title}” — ${body}`, 240);

  return {
    v: 2,
    engineVersion: 1,
    movie: {
      ...(input.moviePack ? { id: input.moviePack.id, year: input.moviePack.year } : {}),
      title,
      ...(input.moviePack?.year === undefined && metadata?.year !== undefined ? { year: metadata.year } : {}),
      ...(genre ? { genre } : {}),
      ...(metadata?.tmdbId !== undefined ? { tmdbId: metadata.tmdbId } : {}),
      ...(metadata?.genres ? { genres: metadata.genres } : {}),
      ...(metadata?.overviewTokens ? { overviewTokens: metadata.overviewTokens } : {}),
      ...(metadata?.taglineTokens ? { taglineTokens: metadata.taglineTokens } : {}),
      ...(metadata?.runtime !== undefined ? { runtime: metadata.runtime } : {}),
      ...(metadata?.voteAverage !== undefined ? { voteAverage: metadata.voteAverage } : {}),
      ...(metadata?.voteCount !== undefined ? { voteCount: metadata.voteCount } : {}),
      ...(metadata?.posterPath ? { posterPath: metadata.posterPath } : {}),
    },
    source: input.moviePack ? "curated" : "procedural",
    vibe: vibe.id,
    heat: input.heat,
    sentiment: input.sentiment,
    rating,
    username,
    avatarSeed,
    watchedLabel,
    rewatch,
    body,
    tweet,
    tags,
    likes,
    comments,
    k: normalizeRerollCounter(input.k),
  };
}

export * from "./features";
export * from "./daily";
export * from "./battle";
export * from "./matcher";
export * from "./normalize";
export * from "./metadata";
export * from "./opposites";
export * from "./permalink";
export * from "./prng";
export * from "./rating";
export * from "./types";
