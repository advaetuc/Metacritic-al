# ROASTREEL — Product & Engineering Blueprint

> Working title: **Roastreel** (swap freely; nothing below depends on the name).
> Tagline candidates: "Your taste, on trial." · "Name a movie. Get roasted."
> Status: Blueprint v1.0 — source of truth for development. No application code exists yet.
> Stack: Next.js (App Router, static export) · TypeScript · Tailwind CSS v4 · Framer Motion · Vercel static hosting.

**How to read this document.** Sections 1–2 say *what* and *how it should feel*. Sections 3–4 say *how it works* and *how it is built*. Section 5 covers deployment. Sections 6–8 cover delivery order, risks, and appendices. Anything marked **[VERIFY]** is a claim about a third-party tool, platform limit, or number that should be confirmed during the Phase 0 spike before it is relied on.

---

## 1. Executive Summary & Feature Matrix

### 1.1 What the product is

Roastreel is a zero-backend web app. A visitor types a movie they love or hate, picks a **Roaster Vibe** (a comedic persona) and a **Heat** level, and within about two seconds gets a hyper-specific, satirical review rendered as a **Review Card**: fake username, generated avatar, half-star rating, "watched" timestamp, like/comment counters, and the roast itself. The card is designed to be screenshotted, downloaded as a PNG, or posted to X in one tap.

There is no server, no account, no database, and no API key. Everything is computed in the browser from static JSON that ships from a CDN.

### 1.2 Why it can go viral (the loops)

| Loop | Mechanic | Why it spreads |
|---|---|---|
| **Self-expression loop** | Roast a movie you love/hate → share the card | People post opinions about movies they care about; the card makes the opinion funny and finished. |
| **Permalink replay loop** | Every card has a URL that deterministically regenerates the exact same review | A friend opening the link sees the same card instantly, with a "Roast your own" call to action. |
| **Battle loop** | "Roast Battle": same film, two vibes, split card; link challenges a friend to pick a side | Built-in two-player framing; sharing is the game. |
| **Daily ritual loop** | "Daily Roast": everyone gets the same film and vibe that day (derived from the UTC date, no server) | Shared daily topic, streaks, and a reason to come back and compare. |
| **Identity loop** | "Top Four Intervention": enter four favourite films, get one roast of your taste | Taste is identity; people share roasts of themselves more readily than of anything else. |
| **Collection loop** | Badges, vibe unlocks, "Hall of Flame" history, year-end "Roast Wrapped" | Completionism drives repeat sessions with zero backend cost. |
| **Counter-roast loop** | One tap generates the opposing review from an opposing vibe | Creates a natural reply-thread format on X. |

### 1.3 Feature matrix

Phase key: **P0** = launch MVP · **P1** = first week after launch · **P2** = growth features.

| # | Feature | Description | Virality / retention role | Phase |
|---|---|---|---|---|
| F1 | Title search with instant suggestions | Client-side prefix + fuzzy match over a ~30 KB index of curated films | Speed; makes exact matches feel magical | P0 |
| F2 | Love / Hate toggle | Sets sentiment for the roast and the rating distribution | Core input; drives comedic contrast | P0 |
| F3 | Roaster Vibe selector | Eight vibes at launch (see 1.4), horizontally snapping carousel | Persona choice is the product's identity | P0 |
| F4 | Heat dial | Four levels from Lukewarm to Scorched Earth; affects language intensity, rating, and background | Escalation invites re-roasting | P0 |
| F5 | Curated engine | Hand-written "gold lines" plus film-specific hooks for popular films | Highest-quality output where traffic concentrates | P0 |
| F6 | Procedural fallback engine | Seeded grammar engine that works with only a title and an optional genre chip | Any title works; no dead ends | P0 |
| F7 | Glass Review Card | Faux social-film-platform card with animated stars, avatar, timestamp, counters | The shareable artefact | P0 |
| F8 | Cinematic loading sequence | Film reel + 3-2-1 projector countdown, skippable | Builds anticipation; the screen-recordable moment | P0 |
| F9 | Save as image | PNG export via html2canvas using a dedicated export twin (see 3.9) | Primary share path on mobile | P0 |
| F10 | Post to X | Prefilled tweet via web intent URL | Direct distribution | P0 |
| F11 | Permalinks | State encoded in URL; card regenerates deterministically | Every share is a landing page | P0 |
| F12 | Native share sheet | Web Share API with the PNG attached, where supported | Best mobile share UX | P0 |
| F13 | Reroll (dice) | New seed, same inputs; anti-repetition memory | Re-roll addiction | P0 |
| F14 | Roast history ("Hall of Flame") | Last 50 cards in localStorage | Retention | P1 |
| F15 | Streaks and badges | Consecutive-day streak, achievements, vibe unlocks | Retention | P1 |
| F16 | Daily Roast | Deterministic film + vibe of the day | Daily return | P1 |
| F17 | Counter-Roast | One-tap opposing review | Reply-thread format | P1 |
| F18 | Roast Battle | Two vibes, one film, split card and challenge link | Multiplayer framing | P1 |
| F19 | Per-film Open Graph images | Pre-generated at build time for the top ~250 films | Rich previews for shared links | P1 |
| F20 | Top Four Intervention | Roast a set of four films as a taste profile | Identity sharing | P2 |
| F21 | Roast Wrapped | Aggregate stats from local history, shareable card | Seasonal spike | P2 |
| F22 | "Because…" field | Optional 60-character reason woven into the roast | Personalisation | P2 |
| F23 | Portrait / story export | 1080×1350 and 1080×1920 export sizes | Instagram and stories | P2 |

### 1.4 Roaster Vibes catalogue

Each vibe has: a display name, a one-line description, an accent colour (for the card and the ambient mesh), a username generator, a rating bias, a grammar pack, and a voice guide.

| ID | Name | Voice in one line | Accent | Rating behaviour | Availability |
|---|---|---|---|---|---|
| `film-student` | Pretentious Film Student | Mise-en-scène, "the framing is doing a lot of work", cites a director nobody asked about | `#C8A96A` | Punishes blockbusters (−1), rewards arthouse | Base |
| `shitposter` | Chaotic Letterboxd-style Shitposter | Lowercase, unhinged, one thought per line, emoji as punctuation | `#FF3D8B` | Bimodal: mostly 0.5 or 5 | Base |
| `mid` | Aggressively Mid | Flatly declares everything "fine", the review equivalent of a shrug | `#9FB3A8` | Locked to 2.5–3.0 | Base |
| `dad` | Dad Who Fell Asleep at 9:40 | Confused, practical, rates the parking | `#5FA8FF` | Random 2.5–4, loves anything with a plot he could follow | Base |
| `stan` | Overly Defensive Stan | Cannot accept any criticism, including from the review itself | `#FF6B4A` | Love: 5. Hate: still 4.5 "but hear me out" | Base |
| `festival-snob` | Festival Circuit Snob | "I saw it at the premiere in a smaller room", ranks by obscurity | `#B48CFF` | Higher for less-known titles | Base |
| `linkedin` | LinkedIn Thought Leader | Reviews the film as a quarterly all-hands; uses "learnings" | `#3DE1FF` | 3–4 always ("solid ROI") | Base |
| `conspiracy` | Conspiracy Theorist | Finds hidden signals in colour grading and runtime | `#A3FF3D` | Erratic, ends on a cliffhanger | Base |
| `sports` | Sports Commentator | Play-by-play of the plot; the third act "is a game of two halves" | `#FFD24A` | Neutral, scoreboard framing | Unlock at 5 roasts |
| `victorian` | Victorian Theatre Critic | Ornate, faintly scandalised prose | `#D7A6B5` | Ratings out of five "candles" flavour text | Unlock at 12 roasts |
| `nature` | Nature Documentary Narrator | Observes the audience as a wild species | `#7BDCB5` | Neutral, observational | Unlock at 25 roasts |

