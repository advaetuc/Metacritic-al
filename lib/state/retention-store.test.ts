import { beforeEach, describe, expect, it } from "vitest";
import { MAX_HISTORY_ITEMS, useRetentionStore } from "./retention-store";

beforeEach(() => {
  useRetentionStore.setState({ history: [], streak: { current: 0, lastRoastDay: null }, totalRoasts: 0, hydrated: false });
});

describe("retention history", () => {
  it("keeps the newest roast first and caps the ring buffer at 50", () => {
    const recordRoast = useRetentionStore.getState().recordRoast;
    for (let i = 0; i < 55; i += 1) {
      recordRoast({ url: `/r/?t=movie-${i}`, title: `Movie ${i}`, vibe: "film-student", rating: 3.5, ts: 1_700_000_000_000 + i * 1000 });
    }
    const state = useRetentionStore.getState();
    expect(state.history).toHaveLength(MAX_HISTORY_ITEMS);
    expect(state.history[0]?.title).toBe("Movie 54");
    expect(state.history.at(-1)?.title).toBe("Movie 5");
    expect(state.totalRoasts).toBe(55);
  });

  it("records in memory if local storage is unavailable", () => {
    useRetentionStore.getState().recordRoast({ url: "/r/?t=offline", title: "Offline Movie", vibe: "film-student", rating: 4, ts: 1_700_000_000_000 });
    expect(useRetentionStore.getState().history[0]?.title).toBe("Offline Movie");
    expect(useRetentionStore.getState().totalRoasts).toBe(1);
  });
});
