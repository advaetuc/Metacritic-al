"use client";

import { useEffect } from "react";
import type { Heat } from "@/lib/engine/types";

const HEAT_NAMES = ["Chill", "Warm", "Hot", "Scorching"] as const;

interface HeatDialProps {
  value: Heat;
  onChange: (value: Heat) => void;
}

export function HeatDial({ value, onChange }: HeatDialProps) {
  useEffect(() => {
    document.documentElement.style.setProperty("--heat", String(value / 3));
  }, [value]);

  return (
    <div className="heat-field">
      <div className="studio-label-row">
        <label className="studio-label" htmlFor="heat-slider">Heat</label>
        <output className="heat-value" htmlFor="heat-slider">{HEAT_NAMES[value]}</output>
      </div>
      <input
        id="heat-slider"
        className="heat-slider"
        type="range"
        min={0}
        max={3}
        step={1}
        value={value}
        aria-valuetext={`${HEAT_NAMES[value]}, level ${value}`}
        onChange={(event) => {
          const nextHeat = Number(event.currentTarget.value) as Heat;
          document.documentElement.style.setProperty("--heat", String(nextHeat / 3));
          onChange(nextHeat);
        }}
      />
      <div className="heat-scale" aria-hidden="true">
        {HEAT_NAMES.map((name, index) => <span key={name} className={index <= value ? "is-lit" : ""} />)}
      </div>
      <div className="heat-ends" aria-hidden="true"><span>Gentle ribbing</span><span>Full scorched earth</span></div>
    </div>
  );
}