Vibe copy standards: every vibe pack must pass the checks in 3.13 (length, placeholders, banned terms) and a human read for voice consistency.

### 1.5 Heat levels

| Level | Name | Effect on text | Effect on rating | Effect on ambient background |
|---|---|---|---|---|
| 0 | Lukewarm | Gentle teasing, affectionate | ±0 | Base green mesh |
| 1 | Medium rare | Pointed, specific | −0.5 (hate) / ±0 (love) | Faint ember glow |
| 2 | Well done | Sharp, brutal specifics | −1 (hate) / +0.5 (love, more gushing) | Ember glow, faster drift |
| 3 | Scorched earth | Maximum theatrics, still film-directed | −1.5 (hate) / +0.5 (love) | Ember and red bloom, grain intensifies |

### 1.6 Content safety rules (non-negotiable)

1. **Roast the film and the taste, never people.** No jokes at the expense of real individuals' bodies, identities, health, or private lives. Cast and director names may appear only as neutral credits, never as targets.
2. **No protected-class humour** in any grammar, hook, or gold line.
3. **Family-safe by default.** An optional "Unfiltered" toggle allows mild profanity in a few vibes only. A hard blocklist (slurs, threats, sexual content) applies to all output and to user input regardless of toggle.
4. **Original text only.** No reproduced dialogue, lyrics, or quoted reviews. Reference plot points and setpieces in paraphrase.
5. **No trademarks in the UI.** The card mimics the *format* of social film platforms (avatar, stars, watched line, likes), not any specific platform's logo, colours, or naming.
6. **User input is data.** Title text is never interpreted, only rendered as escaped text and hashed.

---

## 2. Creative Direction

### 2.1 Design thesis and guardrails

The setting is a cinema after dark: a projector beam through haze, film grain, the leader countdown. The interface is a glass lens in front of that scene.

**Spend the boldness in two places only:** the Review Card and the projector countdown. Everything else is quiet, disciplined glass.

Guardrails to avoid a templated look:

- No tracked-out all-caps eyebrow labels above headings. Use sentence case throughout.
- No headline where a single word is recoloured or italicised for emphasis.
- No numbered markers unless the content is truly a sequence (the countdown is one; the feature list is not).
- No identical rounded card repeated as the layout unit. Vary radius and elevation by role (see 2.4).
- No entrance fade-and-slide on every section. Motion is reserved for user actions and the single result reveal.
- The neon green and glassmorphism direction is a deliberate brief requirement; the differentiation comes from cinema vernacular (leader countdown, sprocket edge, grain, projector flicker) and from the vibe-coloured cards.

### 2.2 Colour system

All hex values are design tokens to be declared once in the Tailwind v4 `@theme` block. Contrast ratios below are estimates from the luminance formula and **must be verified with tooling (axe plus a scripted check against the brightest point of the mesh)**.

**Base (obsidian and charcoal)**

| Token | Hex | Use |
|---|---|---|
| `obsidian-950` | `#050706` | Page floor |
| `obsidian-900` | `#0A0D0E` | Deep panels, export card base |
| `charcoal-800` | `#12171A` | Raised surfaces, input wells |
| `charcoal-700` | `#1A2125` | Hover wells, dividers |

**Neon and cinematic accents**

| Token | Hex | Use |
|---|---|---|
| `reel-green` | `#2BFF88` | Primary accent, focus, primary button fill |
| `projector-green` | `#0FA968` | Button gradient end, pressed states |
| `signal-teal` | `#0F6B5A` | Mesh body colour |
| `nitrate-violet` | `#6A3DFF` | Low-opacity mesh depth (max 12% alpha) |
| `tungsten-amber` | `#FFC857` | Stars, rating text |
| `ember` | `#FF7A2F` | Heat glow, level 1–2 |
| `scorch` | `#FF4A3D` | Heat level 3, destructive states |

**Ink (text)**

| Token | Hex | Approx. contrast on `obsidian-900` | Use |
|---|---|---|---|
| `ink-50` | `#F4F7F5` | ~18:1 | Headlines, roast body |
| `ink-300` | `#B9C4BE` | ~10:1 | Secondary text |
| `ink-500` | `#8E9A94` | ~6:1 (≥ 5:1 over glass) | Captions, timestamps (minimum allowed for small text) |
| `on-green` | `#03140A` | ~14:1 on `reel-green` | Text on primary button |

**Glass**

| Token | Value | Use |
|---|---|---|
| `glass-fill` | `rgba(255,255,255,0.06)` | Panel base |
| `glass-fill-hover` | `rgba(255,255,255,0.09)` | Hover and active |
| `glass-border` | `rgba(255,255,255,0.12)` | 1px outline |
| `glass-highlight` | `rgba(255,255,255,0.22)` | Top-edge inner light |
| `glass-shadow` | `0 24px 60px -24px rgba(0,0,0,0.65)` | Elevation |

**Focus ring:** 2px `#7CFFB5` with 2px offset in `obsidian-950`, visible on every interactive element.

Per-vibe accent colours are listed in 1.4. On the card, the accent is used for the username, the tag chips, the left sprocket strip, and a soft radial tint behind the roast text (max 14% alpha).

### 2.3 Typography

Two families, clearly distinct, both self-hosted at build time through `next/font` (no runtime font requests).

- **Bricolage Grotesque** (variable, uses the width and optical-size axes): headings, UI, buttons, numerals. Tight, characterful, a little theatrical at display sizes. Headings use a narrower width; UI uses the default.
- **Newsreader** (variable serif): the roast text on the card and the pull-quote in the hero. It gives the review a literary, critic-column feel against the modern UI. Slightly more line-height than the sans.

Scale (mobile → desktop, fluid via `clamp`): display 40→72, h2 24→32, body 16→18, roast text 19→22, caption 13→14. Line length under 70 characters for roast text. Counters use tabular numerals. Give every font a real fallback stack so layout does not shift (`next/font` handles size-adjust).

### 2.4 The glass system

Three surface roles, each with a different radius and depth so the screen does not read as a grid of identical cards.

| Role | Radius | Blur | Fill | Where |
|---|---|---|---|---|
| **Panel** (`glass-panel`) | 28px | 16px | `glass-fill` | Hero input, history drawer |
| **Chip** (`glass-chip`) | 999px | 8px (or none) | `glass-fill` | Vibe chips, genre chips, toggles |
| **Lens** (`glass-lens`) | 20px asymmetric (large top-left) | 14px | Vibe-tinted gradient | The Review Card only |

Base recipe:

```css
.glass-panel {
  background: linear-gradient(135deg, rgba(255,255,255,.09), rgba(255,255,255,.03));
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.22),   /* light catching the top edge */
    0 24px 60px -24px rgba(0,0,0,.65);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel { background: rgba(18,23,26,.92); }
}
```

Depth and performance rules:

1. **Blur budget: at most three `backdrop-filter` layers visible at once** (hero panel, vibe strip, card). Drawers and modals replace, not stack.
2. On viewports under 640px or when `prefers-reduced-transparency` is set, blur drops to 8px or is replaced with a solid fill.
3. The **specular highlight** is a radial gradient overlay driven by CSS variables `--mx` and `--my`, updated in a `requestAnimationFrame` loop on pointer move. It never triggers React re-renders.
4. A static **grain overlay** (inline SVG `feTurbulence` as a data URI, 4–6% opacity, not animated) sits above the mesh to kill banding and add film texture.

### 2.5 Ambient background

Three layers, all cheap because only `transform` and `opacity` animate:

