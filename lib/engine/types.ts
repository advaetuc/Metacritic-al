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

export interface GenerateReviewInput {
  title: string;
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  /** Non-negative integer reroll count; serialized as base36 in ReviewModel. */
  k?: number;
  genre?: GenreId;
  moviePack?: MoviePack;
}

export type RandomSource = () => number;
