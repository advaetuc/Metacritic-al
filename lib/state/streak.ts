export interface DailyStreak {
  current: number;
  lastRoastDay: string | null;
}

export const EMPTY_STREAK: DailyStreak = { current: 0, lastRoastDay: null };
const MS_PER_DAY = 86_400_000;

/** A local calendar key, independent of UTC offsets and daylight-saving day length. */
export function localCalendarDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarOrdinal(dayKey: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dayKey);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return Math.floor(date.getTime() / MS_PER_DAY);
}

/** Count once per local day: consecutive days extend the streak, missed days restart it. */
export function recordStreakDay(previous: DailyStreak, now = new Date()): DailyStreak {
  if (!Number.isFinite(now.getTime())) return previous;
  const today = localCalendarDay(now);
  if (!previous.lastRoastDay) return { current: 1, lastRoastDay: today };
  const todayOrdinal = calendarOrdinal(today);
  const lastOrdinal = calendarOrdinal(previous.lastRoastDay);
  if (todayOrdinal === undefined || lastOrdinal === undefined) return { current: 1, lastRoastDay: today };
  const difference = todayOrdinal - lastOrdinal;
  if (difference <= 0) return previous;
  return { current: difference === 1 ? previous.current + 1 : 1, lastRoastDay: today };
}