1. **Floor:** flat `obsidian-950`.
2. **Mesh:** three large radial gradients (green `#2BFF88` at ~20% alpha, teal `#0F6B5A` at ~35%, violet `#6A3DFF` at ~10%), each in its own absolutely positioned element roughly 60–80vmax across. Each drifts on a 45–70s CSS keyframe loop using `translate3d` and `scale`. No `filter: blur()` on the blobs; the softness is baked into the gradient stops.
3. **Reactive glow:** a fourth blob in `ember`. Its opacity is bound to `--heat` (0 to 1, transitions over 600ms) so the whole room warms up as the user raises Heat. When a vibe is selected, the green blob cross-fades toward the vibe accent over 600ms.

Behaviour: animation pauses when the tab is hidden (`visibilitychange`), is off entirely under `prefers-reduced-motion` (a static composition is shown), and uses `contain: paint` on the layer wrapper.

### 2.6 Motion choreography

Library: Framer Motion via `LazyMotion` with `domAnimation` (keeps the animation bundle to a few KB; load `domMax` only if drag/layout is truly needed). Package name depends on version at install time (`framer-motion` or the renamed `motion`); pin one. **[VERIFY]**

**Spring tokens**

| Token | Config | Used for |
|---|---|---|
| `snap` | stiffness 520, damping 32, mass 0.8 | Buttons, toggles, chips |
| `soft` | stiffness 260, damping 26 | Card reveal, drawers |
| `float` | stiffness 90, damping 18 | Idle tilt, parallax |

**Micro-interactions**

- **Buttons:** press scales to 0.96 (`snap`); release overshoots to 1.02 and settles. Primary button has a magnetic pull toward the pointer (max 6px, desktop only) and a green under-glow that intensifies on hover.
- **Vibe chips:** hover lifts 2px with a specular sweep; selection expands the chip (`layout` transition) and swaps the ambient accent.
- **Heat dial:** dragging notches with a tiny haptic-style overshoot at each step; the background ember opacity follows live.
- **Dice (reroll):** the die tumbles with a random 3D rotation, lands on a face, and the card content cross-fades under it.

**The Screening (loading sequence)**

Total 1.6s on first roast of a session, 1.0s afterwards, 0.3s fade under reduced motion. A visible "Skip" control is always available and remembered.

| Time | Event |
|---|---|
| 0ms | Generate button press (`snap`); glow burst ring expands and fades |
| 0–200ms | Hero panel blur 16→22px and dims to 70%; panel drifts down 8px |
| 200–1300ms | Film reel (SVG, six holes) spins 0→720° with ease-in-out; sprocket strips scroll along the panel edges |
| 250 / 650 / 1050ms | Countdown numerals 3, 2, 1 in the leader style: each punches in from scale 1.4 to 1.0, with a 60ms grain flash; a thin circle sweeps around each numeral like the classic leader wipe |
| 1300ms | Cut: an 80ms 8%-white flash |
| 1300–1600ms | Review Card enters from y 40, rotateX 12°→0, scale 0.96→1 (`soft`) |
| 1600ms+ | Stagger: avatar and username → stars fill one by one (60ms apart, spring-pop; the half star last) → roast text reveals word by word (18ms per word, capped at 900ms) → like counter counts up → action bar appears |

The actual roast is computed in under 5ms during the first frames, so the sequence is theatre by design, not latency. On slower devices the sequence still completes on schedule.

**Idle life:** the card tilts toward the pointer (max 6°, `float` spring, desktop with fine pointer only). No gyroscope tilt on mobile. A faint projector flicker (2% opacity oscillation, 5s period) runs on the mesh only while the card is on screen.

**Reduced motion:** all springs become 150ms opacity fades; mesh is static; no tilt; the countdown is replaced by a single "Roasting…" state; stars appear without fill animation.

### 2.7 Review Card anatomy

```
┌──────────────────────────────────────────────────────┐
│▌ (accent sprocket strip)                             │
│▌  ◉ avatar   mise_en_scene_maxxing         Rewatch   │
│▌             Watched 3h ago                          │
│▌                                                     │
│▌  ┌────────┐  INCEPTION  2010                        │
│▌  │ poster │  ★★★★☆½   (rating text: 4.5)            │
│▌  │ tile   │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │
│▌  └────────┘                                         │
│▌  "The roast text sits here in Newsreader, two to    │
│▌   four sentences, one killer closing line."         │
│▌                                                     │
│▌  #framing  #aspect-ratio-discourse                  │
│▌                                                     │
│▌  ♥ 4,218      💬 87        roastreel.app · 🔥🔥     │
└──────────────────────────────────────────────────────┘
```

Card rules:

- **Poster tile is procedural, not a real poster.** It is generated from a hash of the title: a gradient, a geometric motif, and the title's initials in Bricolage. This avoids copyright issues, external image requests, and CORS trouble in export.
- **Username** is generated per vibe from syllable lists (see 3.4) and is deterministic for a given seed.
- **Avatar** is a deterministic SVG gradient orb with a simple facial silhouette choice; no external assets.
- **Timestamp** is a relative label ("Watched 3h ago", "Watched yesterday", "Rewatched Tuesday") derived from the seed, not from the real clock, so permalinks stay stable.
- **Likes and comments** are seeded fake counters (log-normal distribution) that count up on reveal. A small "fictional numbers" note lives in the about page, not on the card.
- **Card copy length:** tweet mode ≤ 240 characters; full mode ≤ 560.

### 2.8 Layout

Mobile first (single column), then two columns from 1024px.

```
MOBILE (idle)                  MOBILE (result)
┌────────────────┐             ┌────────────────┐
│ logo  🔥3  ☰   │             │ ‹ Inception ✎  │  ← input collapses to a chip
│                │             │ ┌────────────┐ │
│ Name a movie.  │             │ │ REVIEW     │ │
│ Get roasted.   │             │ │ CARD       │ │
│                │             │ └────────────┘ │
│ [ title input ]│             │ 🎲  ⤓  𝕏  🔗   │
│ (love)|(hate)  │             │ Counter-roast  │
│ vibe carousel  │             │ vibe / heat    │  ← compact re-roast controls
│ heat ─●────    │             └────────────────┘
│ [  Roast it  ] │
└────────────────┘

DESKTOP (result)
┌───────────────────────────────────────────────────────────┐
│ logo                                        🔥 streak  ☰  │
│ ┌─────────────────────┐    ┌──────────────────────────┐   │
│ │ glass panel         │    │                          │   │
│ │ title / sentiment   │    │      REVIEW CARD         │   │
│ │ vibe carousel       │    │   (tilts with pointer)   │   │
│ │ heat dial           │    │                          │   │
│ │ [ Roast it ]        │    └──────────────────────────┘   │
│ └─────────────────────┘     🎲   ⤓   𝕏   🔗   ⚔ Battle    │
└───────────────────────────────────────────────────────────┘
```

Hero: instead of a stat block, the hero shows a slowly cycling **ghost card** (three pre-baked sample roasts, low opacity) behind the input, so the first thing a visitor sees is the product's output. Alignment is left-aligned on desktop; the mobile hero is left-aligned too, with the card centred once generated.

### 2.9 Accessibility (WCAG 2.2 AA target)

