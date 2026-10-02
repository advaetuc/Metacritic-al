export type GenreId =
  | "action"
  | "animation"
  | "comedy"
  | "drama"
  | "fantasy"
  | "horror"
  | "romance"
  | "scifi"
  | "superhero"
  | "thriller"
  | "arthouse"
  | "documentary";

export type VibeId =
  | "film-student"
  | "shitposter"
  | "mid"
  | "dad"
  | "stan"
  | "festival-snob"
  | "linkedin"
  | "conspiracy"
  | "sports"
  | "victorian"
  | "nature";

export type Sentiment = "love" | "hate";
export type Heat = 0 | 1 | 2 | 3;
export type MovieConsensus =
  | "acclaimed"
  | "divisive"
  | "panned"
  | "cult"
  | "blockbuster";

export interface TitleFeatures {
  colon: boolean;
  sequel: boolean;
  oneWord: boolean;
  long: boolean;
  question: boolean;
  exclaim: boolean;
  possessive: boolean;
  startsThe: boolean;
  hasYear: boolean;
  titleShort: string;
}

export type TitleFeaturePredicate = Partial<
  Pick<TitleFeatures, Exclude<keyof TitleFeatures, "titleShort">>
>;

export interface MoviePack {
  id: string;
  title: string;
  year: number;
  director: string;
  leads: string[];
  runtimeMin: number;
  genres: GenreId[];
  consensus: MovieConsensus;
  hooks: {
    setpieces: string[];
    tropes: string[];
    memes: string[];
    runtimeJoke?: string;
    titleJoke?: string;
  };
  gold: Array<{
    v: VibeId;
    s: Sentiment | "any";
    h?: Heat[];
    text: string;
  }>;
}

/** Compact entry shipped in the client-side movie search index. */
export interface MovieIndexEntry {
  id: string;
  t: string;
  y: number;
  a?: string[];
  g: GenreId[];
  p: number;
}

/** Maps stable logical IDs to immutable content-hashed static asset paths. */
export interface ContentManifest {
  version: 1;
  index: string;
  movies: Record<string, string>;
  vibes: Record<string, string>;
}

export interface RatingDistribution {
  mean: number;
  standardDeviation: number;
}

export type RatingOverride =
  | { type: "range"; min: number; max: number }
  | {
      type: "bimodal";
      low: number;
      high: number;
      extremeProbability: number;
    }
  | { type: "minimum"; min: number };

export interface RatingModel {
  love: RatingDistribution;
  hate: RatingDistribution;
  heatShift: Record<Sentiment, Record<Heat, number>>;
  sentimentBias?: Partial<Record<Sentiment, number>>;
  consensusBias?: Partial<
    Record<MovieConsensus, Partial<Record<Sentiment, number>>>
  >;
  override?: RatingOverride;
}

export type UsernameCasing = "snake" | "camel" | "lower" | "title";

export interface VibePack {
  id: VibeId;
  name: string;
  accent: string;
  username: {
    prefixes: string[];
    cores: string[];
    suffixes: string[];
    casing: UsernameCasing;
  };
  tags: string[];
  ratingModel: RatingModel;
  rules: Record<string, Rule[]>;
}

export interface Rule {
  t: string;
  w?: number;
  s?: Sentiment;
  h?: Heat[];
  g?: GenreId[];
  when?: TitleFeaturePredicate;
}

export interface ReviewModel {
  v: 1;
  movie: { id?: string; title: string; year?: number; genre?: GenreId };
  source: "curated" | "procedural";
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  rating: number;
  username: string;
  avatarSeed: number;
  watchedLabel: string;
  rewatch: boolean;
  body: string;
  tweet: string;
  tags: string[];
  likes: number;
  comments: number;
  k: string;
}

/** Sanitized, optional context. Raw synopsis copy is never retained. */
export interface MovieMetadataContext {
  tmdbId?: number;
  title?: string;
  year?: number;
  genres?: GenreId[];
  overviewTokens?: string[];
  taglineTokens?: string[];
  runtime?: number;
  voteAverage?: number;
  voteCount?: number;
  posterPath?: string;
}

/** V2 wraps the V1 result additively; all generated review fields retain V1 semantics. */
export interface ReviewModelV2 extends Omit<ReviewModel, "v" | "movie"> {
  v: 2;
  engineVersion: 1;
  movie: ReviewModel["movie"] & MovieMetadataContext;
}

export type ReviewModelCompatible = ReviewModel | ReviewModelV2;

/** Drop the V2 envelope and optional metadata for consumers that require the V1 shape. */
export function toReviewModelV1(model: ReviewModelCompatible): ReviewModel {
  return {
    v: 1,
    movie: {
      ...(model.movie.id ? { id: model.movie.id } : {}),
      title: model.movie.title,
      ...(model.movie.year !== undefined ? { year: model.movie.year } : {}),
      ...(model.movie.genre ? { genre: model.movie.genre } : {}),
    },
    source: model.source,
    vibe: model.vibe,
    heat: model.heat,
    sentiment: model.sentiment,
    rating: model.rating,
    username: model.username,
    avatarSeed: model.avatarSeed,
    watchedLabel: model.watchedLabel,
    rewatch: model.rewatch,
    body: model.body,
    tweet: model.tweet,
    tags: [...model.tags],
    likes: model.likes,
    comments: model.comments,
    k: model.k,
  };
}

export interface GenerateReviewInput {
  title: string;
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  /** Non-negative integer reroll count; serialized as base36 in ReviewModel. */
  k?: number;
  genre?: GenreId;
  moviePack?: MoviePack;
  /** Already normalized metadata from an optional movie lookup. */
  metadata?: MovieMetadataContext;
}

export type RandomSource = () => number;
