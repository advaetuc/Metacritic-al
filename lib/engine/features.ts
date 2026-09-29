import { displayTitle } from "./normalize";
import type { TitleFeatures } from "./types";

export function extractTitleFeatures(value: string): TitleFeatures {
  const title = displayTitle(value);
  const tokens = title.match(/[\p{L}\p{N}]+/gu) ?? [];
  return {
    colon: title.includes(":") || title.includes(" - "),
    sequel: /(?:\b\d+\s*$|\bpart\s+(?:\d+|[ivxlcdm]+)\b|\b(?:returns|reloaded)\s*$)/iu.test(title),
    oneWord: tokens.length === 1,
    long: tokens.length > 5,
    question: title.includes("?"),
    exclaim: title.includes("!"),
    possessive: /(?:'s|’s)\b/iu.test(title),
    startsThe: /^the\b/iu.test(title),
    hasYear: /\b(?:19|20)\d{2}\b/u.test(title),
    titleShort: displayTitle(title.split(/:\s*/u, 1)[0] ?? title),
  };
}
