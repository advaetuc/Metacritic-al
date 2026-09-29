import { normalSample } from "./prng";
import type {
  Heat,
  MovieConsensus,
  RandomSource,
  RatingModel,
  Sentiment,
} from "./types";

export const DEFAULT_HEAT_SHIFT: Record<Sentiment, Record<Heat, number>> = {
  love: { 0: 0, 1: 0, 2: 0.5, 3: 0.5 },
  hate: { 0: 0, 1: -0.5, 2: -1, 3: -1.5 },
};

export const DEFAULT_RATING_MODEL: RatingModel = {
  love: { mean: 4.2, standardDeviation: 0.5 },
  hate: { mean: 1.6, standardDeviation: 0.6 },
  heatShift: DEFAULT_HEAT_SHIFT,
};

export function snapRating(value: number): number {
  const clamped = Math.min(5, Math.max(0.5, value));
  return Math.min(5, Math.max(0.5, Math.round(clamped * 2) / 2));
}

export function calculateRating(options: {
  sentiment: Sentiment;
  heat: Heat;
  random: RandomSource;
  model?: RatingModel;
  consensus?: MovieConsensus;
}): number {
  const { sentiment, heat, random, consensus } = options;
  const model = options.model ?? DEFAULT_RATING_MODEL;
  const distribution = model[sentiment];

  let score =
    distribution.mean +
    normalSample(random) * distribution.standardDeviation +
    model.heatShift[sentiment][heat] +
    (model.sentimentBias?.[sentiment] ?? 0) +
    (consensus ? (model.consensusBias?.[consensus]?.[sentiment] ?? 0) : 0);

  const override = model.override;
  if (override?.type === "range") {
    score = Math.min(override.max, Math.max(override.min, score));
  } else if (override?.type === "minimum") {
    score = Math.max(override.min, score);
  } else if (override?.type === "bimodal") {
    if (random() < override.extremeProbability) {
      score = random() < 0.5 ? override.low : override.high;
    }
  }

  return snapRating(score);
}
