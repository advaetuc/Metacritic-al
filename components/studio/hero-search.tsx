"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { matchMovieTitle } from "@/lib/engine/matcher";
import type { MovieIndexEntry } from "@/lib/engine/types";
import { loadMovieIndex } from "@/lib/data/load-movie-index";
import { useStudioStore } from "@/lib/state/studio-store";
import {
  normalizeTmdbSearchResponse,
  normalizeTmdbMovieDetails,
  tmdbErrorCode,
  tmdbPosterUrl,
  type TmdbSuggestion,
} from "@/lib/tmdb/client";

const SEARCH_DEBOUNCE_MS = 250;

type SearchStatus = "idle" | "loading" | "ready" | "empty" | "disabled" | "offline" | "timeout" | "rate-limited" | "error";
interface RemoteSearchState {
  query: string;
  revision: number;
  movies: TmdbSuggestion[];
  status: SearchStatus;
}
type SearchOption =
  | { kind: "curated"; entry: MovieIndexEntry; title: string; year: number }
  | { kind: "tmdb"; movie: TmdbSuggestion; title: string; year?: number };

function PosterThumbnail({ path }: { path?: string }) {
  const [failed, setFailed] = useState(false);
  const src = tmdbPosterUrl(path);
  if (!src || failed) return <span className="hero-search__poster-placeholder" aria-hidden="true">◩</span>;
  return <Image className="hero-search__poster" src={src} alt="" width={36} height={48} unoptimized onError={() => setFailed(true)} />;
}

function statusMessage(status: SearchStatus): string {
  switch (status) {
    case "loading": return "Searching movie titles…";
    case "empty": return "No TMDB match. You can still use the typed title.";
    case "disabled": return "TMDB search is not configured. Use the typed title to continue.";
    case "offline": return "TMDB search is offline. Use the typed title to continue.";
    case "timeout": return "TMDB search took too long. Use the typed title to continue.";
    case "rate-limited": return "TMDB is rate-limiting searches. Use the typed title to continue.";
    case "error": return "Movie search is unavailable right now. Use the typed title to continue.";
    case "ready": return "Choose a movie suggestion, or keep your typed title.";
    default: return "Search curated titles and live movie suggestions as you type.";
  }
}

function statusFromError(error: unknown): SearchStatus {
  const code = error instanceof SearchResponseError ? error.code : null;
  if (code === "tmdb_disabled" || code === "tmdb_auth_failed") return "disabled";
  if (code === "tmdb_timeout") return "timeout";
  if (code === "tmdb_rate_limited") return "rate-limited";
  if ((code === "tmdb_unavailable" && error instanceof SearchResponseError && error.status === 503)
    || (error instanceof TypeError && !(error instanceof SearchResponseError))) return "offline";
  return "error";
}

class SearchResponseError extends Error {
  constructor(readonly code: string | null, readonly status: number | null = null) {
    super("Movie search request failed.");
  }
}

