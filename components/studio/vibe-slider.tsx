"use client";

import { m } from "framer-motion";
import type { KeyboardEvent } from "react";
import type { VibeId } from "@/lib/engine/types";
import { isVibeUnlocked, VIBE_UNLOCKS } from "@/lib/state/gamification";

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

const EXTRA_VIBES: ReadonlyArray<{ id: VibeId; label: string }> = [
  { id: "sports", label: "Sports commentator" },
  { id: "victorian", label: "Victorian critic" },
  { id: "nature", label: "Nature narrator" },
];

export const ALL_VIBES = [...BASE_VIBES, ...EXTRA_VIBES.map(({ id, label }) => ({ id, label }))];

interface VibeSliderProps {
  value: VibeId;
  onChange: (value: VibeId) => void;
  totalRoasts?: number;
}

export function VibeSlider({ value, onChange, totalRoasts = 0 }: VibeSliderProps) {
  const availableVibes = ALL_VIBES.filter((vibe) => isVibeUnlocked(vibe.id, totalRoasts));

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, currentVibe: VibeId) {
    const currentIndex = availableVibes.findIndex((vibe) => vibe.id === currentVibe);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1
        : event.key === "Home" ? -currentIndex
        : event.key === "End" ? availableVibes.length - 1 - currentIndex
            : 0;
    if (direction === 0) return;
    event.preventDefault();
    const nextIndex = (currentIndex + direction + availableVibes.length) % availableVibes.length;
    const next = availableVibes[nextIndex]!;
    onChange(next.id);
    const enabledRadios = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='radio']") ?? [])
      .filter((radio) => !radio.disabled);
    enabledRadios[nextIndex]?.focus();
  }

  return (
    <div className="vibe-field">
      <div className="studio-label-row">
        <span className="studio-label" id="vibe-label">Choose your critic</span>
        <span className="studio-hint">{availableVibes.length} voices available</span>
      </div>
      <div className="vibe-slider" role="radiogroup" aria-labelledby="vibe-label" aria-orientation="horizontal">
        {ALL_VIBES.map((vibe) => {
          const selected = value === vibe.id;
          const unlockAt = VIBE_UNLOCKS[vibe.id];
          const locked = !isVibeUnlocked(vibe.id, totalRoasts);
          return (
            <m.button
              key={vibe.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={locked ? `${vibe.label}, locked, unlocks after ${unlockAt} roasts` : vibe.label}
              tabIndex={selected ? 0 : -1}
              disabled={locked}
              title={locked ? `${unlockAt! - totalRoasts} more roast${unlockAt! - totalRoasts === 1 ? "" : "s"} to unlock` : undefined}
              className={`glass-chip vibe-chip${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}`}
              layout
              transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.8 }}
              onClick={() => onChange(vibe.id)}
              onKeyDown={(event) => moveFocus(event, vibe.id)}
            >
              {locked ? <span className="vibe-chip__lock" aria-hidden="true">🔒</span> : selected ? <span className="vibe-chip__dot" aria-hidden="true" /> : null}
              <span>{vibe.label}</span>
              {locked ? <small className="vibe-chip__unlock-count">{unlockAt}</small> : null}
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
