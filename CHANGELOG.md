# Changelog

All notable changes to Metacritic-al are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-10-02

### Added

- Added optional TMDB movie search and metadata through same-origin, server-side Next.js Route Handlers. The TMDB token stays in server environment configuration; title-only generation remains available without it.
- Added validated metadata as an additive context for existing authored engine hooks while preserving the V1 seed, rating, body, vibe, heat, sentiment, and reroll behavior.
- Added compatible V2 permalink fields while keeping existing V1 permalinks readable and deterministic offline.
- Added same-origin poster display and PNG export with procedural-art fallback.
- Added TMDB attribution in Credits/About and documented the optional Vercel deployment workflow.

### Changed

- Runs as a Next.js server application so request-time TMDB routes can operate; static export is not used for this version.
- Declared Node.js `>=20.9.0` as the supported runtime floor.

### Fixed

- Capped the process-local TMDB response cache by both entry count and total bytes (16 MiB), preventing large poster caches from growing to hundreds of MiB in a warm serverless instance.

## [1.0.0] - 2026-09-30

### Added

- Initialized the Next.js App Router project with TypeScript, Tailwind CSS v4, static export settings, and the base design system.
- Added Bricolage Grotesque and Newsreader typography, glass UI primitives, and the responsive cinematic background.
- Added the Framer Motion provider with reduced-motion support and visibility-aware animation handling.
- Implemented the framework-independent deterministic review engine, including title normalization, seeded PRNG, rating generation, and procedural review composition.
- Added the YAML-to-JSON content pipeline with schema validation, content-hashed assets, a movie index, and build-time Open Graph image generation.
- Added runtime title features and fuzzy matching for curated movie packs.
- Built the interactive review studio with title search, sentiment controls, keyboard-accessible vibe selection, and heat controls.
- Added the screening sequence, animated review card, procedural poster art, rating display, and review text announcements.
- Added deterministic review permalinks and a static route for curated films.
- Implemented the export-card twin, PNG download, permalink sharing, and native share support where available.
- Added the About page and a themed not-found page.
- Added safe local storage, a 50-item review history, daily streak tracking, and progress-based vibe unlocks.
- Added the UTC Daily Roast route, Counter-Roast action, and shareable Roast Battle comparison route.
- Added Vercel cache and security header configuration for static hosting.
