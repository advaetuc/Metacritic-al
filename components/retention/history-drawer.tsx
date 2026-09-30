"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRetentionStore } from "@/lib/state/retention-store";
import type { RoastHistoryItem } from "@/lib/state/retention-store";

const VIBE_NAMES: Record<RoastHistoryItem["vibe"], string> = {
  "film-student": "Film student", shitposter: "Shitposter", mid: "Mid enjoyer", dad: "Dad",
  stan: "Stan", "festival-snob": "Festival snob", linkedin: "LinkedIn critic", conspiracy: "Conspiracy theorist",
  sports: "Sports commentator", victorian: "Victorian critic", nature: "Nature narrator",
};

function formatTimestamp(timestamp: number): string {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp); }
  catch { return new Date(timestamp).toISOString(); }
}

export function HistoryDrawer({ onClose, closeButtonRef }: { onClose: () => void; closeButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  const history = useRetentionStore((state) => state.history);
  const clearHistory = useRetentionStore((state) => state.clearHistory);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeButtonRef, onClose]);

  return (
    <div className="history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="history-drawer glass-panel" id="history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" aria-describedby="history-description" ref={dialogRef}>
        <header className="history-drawer__header">
          <div><p className="landing-kicker">Hall of Flame</p><h2 id="history-title">Your roast history</h2><p id="history-description">The 50 most recent reviews on this device.</p></div>
          <button type="button" className="history-drawer__close" onClick={onClose} ref={closeButtonRef} aria-label="Close roast history">×</button>
        </header>
        <div className="history-drawer__tools"><span>{history.length} of 50 saved</span><button type="button" onClick={clearHistory} disabled={history.length === 0}>Clear history</button></div>
        {history.length === 0 ? <p className="history-empty" role="status">Your next roast will appear here.</p> : (
          <ol className="history-list">
            {history.map((item, index) => (
              <li key={`${item.ts}-${index}`}>
                <Link href={item.url} onClick={onClose} className="history-item">
                  <span className="history-item__main"><strong>{item.title}</strong><span>{VIBE_NAMES[item.vibe]}</span></span>
                  <span className="history-item__rating">{item.rating.toFixed(1)}<small> / 5</small></span>
                  <time dateTime={new Date(item.ts).toISOString()}>{formatTimestamp(item.ts)}</time>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <p className="history-drawer__note">Clearing this list keeps your streak and vibe unlock progress.</p>
      </section>
    </div>
  );
}
