import { displayTitle } from "./normalize";
import { extractTitleFeatures } from "./features";
import type {
  GenerateReviewInput,
  GenreId,
  MoviePack,
  RandomSource,
  Rule,
  Sentiment,
  TitleFeatures,
  VibePack,
} from "./types";

function choose<T>(items: readonly T[], random: RandomSource): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

function chooseWeighted(items: readonly Rule[], random: RandomSource): Rule | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map((item) => Math.max(0, item.w ?? 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return choose(items, random);

  let threshold = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index] ?? 0;
    if (threshold < 0) return items[index];
  }
  return items.at(-1);
}

function eligibleRules(
  rules: readonly Rule[],
  context: { sentiment: Sentiment; heat: GenerateReviewInput["heat"]; genres: GenreId[]; features: TitleFeatures },
): Rule[] {
  return rules.filter((rule) => {
    if (rule.s && rule.s !== context.sentiment) return false;
    if (rule.h && !rule.h.includes(context.heat)) return false;
    if (rule.g && !rule.g.some((genre) => context.genres.includes(genre))) return false;
    if (rule.when) {
      for (const [feature, expected] of Object.entries(rule.when)) {
        if (context.features[feature as keyof TitleFeatures] !== expected) return false;
      }
    }
    return true;
  });
}

function modifySlot(value: string, modifier?: string): string {
  switch (modifier) {
    case "cap":
      return value.length ? value[0]!.toUpperCase() + value.slice(1) : value;
    case "lower":
      return value.toLowerCase();
    case "quote":
      return `“${value}”`;
    case "a":
      return /^[aeiou]/iu.test(value) ? `an ${value}` : `a ${value}`;
    default:
      return value;
  }
}

function expandTemplate(
  template: string,
  context: {
    input: GenerateReviewInput;
    vibe: VibePack;
    movie?: MoviePack;
    random: RandomSource;
    features: TitleFeatures;
    genres: GenreId[];
  },
  depth = 0,
): string {
  if (depth > 8) return "";

  return template.replace(/#([\w.-]+)#/gu, (_placeholder, reference: string) => {
    const parts = reference.split(".");
    const possibleModifier = parts.at(-1);
    const modifier = ["cap", "lower", "quote", "a"].includes(possibleModifier ?? "")
      ? parts.pop()
      : undefined;
    const path = parts.join(".");
    let value: string | undefined;

    if (path === "title") value = displayTitle(context.input.title);
    else if (path === "titleShort") value = context.features.titleShort;
    else if (path === "director") value = context.movie?.director;
    else if (path === "year") value = context.movie?.year.toString();
    else if (path.startsWith("hook.")) {
      const hookName = path.slice("hook.".length) as keyof NonNullable<MoviePack["hooks"]>;
      const hook = context.movie?.hooks[hookName];
      value = Array.isArray(hook) ? choose(hook, context.random) : hook;
    } else {
      const rules = context.vibe.rules[path];
      if (rules) {
        const available = eligibleRules(rules, {
          sentiment: context.input.sentiment,
          heat: context.input.heat,
          genres: context.genres,
          features: context.features,
        });
        const rule = chooseWeighted(available, context.random);
        value = rule ? expandTemplate(rule.t, context, depth + 1) : undefined;
      }
    }

    return value ? modifySlot(value, modifier) : "";
  });
}

function fallbackLine(title: string, sentiment: Sentiment, features: TitleFeatures): string {
  if (features.question) return `“${title}” asks a question the runtime never answers.`;
  if (features.sequel) return `“${title}” is another installment in the franchise's ongoing subscription plan.`;
  if (features.long) return `“${title}” uses enough words to qualify as its own plot summary.`;
  if (sentiment === "love") return `“${title}” makes an unexpectedly strong case for giving it your evening.`;
  return `“${title}” mistakes a long runtime for a personality.`;
}

export function composeReviewBody(options: {
  input: GenerateReviewInput;
  vibe: VibePack;
  random: RandomSource;
}): string {
  const { input, vibe, random } = options;
  const movie = input.moviePack;
  const title = displayTitle(movie?.title ?? input.title);
  const features = extractTitleFeatures(title);
  const genres = input.genre ? [input.genre] : (movie?.genres ?? []).slice(0, 2);
  const context = { input, vibe, movie, random, features, genres };
  const matchingGold = movie?.gold.filter(
    (line) =>
      line.v === vibe.id &&
      (line.s === "any" || line.s === input.sentiment) &&
      (!line.h || line.h.includes(input.heat)),
  ) ?? [];

  if (matchingGold.length > 0 && random() < 0.55) {
    const selected = choose(matchingGold, random);
    if (selected) return expandTemplate(selected.text, context).trim();
  }

  const originRules = eligibleRules(vibe.rules.origin ?? [], {
    sentiment: input.sentiment,
    heat: input.heat,
    genres,
    features,
  });
  const origin = chooseWeighted(originRules, random);
  if (origin) {
    const expanded = expandTemplate(origin.t, context).replace(/\s+/gu, " ").trim();
    if (expanded) return expanded;
  }

  const availableSymbols = Object.keys(vibe.rules).filter((name) => name !== "origin").sort();
  for (const symbol of availableSymbols) {
    const rules = eligibleRules(vibe.rules[symbol] ?? [], {
      sentiment: input.sentiment,
      heat: input.heat,
      genres,
      features,
    });
    const rule = chooseWeighted(rules, random);
    if (rule) {
      const expanded = expandTemplate(rule.t, context).replace(/\s+/gu, " ").trim();
      if (expanded) return expanded;
    }
  }

  return fallbackLine(title, input.sentiment, features);
}

export function createUsername(vibe: VibePack, random: RandomSource): string {
  const { prefixes, cores, suffixes, casing } = vibe.username;
  const pieces = [choose(prefixes, random), choose(cores, random), choose(suffixes, random)]
    .filter((piece): piece is string => Boolean(piece))
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length === 0) return `critic_${Math.floor(random() * 10000)}`;

  if (casing === "snake") return pieces.join("_").replace(/\s+/gu, "_").toLowerCase();
  if (casing === "lower") return pieces.join("").replace(/\s+/gu, "").toLowerCase();
  if (casing === "title") {
    return pieces
      .join(" ")
      .split(/\s+/u)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  return pieces
    .map((part, index) => {
      const normalized = part.replace(/[_\s-]+/gu, " ").toLowerCase();
      const capitalized = normalized.replace(/(?:^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
      return index === 0 ? capitalized.charAt(0).toLowerCase() + capitalized.slice(1) : capitalized;
    })
    .join("");
}

export function chooseTags(tags: string[], random: RandomSource, limit = 3): string[] {
  const pool = [...new Set(tags)];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other]!, pool[index]!];
  }
  return pool.slice(0, Math.max(0, limit));
}

export function truncateText(value: string, maxLength: number): string {
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;
  const clipped = characters.slice(0, maxLength).join("");
  const sentenceEnd = clipped.lastIndexOf(".");
  return sentenceEnd > maxLength * 0.55 ? clipped.slice(0, sentenceEnd + 1) : `${clipped.trimEnd()}…`;
}
