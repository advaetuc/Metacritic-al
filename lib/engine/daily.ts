import { mulberry32, xmur3 } from "./prng";
import type { Heat, MovieIndexEntry, VibeId } from "./types";

export const DAILY_VIBES: readonly VibeId[] = [
  "film-student",
  "shitposter",
  "mid",
  "dad",
  "stan",
  "festival-snob",
  "linkedin",
  "conspiracy",
];

export interface DailyRoastSelection {
  dayKey: string;
  movie: MovieIndexEntry;
  vibe: VibeId;
  heat: Heat;
}

/** Selects the daily film and critic from a UTC YYYY-MM-DD key without browser state. */
export function selectDailyRoast(
  dayKey: string,
  movieIndex: readonly MovieIndexEntry[],
): DailyRoastSelection {
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/u.test(dayKey) ? new Date(`${dayKey}T00:00:00.000Z`) : undefined;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dayKey) {
    throw new RangeError("Daily roast needs a valid UTC date key.");
  }
  if (movieIndex.length === 0) throw new RangeError("Daily roast needs at least one movie.");

  // Sort first so the choice remains stable if the build pipeline changes index order.
  const movies = [...movieIndex].sort((left, right) => left.id.localeCompare(right.id));
  const random = mulberry32(xmur3(`daily-roast|${dayKey}`)());
  const movie = movies[Math.floor(random() * movies.length)]!;
  const vibe = DAILY_VIBES[Math.floor(random() * DAILY_VIBES.length)]!;
  const heat = Math.floor(random() * 4) as Heat;
  return { dayKey, movie, vibe, heat };
}
