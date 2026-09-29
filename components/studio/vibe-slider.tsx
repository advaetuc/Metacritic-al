"use client";

import { m } from "framer-motion";
import type { KeyboardEvent } from "react";
import type { VibeId } from "@/lib/engine/types";

export const BASE_VIBES: ReadonlyArray<{ id: VibeId; label: string }> = [
  { id: "film-student", label: "Film student" },
  { id: "shitposter", label: "Shitposter" },
  { id: "mid", label: "Mid enjoyer" },
  { id: "dad", label: "Dad" },
  { id: "stan", label: "Stan" },
  { id: "festival-snob", label: "Festival snob" },
  { id: "linkedin", label: "LinkedIn critic" },
  { id: "conspiracy", label: "Conspiracy theorist" },
];

interface VibeSliderProps {
  value: VibeId;
  onChange: (value: VibeId) => void;
}

export function VibeSlider({ value, onChange }: VibeSliderProps) {
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1
        : event.key === "Home" ? -currentIndex
          : event.key === "End" ? BASE_VIBES.length - 1 - currentIndex
            : 0;
    if (direction === 0) return;
    event.preventDefault();
    const nextIndex = (currentIndex + direction + BASE_VIBES.length) % BASE_VIBES.length;
    const next = BASE_VIBES[nextIndex]!;
    onChange(next.id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("[role='radio']")[nextIndex]
      ?.focus();
  }

  return (
    <div className="vibe-field">
      <div className="studio-label-row">
        <span className="studio-label" id="vibe-label">Choose your critic</span>
        <span className="studio-hint">8 voices</span>
      </div>
      <div className="vibe-slider" role="radiogroup" aria-labelledby="vibe-label" aria-orientation="horizontal">
        {BASE_VIBES.map((vibe, index) => {
          const selected = value === vibe.id;
          return (
            <m.button
              key={vibe.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={vibe.label}
              tabIndex={selected ? 0 : -1}
              className={`glass-chip vibe-chip${selected ? " is-selected" : ""}`}
              layout
              transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.8 }}
              onClick={() => onChange(vibe.id)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              {selected ? <span className="vibe-chip__dot" aria-hidden="true" /> : null}
              <span>{vibe.label}</span>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
