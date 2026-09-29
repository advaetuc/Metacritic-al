"use client";

import { useEffect, useRef } from "react";

export function AmbientBackdrop() {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;

    const syncVisibility = () => {
      backdrop.dataset.paused = String(document.hidden);
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return (
    <div ref={backdropRef} className="ambient-backdrop" aria-hidden="true">
      <div className="ambient-blob ambient-blob--green" />
      <div className="ambient-blob ambient-blob--teal" />
      <div className="ambient-blob ambient-blob--violet" />
      <div className="ambient-blob ambient-blob--ember" />
      <div className="ambient-grain" />
    </div>
  );
}
