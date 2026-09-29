"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { matchMovieTitle } from "@/lib/engine/matcher";
import { useStudioStore } from "@/lib/state/studio-store";
import { loadMovieIndex } from "@/lib/data/load-movie-index";
import type { MovieIndexEntry } from "@/lib/engine/types";

export function HeroSearch() {
  const id = useId();
  const title = useStudioStore((state) => state.draft.title);
  const setTitle = useStudioStore((state) => state.setTitle);
  const [index, setIndex] = useState<MovieIndexEntry[]>([]);
  const [indexReady, setIndexReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);

  useEffect(() => {
    let mounted = true;
    loadMovieIndex()
      .then((entries) => {
        if (mounted) setIndex(entries);
      })
      .catch(() => {
        // The title can still be reviewed through the fallback path without curated data.
      })
      .finally(() => {
        if (mounted) setIndexReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Debounce is intentionally zero: this compact local index is matched on each keystroke.
  const match = useMemo(() => matchMovieTitle(title, index), [title, index]);
  const candidate = match.kind === "none" ? undefined : match.entry;
  const listboxId = `${id}-suggestions`;
  const optionId = `${listboxId}-0`;

  function acceptCandidate(entry: MovieIndexEntry) {
    setTitle(entry.t);
    setOpen(false);
    setActiveOption(-1);
  }

  return (
    <div className="hero-search">
      <label className="studio-label" htmlFor={`${id}-input`}>Movie title</label>
      <div className="hero-search__control">
        <input
          id={`${id}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && Boolean(candidate)}
          aria-controls={listboxId}
          aria-activedescendant={open && activeOption === 0 && candidate ? optionId : undefined}
          autoComplete="off"
          value={title}
          placeholder="A movie you love or hate"
          onChange={(event) => {
            setTitle(event.currentTarget.value);
            setOpen(true);
            setActiveOption(-1);
          }}
          onFocus={() => {
            if (candidate) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && candidate) {
              event.preventDefault();
              setOpen(true);
              setActiveOption(0);
            } else if (event.key === "ArrowUp" && open) {
              event.preventDefault();
              setActiveOption(-1);
            } else if (event.key === "Enter" && open && activeOption === 0 && candidate) {
              event.preventDefault();
              acceptCandidate(candidate);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveOption(-1);
            }
          }}
        />
        <span className="hero-search__icon" aria-hidden="true">⌕</span>
      </div>
      {open && candidate ? (
        <ul id={listboxId} className="hero-search__suggestions" role="listbox" aria-label="Movie suggestions">
          <li
            id={optionId}
            role="option"
            aria-selected={activeOption === 0}
            className="hero-search__option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => acceptCandidate(candidate)}
          >
            <span>{match.kind === "suggestion" ? `Did you mean ${candidate.t}?` : candidate.t}</span>
            <span className="hero-search__year">{candidate.y}</span>
          </li>
        </ul>
      ) : null}
      <p className="studio-hint" aria-live="polite">
        {candidate && match.kind === "exact"
          ? "Curated title found."
          : candidate && match.kind === "suggestion"
            ? "Suggestion only — choose it to use the curated title."
            : title.trim() && indexReady
              ? "We haven't seen that one. Pick a genre for a sharper roast."
              : "Searches the local movie index as you type."}
      </p>
    </div>
  );
}
