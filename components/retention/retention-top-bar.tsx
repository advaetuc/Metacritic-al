"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRetentionStore } from "@/lib/state/retention-store";
import { HistoryDrawer } from "./history-drawer";

export function RetentionTopBar() {
  const hydrate = useRetentionStore((state) => state.hydrate);
  const streak = useRetentionStore((state) => state.streak.current);
  const historyCount = useRetentionStore((state) => state.history.length);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { hydrate(); }, [hydrate]);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <>
      <header className="retention-topbar" aria-label="Your activity">
        <Link className="retention-topbar__brand" href="/" aria-label="Metacritic-al home"><span aria-hidden="true">●</span> metacritic-al</Link>
        <div className="retention-topbar__actions">
          <span className="streak-badge" aria-label={`${streak} day roast streak`} title="Your current daily roast streak">
            <span aria-hidden="true">🔥</span><strong data-testid="streak-count">{streak}</strong><span>{streak === 1 ? "day streak" : "day streaks"}</span>
          </span>
          <button type="button" className="history-trigger" aria-expanded={historyOpen} aria-controls="history-dialog" onClick={() => setHistoryOpen(true)} ref={historyButtonRef}>
            <span aria-hidden="true">▤</span> History <span className="history-trigger__count" aria-label={`${historyCount} saved reviews`}>{historyCount}</span>
          </button>
        </div>
      </header>
      {historyOpen ? <HistoryDrawer onClose={closeHistory} closeButtonRef={closeButtonRef} /> : null}
    </>
  );
}