export function HeroSearch() {
  const id = useId();
  const title = useStudioStore((state) => state.draft.title);
  const selectedMovie = useStudioStore((state) => state.draft.selectedMovie);
  const selectedMovieId = selectedMovie?.tmdbId;
  const setTitle = useStudioStore((state) => state.setTitle);
  const selectTmdbMovie = useStudioStore((state) => state.selectTmdbMovie);
  const clearSelectedMovie = useStudioStore((state) => state.clearSelectedMovie);
  const [index, setIndex] = useState<MovieIndexEntry[]>([]);
  const [indexReady, setIndexReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRevision, setSearchRevision] = useState(0);
  const [remoteState, setRemoteState] = useState<RemoteSearchState>({ query: "", revision: -1, movies: [], status: "idle" });
  const normalizedSearchQuery = searchQuery.trim();
  const currentRemoteState = remoteState.query === normalizedSearchQuery && remoteState.revision === searchRevision ? remoteState : null;
  const status: SearchStatus = Array.from(normalizedSearchQuery).length < 2
    ? "idle"
    : currentRemoteState?.status ?? "loading";
  const remoteMovies = currentRemoteState?.movies;

  useEffect(() => {
    let mounted = true;
    loadMovieIndex()
      .then((entries) => {
        if (mounted) setIndex(entries);
      })
      .catch(() => {
        // Typed titles remain available when the curated index cannot load.
      })
      .finally(() => {
        if (mounted) setIndexReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (Array.from(query).length < 2) return;

    const controller = new AbortController();
    let current = true;

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          let payload: unknown;
          try {
            payload = await response.json() as unknown;
          } catch {
            throw new SearchResponseError(null, response.status);
          }
          if (!response.ok) throw new SearchResponseError(tmdbErrorCode(payload), response.status);
          const movies = normalizeTmdbSearchResponse(payload);
          if (current && !controller.signal.aborted) {
            setRemoteState({ query, revision: searchRevision, movies, status: movies.length ? "ready" : "empty" });
          }
        } catch (error) {
          if (!current || controller.signal.aborted) return;
          setRemoteState({ query, revision: searchRevision, movies: [], status: statusFromError(error) });
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      current = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery, searchRevision]);

  useEffect(() => {
    if (selectedMovieId === undefined) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/tmdb/movie/${selectedMovieId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const normalized = normalizeTmdbMovieDetails(await response.json() as unknown, selectedMovieId);
        if (!normalized || controller.signal.aborted) return;
        const current = useStudioStore.getState().draft.selectedMovie;
        if (current?.tmdbId === normalized.tmdbId) {
          useStudioStore.getState().selectTmdbMovie({ ...current, ...normalized, title: current.title });
        }
      } catch {
        // Details enrich the selected result when available; typed-title and summary metadata remain usable.
      }
    })();
    return () => controller.abort();
  }, [selectedMovieId]);

  const match = useMemo(() => matchMovieTitle(title, index), [title, index]);
  const candidate = !selectedMovie && match.kind !== "none" ? match.entry : undefined;
  const options = useMemo<SearchOption[]>(() => {
    const local = candidate && match.kind !== "none"
      ? [{ kind: "curated" as const, entry: candidate, title: candidate.t, year: candidate.y }]
      : [];
    const remote = (remoteMovies ?? []).map((movie) => ({
      kind: "tmdb" as const,
      movie,
      title: movie.title,
      ...(movie.year !== undefined ? { year: movie.year } : {}),
    }));
    return [...local, ...remote].slice(0, 8);
  }, [candidate, match, remoteMovies]);

  const listboxId = `${id}-suggestions`;
  const optionId = (option: SearchOption) => option.kind === "tmdb"
    ? `${listboxId}-tmdb-${option.movie.tmdbId}`
    : `${listboxId}-curated-${option.entry.id}`;
  const listOpen = open && options.length > 0;

  function acceptOption(option: SearchOption) {
    if (option.kind === "tmdb") {
      selectTmdbMovie({
        tmdbId: option.movie.tmdbId,
        title: option.movie.title,
        ...(option.movie.genres ? { genres: option.movie.genres } : {}),
        ...(option.movie.overviewTokens ? { overviewTokens: option.movie.overviewTokens } : {}),
        ...(option.movie.taglineTokens ? { taglineTokens: option.movie.taglineTokens } : {}),
        ...(option.movie.year !== undefined ? { year: option.movie.year } : {}),
        ...(option.movie.runtime !== undefined ? { runtime: option.movie.runtime } : {}),
        ...(option.movie.voteAverage !== undefined ? { voteAverage: option.movie.voteAverage } : {}),
        ...(option.movie.voteCount !== undefined ? { voteCount: option.movie.voteCount } : {}),
        ...(option.movie.posterPath ? { posterPath: option.movie.posterPath } : {}),
        ...(option.movie.genre ? { genre: option.movie.genre } : {}),
      });
    }
    else setTitle(option.entry.t);
    setSearchQuery("");
    setOpen(false);
    setActiveOption(-1);
  }

  function useTypedTitle() {
    clearSelectedMovie();
    setSearchQuery("");
    setOpen(false);
    setActiveOption(-1);
  }

  const hint = searchQuery.trim().length < 2 && title.trim() && !indexReady
    ? "Loading curated movie titles…"
    : statusMessage(status);

  return (
    <div className="hero-search">
      <label className="studio-label" htmlFor={`${id}-input`}>Movie title</label>
      <div className="hero-search__control">
        <input
          id={`${id}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-activedescendant={listOpen && activeOption >= 0 ? optionId(options[activeOption]!) : undefined}
          autoComplete="off"
          value={title}
          placeholder="A movie you love or hate"
          onChange={(event) => {
            const value = event.currentTarget.value;
            setTitle(value);
            setSearchQuery(value);
            setSearchRevision((revision) => revision + 1);
            setOpen(true);
            setActiveOption(-1);
          }}
          onFocus={() => {
            if (title.trim()) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && options.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveOption((current) => current >= options.length - 1 ? 0 : current + 1);
            } else if (event.key === "ArrowUp" && options.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveOption((current) => current <= 0 ? options.length - 1 : current - 1);
            } else if (event.key === "Enter" && listOpen && activeOption >= 0) {
              event.preventDefault();
              const option = options[activeOption];
              if (option) acceptOption(option);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveOption(-1);
            }
          }}
        />
        <span className="hero-search__icon" aria-hidden="true">⌕</span>
      </div>

      <ul id={listboxId} className="hero-search__suggestions" role="listbox" aria-label="Movie suggestions" hidden={!listOpen}>
          {listOpen ? options.map((option, optionIndex) => {
            const key = option.kind === "tmdb" ? `tmdb-${option.movie.tmdbId}` : `curated-${option.entry.id}`;
            return (
              <li
                key={key}
                id={optionId(option)}
                role="option"
                aria-selected={activeOption === optionIndex}
                className="hero-search__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => acceptOption(option)}
              >
                <PosterThumbnail path={option.kind === "tmdb" ? option.movie.posterPath : undefined} />
                <span className="hero-search__option-copy">
                  <span className="hero-search__option-title">{option.title}</span>
                  <span className="hero-search__option-source">{option.kind === "curated" ? "Curated review" : "Movie"}</span>
                </span>
                {option.year !== undefined ? <span className="hero-search__year">{option.year}</span> : <span className="hero-search__year">Year unknown</span>}
              </li>
            );
          }) : null}
      </ul>

      <p className="studio-hint" aria-live="polite">{hint}</p>
      {selectedMovie ? (
        <p className="hero-search__selected" aria-live="polite">
          Selected movie: {selectedMovie.title}{selectedMovie.year !== undefined ? ` (${selectedMovie.year})` : ""}.
        </p>
      ) : null}
      {title.trim() ? (
        <button className="hero-search__typed-title" type="button" onMouseDown={(event) => event.preventDefault()} onClick={useTypedTitle}>
          Use typed title
        </button>
      ) : null}
    </div>
  );
}
