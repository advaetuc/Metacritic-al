export const STORAGE_PREFIX = "rr:v1:";

function storageKey(key: string): string {
  return STORAGE_PREFIX + key;
}

/** Parse persisted data without allowing storage or malformed JSON failures to escape. */
export function readAppStorage<T>(key: string, fallback: T): T {
  try {
    const serialized = globalThis.localStorage.getItem(storageKey(key));
    if (serialized === null) return fallback;
    return JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
}

/** Persist JSON data; returns false when private mode, quota, or serialization blocks it. */
export function writeAppStorage(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage.setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeAppStorage(key: string): boolean {
  try {
    globalThis.localStorage.removeItem(storageKey(key));
    return true;
  } catch {
    return false;
  }
}
