"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useId, useMemo } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { normalizeTitle } from "@/lib/engine/normalize";
import { xmur3 } from "@/lib/engine/prng";
import type { ReviewModel } from "@/lib/engine/types";

const FLOAT_SPRING = { stiffness: 90, damping: 18 };
const POSTER_PALETTES = [
  ["#0d573f", "#40e88b"],
  ["#21124c", "#9275ff"],
  ["#72321d", "#ffb451"],
  ["#133746", "#52bfcc"],
  ["#511d44", "#f16ea8"],
  ["#243b26", "#cadf79"],
] as const;

const DIGIT_WORDS = ["zero", "one", "two", "three", "four", "five"] as const;
const STAR_PATH = "M12 1.7l3.15 6.39 7.05 1.02-5.1 4.97 1.2 7.02L12 17.79l-6.3 3.31 1.2-7.02-5.1-4.97 7.05-1.02L12 1.7z";

function ratingLabel(rating: number): string {
  const whole = Math.floor(rating);
  const half = rating - whole >= 0.5;
  const value = whole === 0 && half
    ? "half"
    : half
      ? DIGIT_WORDS[whole] + " and a half"
      : DIGIT_WORDS[whole];
  return "Rated " + value + " out of five stars";
}

export function StarRating({ value }: { value: number }) {
  const id = useId().replace(/:/gu, "");
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <div className="review-stars" role="img" aria-label={ratingLabel(value)}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));
        return (
          <svg key={index} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <clipPath id={id + "-star-" + index}>
                <rect x="0" y="0" width={24 * fill} height="24" />
              </clipPath>
            </defs>
            <path className="review-star-outline" d={STAR_PATH} />
            {fill > 0 ? (
              <m.path
                className="review-star-fill"
                d={STAR_PATH}
                clipPath={"url(#" + id + "-star-" + index + ")"}
                initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.65 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0 } : { delay: index * 0.06, type: "spring", stiffness: 520, damping: 24 }}
              />
            ) : null}
          </svg>
        );
      })}
      <span className="review-rating-number" aria-hidden="true">{value.toFixed(1)}</span>
    </div>
  );
}

function PosterTile({ title }: { title: string }) {
  const hash = xmur3(normalizeTitle(title))();
  const [topColor, bottomColor] = POSTER_PALETTES[hash % POSTER_PALETTES.length]!;
  const words = title.trim().split(/\s+/u).filter(Boolean);
  const initials = (words.length > 1
    ? words.slice(0, 3).map((word) => Array.from(word)[0]).join("")
    : Array.from(title).slice(0, 2).join("")).toUpperCase();
  const style = {
    "--poster-top": topColor,
    "--poster-bottom": bottomColor,
    "--poster-turn": ((hash >>> 8) % 360) + "deg",
  } as CSSProperties;

  return (
    <div className="poster-tile" style={style} role="img" aria-label={"Procedural poster for " + title}>
      <svg className="poster-art" viewBox="0 0 120 170" aria-hidden="true">
        <circle cx={25 + (hash % 70)} cy={34 + ((hash >>> 5) % 90)} r={20 + ((hash >>> 12) % 24)} />
        <path d="M-5 125 Q35 83 66 127 T128 120 V180 H-5Z" />
        <path d="M-8 145 Q32 111 63 148 T128 142" className="poster-art-line" />
      </svg>
      <span className="poster-initials" aria-hidden="true">{initials || "F"}</span>
      <span className="poster-grain" aria-hidden="true" />
    </div>
  );
}

function RoastBody({ text }: { text: string }) {
  const reducedMotion = useReducedMotion() ?? false;
  const tokens = useMemo(() => text.match(/\s+|\S+/gu) ?? [], [text]);
  const wordCount = tokens.filter((token) => /\S/u.test(token)).length;
  const stagger = reducedMotion || wordCount <= 1 ? 0 : Math.min(0.018, 0.9 / (wordCount - 1));
  const revealTransition = reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" as const };

  return (
    <>
      <p className="sr-only" role="status" aria-label="Review text" aria-live="polite" aria-atomic="true">{text}</p>
      <m.p
        className="review-body"
        aria-hidden="true"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { delayChildren: reducedMotion ? 0 : 0.32, staggerChildren: stagger } } }}
      >
        {tokens.map((token, index) => (
          /\s/u.test(token)
            ? token
            : <m.span key={index} variants={{ hidden: { opacity: 0, y: reducedMotion ? 0 : 5 }, visible: { opacity: 1, y: 0 } }} transition={revealTransition}>{token}</m.span>
        ))}
      </m.p>
    </>
  );
}

export function GlassReviewCard({ model }: { model: ReviewModel }) {
  const reducedMotion = useReducedMotion() ?? false;
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, FLOAT_SPRING);
  const rotateY = useSpring(rawRotateY, FLOAT_SPRING);
  const userInitial = Array.from(model.username)[0]?.toUpperCase() ?? "C";
  const vibeAccents: Partial<Record<ReviewModel["vibe"], string>> = {
    "film-student": "#2BFF88",
    shitposter: "#FF7A2F",
    mid: "#FFC857",
    dad: "#7CFFB5",
    stan: "#FF6FAE",
    "festival-snob": "#B39AFF",
    linkedin: "#66B8FF",
    conspiracy: "#FF6E5E",
  };
  const cardStyle = {
    rotateX,
    rotateY,
    transformPerspective: 1100,
    "--review-accent": vibeAccents[model.vibe] ?? "#2BFF88",
    "--avatar-hue": String(model.avatarSeed % 360),
  } as CSSProperties;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType !== "mouse" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    rawRotateY.set(x * 6);
    rawRotateX.set(y * -6);
  }

  function resetTilt() {
    rawRotateX.set(0);
    rawRotateY.set(0);
  }

  return (
    <m.article
      className="review-card-wrap"
      aria-label={"Review for " + model.movie.title}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 40, rotateX: reducedMotion ? 0 : 12, scale: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0.15, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 26 }}
    >
      <m.div className="glass-lens review-card" style={cardStyle} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
        <div className="review-sprocket-strip" aria-hidden="true" />
        <header className="review-user">
          <span className="review-avatar" aria-hidden="true">{userInitial}</span>
          <div className="review-user-meta">
            <strong>{model.username}</strong>
            <span>{model.watchedLabel}</span>
          </div>
          {model.rewatch ? <span className="rewatch-chip">↻ Rewatch</span> : null}
        </header>

        <div className="review-movie-row">
          <PosterTile title={model.movie.title} />
          <div className="review-movie-meta">
            <p className="review-overline">{model.movie.genre ?? "Movie review"}</p>
            <h2>{model.movie.title}</h2>
            {model.movie.year ? <p className="review-year">{model.movie.year}</p> : null}
            <StarRating value={model.rating} />
          </div>
        </div>

        <div className="review-rule" aria-hidden="true" />
        <RoastBody text={model.body} />
        {model.tags.length > 0 ? (
          <ul className="review-tags" aria-label="Review tags">
            {model.tags.map((tag) => <li key={tag}>#{tag.replace(/^#/u, "")}</li>)}
          </ul>
        ) : null}

        <footer className="review-footer">
          <span><span aria-hidden="true">♥</span> {model.likes.toLocaleString()}</span>
          <span><span aria-hidden="true">▤</span> {model.comments.toLocaleString()}</span>
          <span className="review-wordmark">metacritic-al <span aria-hidden="true">· 🔥</span></span>
        </footer>
      </m.div>
    </m.article>
  );
}
