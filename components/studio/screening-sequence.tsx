"use client";

import { m, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

interface ScreeningSequenceProps {
  onComplete: () => void;
}

export function ScreeningSequence({ onComplete }: ScreeningSequenceProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const duration = reducedMotion ? 300 : 1600;

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onComplete]);

  return (
    <div className={"screening-layer" + (reducedMotion ? " is-reduced" : "")} aria-label="Review screening">
      <button className="screening-skip" type="button" onClick={onComplete}>Skip</button>
      <div className="screening-center" aria-hidden="true">
        <m.svg
          className="screening-reel"
          viewBox="0 0 120 120"
          initial={{ rotate: 0 }}
          animate={{ rotate: reducedMotion ? 0 : 720 }}
          transition={{ duration: 1.1, delay: reducedMotion ? 0 : 0.2, ease: "easeInOut" }}
        >
          <circle cx="60" cy="60" r="51" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="60" cy="60" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="60" cy="29" r="8" fill="currentColor" />
          <circle cx="87" cy="44.5" r="8" fill="currentColor" />
          <circle cx="87" cy="75.5" r="8" fill="currentColor" />
          <circle cx="60" cy="91" r="8" fill="currentColor" />
          <circle cx="33" cy="75.5" r="8" fill="currentColor" />
          <circle cx="33" cy="44.5" r="8" fill="currentColor" />
        </m.svg>
        <div className="screening-countdown">
          <span>3</span><span>2</span><span>1</span>
        </div>
        <p className="screening-roasting">Roasting…</p>
        <span className="screening-caption">Rolling picture</span>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {reducedMotion ? "Roasting your review." : "Screening your review. You can skip ahead."}
      </p>
      {!reducedMotion ? <div className="screening-flash" aria-hidden="true" /> : null}
    </div>
  );
}