- Contrast: all text ≥ 4.5:1 (large text ≥ 3:1) measured over the brightest part of the mesh behind the glass; automated check in CI plus manual spot checks.
- Full keyboard operation. The vibe selector is a `radiogroup` with roving `tabindex` and arrow-key navigation. The heat dial is a `slider` with `aria-valuetext` naming the level.
- The rating exposes text: "Rated four and a half out of five stars". Stars are decorative.
- The roast result is announced through an `aria-live="polite"` region; the loading sequence sets `aria-busy` and never traps focus.
- Touch targets ≥ 44×44px. Focus ring on everything. Colour is never the only carrier of meaning (heat level always has a name and icon).
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more` (raises fills to near-opaque and border alpha to 0.4).
- Downloaded PNGs include no alt requirement, but the share text always contains the full roast so it is accessible on the destination platform.

### 2.10 Microcopy voice

Plain verbs, sentence case, active voice. Actions keep one name across the flow.

| Element | Copy |
|---|---|
| Primary button | Roast it |
| Reroll | Roast again |
| Save | Save image |
| Share | Post to X |
| Link | Copy link |
| Input placeholder | A movie you love or hate |
| Unknown title note | We haven't seen that one. Pick a genre for a sharper roast. |
| Export failure | Couldn't build the image. Copy the link instead. |
| Copied | Link copied |
| Empty history | No roasts yet. Name a movie to start. |

Errors state what happened and what to do next, with no apology.

---

## 3. Architecture & Data Flow

### 3.1 Principles

1. **Zero backend, zero runtime API.** No route handlers at runtime, no serverless functions, no external fetches except same-origin static JSON.
2. **Deterministic by construction.** Same inputs produce the same card. This is what makes permalinks work without storage.
3. **Static everything.** `next build` with `output: 'export'` produces plain files served from a CDN.
4. **Compute is trivial; theatre is intentional.** Generation takes single-digit milliseconds. The Screening exists for emotion, not latency, and is skippable.
5. **Append-only content.** Content packs never reorder or delete entries, so old permalinks keep resolving to the same text.

### 3.2 System overview

```
                        BUILD TIME (CI / local)
 ┌────────────────┐   ┌───────────────────┐   ┌──────────────────────────┐
 │ /content/*.yaml│──▶│ build-content.ts  │──▶│ /public/data/            │
 │ films, vibes,  │   │ validate (zod),   │   │  index.{hash}.json (~30KB)│
 │ grammars       │   │ lint, hash, split │   │  movies/{id}.{hash}.json │
 └────────────────┘   └───────────────────┘   │  vibes/{vibe}.{hash}.json│
                                              │  manifest.json           │
 ┌────────────────┐   ┌───────────────────┐   └──────────────────────────┘
 │ og-generate.ts │──▶│ satori + resvg    │──▶ /public/og/{id}.png
 └────────────────┘   └───────────────────┘
                              │ next build (output: 'export') ──▶ /out  (HTML/JS/CSS/JSON/PNG)
                              ▼
                     Vercel CDN (static, global edge)

                        RUNTIME (browser only)
 user input ─▶ normalize ─▶ resolve ──┬─▶ curated path: fetch movie pack (cached) ─┐
                                      └─▶ fallback path: title features + genre  ──┤
                                                                                   ▼
                               seed (hash of inputs + salt) ─▶ PRNG ─▶ compose text
                                                                       ─▶ rate ─▶ name ─▶ timestamp
                                                                                   ▼
                                                              ReviewModel ─▶ render ─▶ persist / share
```

### 3.3 Data assets and schemas

Authoring is in YAML or JSON under `/content`; the build script validates, minifies, content-hashes filenames, and writes a `manifest.json` mapping logical names to hashed URLs.

**Search index (`index.{hash}.json`, target ≤ 30 KB gzipped for ~300 films)**

```ts
type GenreId =
  | 'action' | 'animation' | 'comedy' | 'drama' | 'fantasy' | 'horror'
  | 'romance' | 'scifi' | 'superhero' | 'thriller' | 'arthouse' | 'documentary';

interface MovieIndexEntry {
  id: string;          // immutable slug, e.g. "inception-2010"
  t: string;           // display title
  y: number;           // year
  a?: string[];        // aliases and common misspellings ("lotr", "dark knight")
  g: GenreId[];        // genres (max 2)
  p: number;           // popularity weight 1-100, used to rank suggestions
}
```

**Movie pack (`movies/{id}.{hash}.json`, ~3–8 KB each, fetched lazily and cached)**

```ts
type VibeId = 'film-student' | 'shitposter' | 'mid' | 'dad' | 'stan'
  | 'festival-snob' | 'linkedin' | 'conspiracy' | 'sports' | 'victorian' | 'nature';
type Sentiment = 'love' | 'hate';
type Heat = 0 | 1 | 2 | 3;

interface MoviePack {
  id: string;
  title: string;
  year: number;
  director: string;                 // neutral credit only
  leads: string[];                  // neutral credits only
  runtimeMin: number;
  genres: GenreId[];
  consensus: 'acclaimed' | 'divisive' | 'panned' | 'cult' | 'blockbuster';
  hooks: {
    setpieces: string[];            // "the rotating hallway fight"
    tropes: string[];               // "a twist explained twice"
    memes: string[];                // widely known discourse, paraphrased
    runtimeJoke?: string;
    titleJoke?: string;
  };
  gold: Array<{                     // hand-written, best-quality lines
    v: VibeId;
    s: Sentiment | 'any';
    h?: Heat[];                     // if omitted, valid at any heat
    text: string;                   // may contain #slots#
  }>;
}
```

**Grammar pack (`vibes/{vibe}.{hash}.json`, shared by curated and fallback paths)**

```ts
interface VibePack {
  id: VibeId;
  name: string;
  accent: string;
  username: { prefixes: string[]; cores: string[]; suffixes: string[]; casing: 'snake' | 'camel' | 'lower' | 'title' };
  tags: string[];                   // hashtag pool for the card
  ratingModel: RatingModel;         // see 3.6
  rules: Record<string, Rule[]>;    // grammar rules, keyed by symbol name
}

interface Rule {
  t: string;                        // template text with #symbol# and #symbol.modifier# references
  w?: number;                       // weight, default 1
  s?: Sentiment;                    // restrict to sentiment
  h?: Heat[];                       // restrict to heat levels
  g?: GenreId[];                    // restrict to genres
  when?: TitleFeaturePredicate;     // e.g. { colon: true } or { sequel: true }
}
```

Illustrative rule set (not final copy):

```json
{
  "origin": [{ "t": "#opener# #body# #body# #kicker#" }],
  "opener": [
    { "t": "I watched #titleShort# twice, once to be fair and once to be sure.", "s": "hate", "h": [2,3] },
    { "t": "#titleShort# has the confidence of a film that believes silence is a personality.", "s": "hate" },
    { "t": "There is a shot in #titleShort# I have thought about every day since.", "s": "love" }
  ],
  "body": [
    { "t": "The framing is doing the work the script forgot to.", "g": ["drama","arthouse"] },
    { "t": "A title with a colon and a subtitle: the sound of a film hedging.", "when": { "colon": true } },
    { "t": "#hook.setpiece.cap# is the only scene that earns its runtime.", "s": "hate" }
  ],
  "kicker": [
    { "t": "Two stars, and one of them is for the popcorn.", "s": "hate", "h": [1,2] }
  ]
}
```

Slots resolve from three sources: user/title features, the movie pack (`#hook.setpiece#`, `#director#`), and other grammar symbols. Modifiers: `.cap`, `.lower`, `.quote`, `.a` (article agreement). Every rule that references a `#hook.*#` slot is only eligible when a movie pack supplies it, so the same grammar serves both paths.

**Minimum content quality bar (per vibe, per sentiment)**

- ≥ 8 openers, ≥ 14 body beats (at least 4 genre-neutral), ≥ 8 kickers, spread across heat tiers.
- This yields several thousand distinct combinations per vibe/sentiment before hook substitution multiplies it.
- Launch curated set: **120 films** with hooks and at least one gold line for each of the 8 base vibes on the 40 highest-traffic titles. Growth target: 300 films.

**Launch payload estimate (verify at build):** index ~30 KB, each vibe pack ~15–25 KB (fetched only when first selected, or prefetched on idle for the first two visible vibes), each movie pack ~5 KB.

### 3.4 Engine pipeline

Everything below lives in `lib/engine` as pure, framework-free TypeScript with no `window` access, so it is unit-testable in Node.

1. **Normalize.** Trim, NFKC-normalize, collapse whitespace, lowercase for matching, strip leading "the/a/an" for index lookup only, cap length at 80 characters, reject if empty after normalization.
2. **Resolve.**
   - Exact: `Map<normalizedTitleOrAlias, id>` built once from the index. O(1).
   - Fuzzy: trigram overlap plus bounded Levenshtein (≤ 2 edits for strings ≥ 5 characters) against titles and aliases; accept the best match only above a threshold, and show it as a suggestion ("Did you mean Inception?"), never silently substitute.
   - Otherwise: unmapped, use the fallback path.
3. **Load context.** Curated path: fetch `movies/{id}` (cache-first; the manifest gives the hashed URL). Fallback path: extract title features (below) and use the optional genre chip.
4. **Seed.** `seed = xmur3(normalizedTitle + '|' + vibe + '|' + heat + '|' + sentiment + '|' + k)`, feeding `mulberry32`. `k` is the reroll counter (base36 in the URL). One PRNG instance is threaded through every random choice, in a fixed order, so results are reproducible.
5. **Compose text.** Expand `origin` recursively, filtering rules by sentiment, heat, genre, and predicates, choosing by weight. Apply the anti-repetition memory (below). Curated path: with probability 0.55 (deterministic from the PRNG) replace the body with a matching gold line, otherwise weave hook slots into grammar rules.
6. **Rate.** See 3.6.
7. **Name.** Compose username from the vibe's prefix/core/suffix lists and the PRNG; derive a handle, avatar seed, and a "Rewatch" flag (12% probability).
8. **Timestamp and counters.** Seeded relative time label; likes and comments from a log-normal draw scaled by vibe and heat.
9. **Validate.** Enforce length limits (retry up to 5 times with the next PRNG draw, then truncate at a sentence boundary), assert no `#` remains, run the blocklist. If validation fails five times, fall back to a hard-coded safe roast for that vibe (the engine never throws to the UI).
10. **Emit `ReviewModel`.**

```ts
interface ReviewModel {
  v: 1;                              // model version
  movie: { id?: string; title: string; year?: number; genre?: GenreId };
  source: 'curated' | 'procedural';
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  rating: number;                    // 0.5 to 5 in 0.5 steps
  username: string;
  avatarSeed: number;
  watchedLabel: string;
  rewatch: boolean;
  body: string;                      // full mode
  tweet: string;                     // <= 240 chars
  tags: string[];
  likes: number;
  comments: number;
  k: string;                         // reroll counter, base36
}
```

**Anti-repetition memory.** A ring buffer of the last ~20 chosen rule IDs per vibe is kept in localStorage; rules in the buffer get their weight multiplied by 0.15 during selection. This is applied *after* the seed step but stored per session, so it can make a reroll differ from an earlier one without breaking determinism of a given permalink (permalinks regenerate with an empty buffer plus the stored `k`).

### 3.5 Fallback engine (unmapped titles)

With nothing but a title string, the engine still needs to feel specific. It does this from three signals:

**Title features** (all computed locally):

| Feature | Detection | Example use in a rule |
|---|---|---|
| `colon` | title contains `:` or ` - ` | "A subtitle: the sound of a film hedging." |
| `sequel` | trailing numeral, "Part II", "Returns", "Reloaded" | "By instalment #n#, the franchise is a subscription." |
| `oneWord` | single token | "One word, like it was afraid to commit to a second." |
| `long` | > 5 tokens | "A title this long is a plot summary in disguise." |
| `question` / `exclaim` | punctuation | "The exclamation mark is the loudest part." |
| `possessive` | `'s` | "A possessive title: ownership is the only clear plot." |
| `startsThe` | leading "The" | "'The' is carrying a lot of weight here." |
| `hasYear` | four-digit year in title | "Dating itself in the title is a brave choice." |
| `titleShort` | text before the colon | Used to avoid repeating long titles in the body |

**Optional genre chip.** If the user selects a genre, genre-tagged beats become eligible. If not, the engine uses genre-neutral beats plus an inferred genre from a small keyword table (e.g. "love", "wedding" → romance; "night", "dead", "curse" → horror; "galaxy", "planet" → scifi). Inference is only ever used to *select* beats, never displayed as fact.

**Sentiment and heat** shape the register regardless of film knowledge. Because the fallback beats are written about *the experience of watching a film of that type* (pacing, third acts, trailers, sequels, runtime), they remain funny without film-specific facts.

Expected quality gap: curated output is noticeably sharper. The UI leans into this honestly: unknown titles get the genre chip prompt, and popular titles show a small "Sharper roast available" state only in internal analytics, not in the UI.

### 3.6 Rating model

Ratings are drawn per vibe from a truncated distribution, then snapped to half-star steps.

```
base = sentiment == love ? N(4.2, 0.5) : N(1.6, 0.6)
base += heat_shift[sentiment][heat]          # table in 1.5
base += vibe.bias(movie.consensus, sentiment)   # e.g. film-student: blockbuster -1
if vibe.override: apply (mid: clamp 2.5-3.0; shitposter: pick 0.5 or 5 with 80% prob; stan: >= 4.5)
rating = clamp(round(base * 2) / 2, 0.5, 5)
```

`N(mean, sd)` uses a Box–Muller draw from the same seeded PRNG. All parameters live in each vibe pack's `ratingModel` so tuning never requires code changes.

### 3.7 Determinism and permalinks

The URL is the state. Static export means the share page is a single client-hydrated route reading query parameters (wrapped in `Suspense`, as `useSearchParams` requires under static export).

```
/r?m=inception-2010&v=film-student&h=2&s=hate&k=3fz            # curated film
/r?t=The%20Last%20Lighthouse%20Keeper&g=drama&v=mid&h=1&s=love&k=0   # unmapped
/battle?m=inception-2010&a=film-student&b=shitposter&h=2&k=0
/daily                                                         # derives m, v, h from UTC date
```

Rules:

- The card is always regenerated from these parameters; nothing is read from localStorage to render a shared link.
- Content is append-only and IDs are immutable, so the same URL keeps producing the same review after content updates. Changing the *composition algorithm* bumps `ReviewModel.v` and the URL gains `d=2`; old links continue to be served by the frozen v1 code path until deliberately retired.
- Unknown or malformed parameters fall back to the home screen with the input prefilled; the app never shows a blank state.
- For the top ~250 films, `/r/[movie]/` static pages exist at build time (`generateStaticParams`) so those URLs carry proper Open Graph metadata (see 3.9).

**Daily Roast:** `dayKey = new Date().toISOString().slice(0,10)` (UTC). `film = pool[hash(dayKey) % pool.length]`, `vibe = vibes[hash(dayKey + 'v') % baseVibes.length]`, `heat = 1 + hash(dayKey + 'h') % 3`. Every visitor sees the same daily card with no server. The pool is a curated list of ~120 "discussable" films; it repeats after the pool length, which is fine.

### 3.8 State management and persistence

- **In-memory:** a small Zustand store (or React context plus reducer) holds `draft` (title, sentiment, genre, vibe, heat), `phase` (`idle | screening | revealed`), and `review`. Zustand is preferred for its ~1 KB size and selector-based renders.
- **URL:** authoritative for the current review (3.7).
- **localStorage** (all keys prefixed `rr:v1:`), every read and write wrapped in try/catch with graceful degradation (private mode, quota, disabled):

| Key | Contents |
|---|---|
| `rr:v1:history` | Last 50 `{url, title, vibe, rating, ts}` |
| `rr:v1:stats` | Counters: roasts total, per vibe, per heat, fallback count, shares |
| `rr:v1:streak` | `{ lastDay (local), count, freezeUsedWeek }` |
| `rr:v1:badges` | Unlocked badge IDs with timestamps |
| `rr:v1:unlocks` | Unlocked vibes |
| `rr:v1:prefs` | Skip screening, Unfiltered toggle, reduced effects, last vibe/heat |
| `rr:v1:recent` | Anti-repetition ring buffers |

No cookies, no fingerprinting, no third-party storage. Analytics (if used) is cookieless and privacy-preserving, so no consent banner is required. **[VERIFY against current legal guidance for target regions.]**

### 3.9 Sharing pipeline

**A. Post to X.** Open a web intent URL in a new window with `noopener`:

```
https://twitter.com/intent/tweet?text=<encoded>&url=<encoded permalink>
```

(`x.com/intent/post` is the newer form; use whichever resolves reliably at build time. **[VERIFY]**) Tweet text = rating in star glyphs + title + the `tweet` field (≤ 240 chars), leaving room for the 23-character URL treatment. The permalink carries the full state.

**B. Save as image (html2canvas) with an export twin.**

`html2canvas` re-renders the DOM onto a canvas by itself and does **not** reliably support `backdrop-filter`, some CSS filters, blend modes, or `background-clip: text`. Exporting the live glass card directly would produce a flat or broken image. The blueprint therefore requires:

1. An `ExportCard` component: same data, same fonts, same layout as `GlassReviewCard`, but built only from features html2canvas handles: solid and gradient backgrounds, borders, box shadows, inline SVG. The "glass" look is faked with pre-composed layered gradients and a baked mesh crop, and looks near-identical.
2. `ExportCard` is mounted in a hidden portal (`position: fixed; left: -10000px; width: 1080px`) only when the user first taps Save or Share.
3. Export routine: `await document.fonts.ready` → dynamic `import('html2canvas')` (so its weight is only paid on first share) → `html2canvas(node, { scale: 2, backgroundColor: null, logging: false })` → `canvas.toBlob('image/png')`.
4. Sizes: 1200×675 (X default), 1080×1350 (portrait, P2), 1080×1920 (story, P2).
5. All export code sits behind an adapter `exportImage(node, opts): Promise<Blob>`. If html2canvas proves unreliable on a target browser (its upstream release activity has been low **[VERIFY]**), swap in `html-to-image` or `modern-screenshot` without touching UI code.
6. Visual regression tests (Playwright) compare `ExportCard` renders against approved snapshots for each vibe.

**C. Native share sheet.** If `navigator.canShare({ files: [file] })` is true, call `navigator.share({ files, text, url })`. Otherwise fall back to download plus copy-link.

**D. Link previews (Open Graph).** A static site cannot generate an image per arbitrary permalink at request time. The plan:

- A prebuild script (`satori` + `resvg`, both run in Node at build time) renders `/public/og/{movieId}.png` (1200×630) for the top ~250 films using a generic "roast this film" design, not a specific review.
- `/r/[movie]/` static pages set `og:image` to that file. Arbitrary unmapped titles get a generic branded OG image.
- Users who want the exact card in the feed attach the PNG (that is what Save/Share provides).
- Optional spike in Phase 0: whether an `ImageResponse` route with `dynamic = 'force-static'` prerenders correctly under `output: 'export'`. If yes it can replace the prebuild script. **[VERIFY]**

### 3.10 Gamification logic

- **Streak:** increments when at least one roast is generated on a new local calendar day; resets after a missed day, with one automatic "freeze" per week. Streak chip in the top bar.
- **Vibe unlocks:** Sports (5 roasts), Victorian (12), Nature (25). Locked vibes are visible with a lock and the number remaining, not hidden.
- **Badges (launch set):**

| Badge | Condition |
|---|---|
| First blood | First roast |
| Scorched earth | Five heat-3 roasts |
| Full spectrum | Used every base vibe |
| Mid enjoyer | Ten Aggressively Mid roasts |
| Night owl | A roast between 02:00 and 04:00 local |
| Unmapped territory | Ten fallback-engine roasts |
| Sharer | First share or save |
| Battle ready | First Roast Battle created |
| Daily devotee | Seven Daily Roasts |

- **Roast Battle:** same film, vibes A and B, rendered as a split card (`BattleCard`). The challenge link opens the battle page with a "Which one is right?" vote (local only; no tallies). Viral through framing, not through data.
- **Counter-Roast:** flips sentiment, picks an opposing vibe from a fixed opposition map (film-student ↔ shitposter, dad ↔ festival-snob, stan ↔ mid, linkedin ↔ conspiracy).
- **Top Four Intervention (P2):** four title inputs; per title the engine yields tags (genre, decade, consensus, franchise-ness); a taste grammar composes a roast of the set ("Four films, three sequels, and a single subtitle-less loner"). Works fully in fallback mode.
- **Roast Wrapped (P2):** aggregate from `rr:v1:stats` and history; card shows top vibe, average rating, hottest take, streak.

### 3.11 Performance budget (release gates)

| Metric | Target |
|---|---|
| First-load JS (gzip), home route | ≤ 110 KB |
| html2canvas | Lazy, not in first load |
| LCP (mid-tier Android, 4G) | ≤ 1.5s |
| CLS | 0 |
| INP | ≤ 100ms |
| Engine run (p95, mid-tier phone) | ≤ 10ms |
| Total blocking time | ≤ 150ms |
| Sustained frame rate during the Screening | 60fps on mid-tier phones; degrade blur/tilt if frames drop |

Techniques: React Server Components for the static shell with small client islands; `LazyMotion`; fonts subsetted and preloaded; data prefetched on `requestIdleCallback`; no images except inline SVG; `content-visibility: auto` on the history drawer; blur and tilt disabled on low-end devices detected via `navigator.hardwareConcurrency <= 4` combined with an in-app frame-time probe.

### 3.12 Security and privacy

- Strict CSP delivered via headers (see 5.3): `default-src 'self'`; scripts from self only; no third-party origins other than what is deliberately added (analytics if used).
- All user text is rendered through React (escaped) and is never used with `dangerouslySetInnerHTML`, `eval`, or dynamic imports.
- Title input capped and sanitised before hashing; profanity/blocklist on input to avoid shareable abuse on branded cards.
- No PII collected; nothing leaves the device except normal static asset requests.
- `rel="noopener noreferrer"` on all external opens.

### 3.13 Testing and quality gates

| Layer | Tooling | What it enforces |
|---|---|---|
| Unit | Vitest | Determinism (same input → identical output across 1,000 runs), rating bounds, PRNG distribution, title feature extraction, fuzzy match precision |
| Content lint | Custom script in CI | Unresolved `#slots#`, rules with impossible predicates, banned terms, per-rule length caps, pack minimum sizes, duplicate rules, immutable-ID and append-only check against the previous release manifest |
| Fuzz | Vitest | 10,000 random and hostile titles (emoji, RTL, 5,000 characters, HTML, empty) never throw, always yield valid `ReviewModel` within length limits |
| Component | Testing Library | Vibe selector keyboard behaviour, heat dial semantics, rating text alternative |
| E2E | Playwright | Full flow on Chromium, WebKit, Firefox; mobile viewports; permalink round trip; export produces a non-empty PNG of the expected size |
| Visual | Playwright snapshots | ExportCard per vibe; hero; card at each heat |
| Accessibility | axe-core in Playwright + scripted contrast check | Zero serious violations; contrast at mesh peaks |
| Performance | Lighthouse CI + bundle-size budget | Gates in 3.11 |

---

## 4. Component Tree

### 4.1 Hierarchy

```
app/layout.tsx  (RootLayout)                      [server]
├── <AmbientBackdrop />                           [client, memo]  mesh blobs, grain, heat/vibe CSS vars
│   ├── <MeshLayer />
│   └── <GrainOverlay />
├── <MotionProvider />                            [client]  LazyMotion + reduced-motion config
├── <AppShell />                                  [server]
│   ├── <TopBar />                                [client]
│   │   ├── <Logo />
│   │   ├── <StreakChip />
│   │   └── <MenuButton />  → <HistoryDrawer />
│   └── {children}
└── <ToastRegion />                               [client]  aria-live; badge and copy toasts

app/page.tsx  (HomePage)                          [server shell]
└── <RoastStudio />                               [client]  owns store, phase machine
    ├── <ControlPanel />                          glass-panel
    │   ├── <HeroSearch />
    │   │   ├── <TitleInput />
    │   │   ├── <SuggestionList />
    │   │   ├── <DidYouMean />
    │   │   └── <GenreChips />                    shown for unmapped titles
    │   ├── <SentimentToggle />                   love / hate
    │   ├── <VibeSlider />
    │   │   ├── <VibeChip />  ×N
    │   │   └── <LockedVibeChip />
    │   ├── <HeatDial />
    │   └── <GenerateButton />
    ├── <GhostCardShowcase />                     idle only; three sample cards cycling
    ├── <ProjectorSequence />                     screening overlay
    │   ├── <FilmReel />
    │   ├── <LeaderCountdown />
    │   └── <FlashCut />
    └── <ResultStage />                           revealed phase
        ├── <GlassReviewCard />
        │   ├── <CardHeader />                    <Avatar/>, <Username/>, <WatchedLine/>, <RewatchTag/>
        │   ├── <PosterTile />                    procedural SVG poster
        │   ├── <MovieMeta />                     title, year
        │   ├── <StarRating />                    <Star/> ×5 with half-star support
        │   ├── <RoastBody />                     word-stagger reveal
        │   ├── <TagRow />
        │   └── <CardFooter />                    <LikeCounter/>, <CommentCounter/>, <HeatFlames/>, wordmark
        ├── <ActionBar />
        │   ├── <DiceButton />                    reroll
        │   ├── <SaveImageButton />
        │   ├── <ShareToXButton />
        │   ├── <NativeShareButton />             hidden when unsupported
        │   ├── <CopyLinkButton />
        │   ├── <CounterRoastButton />
        │   └── <BattleButton />
        ├── <QuickReRoastControls />              compact vibe/heat editing
        └── <ExportHost />                        portal; mounts <ExportCard /> on demand

app/r/page.tsx        → <SharedRoastView /> (Suspense)   wraps ResultStage + "Roast your own" CTA
app/r/[movie]/page.tsx → static, OG metadata, same view
app/battle/page.tsx   → <BattleView /> → <BattleCard />, <SideVoteToggle />
app/daily/page.tsx    → <DailyRoastView /> → <DailyBanner />, ResultStage
app/wrapped/page.tsx  → <WrappedView /> → <WrappedCard />              [P2]
app/top-four/page.tsx → <TopFourStudio /> → <TopFourCard />            [P2]
app/about/page.tsx    → about, content policy, fictional-numbers note, credits

Shared overlays
├── <HistoryDrawer />       Hall of Flame list; <HistoryItem/>; clear-all
└── <BadgeToast />
```

### 4.2 Key component contracts

| Component | Props (essentials) | Notes |
|---|---|---|
| `RoastStudio` | none | Owns the phase machine: `idle → screening → revealed`; syncs URL via `history.replaceState` |
| `HeroSearch` | `value, onChange, onResolve(match \| null)` | Debounce 0 (index is local); arrow-key suggestion navigation; `role="combobox"` |
| `VibeSlider` | `value: VibeId, unlocked: VibeId[], onChange` | `radiogroup`, roving tabindex, scroll-snap, shows lock progress |
| `HeatDial` | `value: Heat, onChange` | `slider` role; writes `--heat` CSS variable on `<html>` |
| `GenerateButton` | `disabled, onPress` | Disabled state explains why (title missing) via `aria-describedby` |
| `ProjectorSequence` | `active, onDone, skippable` | Honours reduced motion and the skip preference |
| `GlassReviewCard` | `model: ReviewModel, animate: boolean` | Presentational; no data fetching |
| `ExportCard` | `model, size` | html2canvas-safe twin of the card; never rendered visibly |
| `StarRating` | `value: number, animate: boolean` | Provides text alternative; half-star via clipped SVG |
| `ActionBar` | `model, onReroll, ...` | Buttons disabled while an export is in progress |

### 4.3 Repository layout

```
/app
  layout.tsx, globals.css, page.tsx
  r/page.tsx, r/[movie]/page.tsx, battle/, daily/, wrapped/, top-four/, about/
/components
  backdrop/, studio/, card/, share/, progress/, ui/ (glass primitives)
/lib
  engine/         normalize.ts, resolve.ts, prng.ts, grammar.ts, features.ts, rating.ts, names.ts, compose.ts, index.ts
  data/           loader.ts (manifest-aware fetch + cache), types.ts
  share/          intents.ts, exportImage.ts, webShare.ts
  state/          store.ts, storage.ts (safe localStorage), streaks.ts, badges.ts
  a11y/           announce.ts, contrast.test.ts
/content
  films/*.yaml, vibes/*.yaml, daily-pool.yaml
/scripts
  build-content.ts, lint-content.ts, og-generate.ts
/public
  data/ (generated), og/ (generated), favicon set
/tests
  unit/, e2e/, visual/
next.config.ts, vercel.json, tailwind (via CSS @theme), tsconfig.json, playwright.config.ts, vitest.config.ts
```

Conventions: server components by default; `"use client"` only on interactive islands. Engine code imports nothing from React. Design tokens exist only in `globals.css` `@theme`; components use utilities, never raw hex.

---

## 5. Deployment & Scaling Strategy

### 5.1 Build and hosting configuration

```ts
// next.config.ts (essentials)
const config = {
  output: 'export',          // pure static site in /out
  trailingSlash: true,       // clean static paths on any CDN
  images: { unoptimized: true },   // no image optimiser, no images anyway
  reactStrictMode: true,
};
```

- **Build pipeline:** `build-content` (validate, lint, hash, emit data) → `og-generate` → `next build`. The pipeline fails on any content-lint or budget failure.
- **Deploy target:** Vercel detects the static export and serves `/out` from its CDN. No functions, no edge middleware, no ISR, no image optimisation: nothing that can be invoked, billed, or rate limited.
- **Portability:** because the artefact is plain files, it can move to Cloudflare Pages, Netlify, or S3 plus a CDN with only header configuration changes. This is the escape hatch if hosting terms or bandwidth become a constraint.

### 5.2 Why this is fast

- The HTML shell, JS chunks, and data files are all served from the nearest CDN node. There is no origin round-trip for the roast, because the roast is computed on the device.
- Data files are content-hashed, so they are cached permanently after the first request; a repeat visitor makes zero network requests for content.
- The Screening hides the (already instant) compute and the one small movie-pack fetch, so the app feels both cinematic and immediate.

### 5.3 Caching and headers

`headers()` in `next.config` is not applied under `output: 'export'`, so headers are declared in `vercel.json`:

| Path | Header |
|---|---|
| `/_next/static/*` | `Cache-Control: public, max-age=31536000, immutable` |
| `/data/*` (hashed names) | `Cache-Control: public, max-age=31536000, immutable` |
| `/og/*` | `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` |
| HTML routes | `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` (short edge cache; revalidate on deploy) |
| `/data/manifest.json` and `/` | Short cache so new content versions are picked up promptly |
| All | `Content-Security-Policy` (self only, plus analytics origin if used), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera, microphone, geolocation) |

**[VERIFY]** the exact header semantics and how Vercel's edge cache treats `s-maxage` on static assets when the project is first deployed.

### 5.4 Scaling and cost behaviour

- **Compute cost scales to zero and stays there.** Traffic spikes hit the CDN, not a runtime. There is nothing to autoscale, throttle, or crash.
- **The one real limit is bandwidth.** Estimated first-visit transfer is ~150–250 KB (JS, CSS, fonts, index, one vibe pack, one movie pack) and repeat visits are mostly cache hits. As a rough guide, 100 GB of monthly transfer supports on the order of 400,000–650,000 cold first visits. **[VERIFY current plan limits.]** Keep fonts subsetted and data compact to protect this budget.
- **Plan terms.** Vercel's free tier is intended for personal, non-commercial use. If the project is monetised (ads, sponsorships, affiliate links) or grows past the free limits, move to a paid plan or a host with suitable terms. **[VERIFY current terms before launch.]**
- **Abuse resistance.** With no user-generated content stored or displayed to other users, there is no moderation backlog. The only shareable user text is the film title on a card, which is filtered on input.

### 5.5 Observability

- Optional cookieless analytics (Vercel Web Analytics or a comparable privacy-friendly tool) tracking only aggregate events: `roast_generated` (vibe, heat, source), `share_x`, `save_image`, `copy_link`, `reroll`, `battle_created`, `daily_opened`. No titles or free-text are logged.
- Client error reporting is limited to a small `window.onerror` counter surfaced in analytics; no third-party session replay.
- Core Web Vitals tracked from real users; regressions past the gates in 3.11 block the next release.

---

## 6. Delivery Roadmap

| Phase | Goal | Contents | Exit criteria |
|---|---|---|---|
| **0: Spike** (2–3 days) | Retire technical risk | html2canvas export twin on iOS Safari, Android Chrome, desktop; static-export permalink route with `Suspense`; OG generation via prebuild script (and `ImageResponse` option); blur performance on a low-end Android phone; Vercel header behaviour | Written go/no-go per item; adapter chosen for export |
| **1: Foundation** | Skeleton and tokens | Repo, CI, Tailwind `@theme` tokens, fonts, glass primitives, ambient backdrop, motion provider, lint/test/budget gates | Empty shell passes all gates |
| **2: Engine** | Content and logic | PRNG, normalize/resolve, grammar composer, fallback features, rating model, names, 8 vibe packs, 120 films, content pipeline and lint | Fuzz and determinism tests green; blind read-through of 100 outputs approved |
| **3: Experience (MVP)** | The core loop | RoastStudio, HeroSearch, VibeSlider, HeatDial, ProjectorSequence, GlassReviewCard, StarRating, ActionBar, permalinks, save/share | P0 features complete; accessibility and performance gates pass |
| **4: Launch prep** | Polish | About and policy pages, OG images for top films, analytics events, 404, reduced-motion pass, device matrix testing | Launch checklist (8.3) complete |
| **5: Growth (P1)** | Retention | History, streaks, badges, unlocks, Daily Roast, Counter-Roast, Roast Battle | Streak and daily return tracked |
| **6: Expansion (P2)** | Identity and seasonality | Top Four Intervention, Roast Wrapped, portrait/story export, "Because…" field, additional vibes | Post-launch review |

Content is the long pole. Budget authoring and human review time explicitly; the engine is small, the jokes are the product.

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| html2canvas mishandles glass effects or specific fonts on iOS | High | High (share is the core loop) | Export twin design; adapter pattern; Phase 0 spike; visual regression tests |
| Fallback roasts feel generic | Medium | High | Title-feature conditionals, genre chip prompt, strong genre-neutral "watching experience" beats, weekly review of analytics for the most-requested unmapped titles and promote them to curated |
| Repetitive output after a few rerolls | Medium | Medium | Combinatorial minimums, anti-repetition memory, hook substitution |
| Blur and animation jank on low-end phones | Medium | Medium | Blur budget, frame-time probe, automatic degradation, reduced-effects preference |
| Offensive output or abusive titles on shareable cards | Medium | High | Content rules (1.6), blocklist on input and output, human read of all packs, lint gates |
| Link previews show generic image rather than the exact card | Certain | Medium | Accept by design; per-film OG images; image attach on share; set expectation in the UI copy |
| Old permalinks change after content updates | Low | Medium | Append-only content, immutable IDs, versioned model, CI check against previous manifest |
| Hosting plan limits or terms at scale/monetisation | Medium | Medium | Portable static artefact, bandwidth budget, verify terms early |
| Trademark or copyright complaints (platform mimicry, posters, quotes) | Low | High | Generic card format, procedural posters, original text only, no logos |
| Third-party tool behaviour differs from assumptions in this document | Medium | Low–Medium | Every **[VERIFY]** item is resolved in Phase 0 and this blueprint updated |

---

## 8. Appendices

### 8.1 Sample outputs (to set the quality bar; not final copy)

**Curated: *Inception* (2010), love, Well done**

- *Pretentious Film Student:* "Inception explains its own dream logic so carefully that the dreams stop being dreams and become a deposition. And yet the hallway sequence is the best argument for cinema I've seen all year. 4.5★"
- *Chaotic shitposter:* "men in suits whispering 'kick' for two and a half hours and it STILL made me feel things. the spinning top is my roman empire. 5★"
- *Aggressively Mid:* "It's a good movie. It's a lot of movie. It is, in the end, a movie. 3★"

**Procedural: *The Last Lighthouse Keeper* (unmapped), hate, Medium rare, genre chip = drama**

- *Pretentious Film Student:* "*The Last Lighthouse Keeper* has the confidence of a film that believes silence is a personality. The fog is a metaphor, the metaphor is fog, and the runtime is a coastline. 1.5★"
- *Dad Who Fell Asleep at 9:40:* "Woke up, someone was still staring at the sea. Asked what I missed. Nothing, apparently. Parking was good though. 2★"

### 8.2 Username generator examples

| Vibe | Pattern | Examples |
|---|---|---|
| Film student | `{concept}_{noun}_{suffix}` | `mise_en_scene_maxxing`, `dolly_zoom_daily`, `aspect_ratio_apologist` |
| Shitposter | `{lowercase phrase}{digits}` | `unwell_at_the_cinema`, `gorlock_theatre_99` |
| Dad | `{FirstNameInitial}{Surname}{Digits}` | `DaveM1962`, `RichardBBQ` |
| LinkedIn | `{Title}{Verb}er` | `SynergyScreener`, `ThoughtLeaderAtTheMovies` |

All are fictional and generated from word lists; none resembles a real, identifiable person by design (lint check against a small list of well-known handles).

### 8.3 Launch checklist

- [ ] All Phase 0 **[VERIFY]** items resolved and this document updated
- [ ] 8 base vibe packs meet minimum sizes; human read-through complete
- [ ] 120 curated films live; top 40 have gold lines for all base vibes
- [ ] Determinism, fuzz, and content-lint suites green in CI
- [ ] Export verified on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari
- [ ] axe: zero serious/critical; contrast script green at mesh peaks
- [ ] Reduced-motion, reduced-transparency, and high-contrast modes reviewed
- [ ] Lighthouse and bundle budgets met (3.11)
- [ ] CSP and cache headers verified in production
- [ ] OG images present for top films; generic OG for the rest
- [ ] About page states content policy and that counters are fictional
- [ ] Hosting plan terms confirmed for the intended use

### 8.4 Definition of done (per feature)

1. Meets acceptance criteria in the feature matrix.
2. Keyboard and screen reader operable.
3. Respects reduced motion and reduced transparency.
4. Covered by unit or e2e tests; visual snapshot where UI changes.
5. Within performance budgets.
6. Content (if any) passes lint and human review.
7. No new third-party origin without a documented reason and CSP update.

### 8.5 Open decisions for the product owner

1. Final name and domain (affects wordmark, OG design, share text).
2. Whether the "Unfiltered" toggle ships at launch or after the safety review.
3. Whether to ship analytics at launch (recommended: yes, cookieless, aggregate only).
4. Monetisation intent, since it affects hosting plan choice and the tone of the About page.
5. Which 40 films get gold lines first (recommended: pick from the most-discussed and most-polarising titles of the last ten years plus evergreen classics).
