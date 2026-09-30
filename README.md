# Metacritic-al

### Your taste, on trial.

[![License: MIT](https://img.shields.io/github/license/advaetuc/Metacritic-al)](https://github.com/advaetuc/Metacritic-al/blob/main/LICENSE)
[![Build](https://img.shields.io/github/checks-status/advaetuc/Metacritic-al/main?label=build)](https://github.com/advaetuc/Metacritic-al/actions)
[![Version](https://img.shields.io/github/v/release/advaetuc/Metacritic-al)](https://github.com/advaetuc/Metacritic-al/releases)

**[Open the live demo](https://metacritic-al.vercel.app)**

Metacritic-al is a zero-backend, static Next.js application that turns movie titles into deterministic, satirical review cards. Choose a critic vibe and heat level, then share the result as a permalink or image.

> **Project status:** Metacritic-al remains in active development. The current app generates original satirical reviews from curated YAML content and procedural rules. The long-term goal is to source publicly available film reviews, select source material for the chosen critic vibe, transform it into satire, and display the result on the review card. That public-review sourcing and transformation workflow is not implemented in the current release.

## Features

| Feature | Description |
| --- | --- |
| Deterministic review engine | Seeds an `xmur3` and `mulberry32` PRNG from the normalized title, vibe, heat, sentiment, and reroll counter. Identical inputs reproduce the same review. |
| Curated and fallback generation | Uses curated movie packs when available and title-derived features with procedural rules for other titles. |
| YAML-to-JSON content pipeline | Validates YAML content with Zod and emits a compact index, content-hashed movie and vibe packs, and Open Graph images at build time. |
| Cinematic interface | Glass-inspired review cards, an animated ambient background, a screening sequence, responsive layouts, and reduced-motion support. |
| Save and share | Renders a solid-background export twin with `html2canvas` for PNG downloads, and uses native sharing where supported. |
| Daily Roast | Selects the same film, vibe, and heat for everyone on a given UTC date. |
| Roast Battle | Shows a shareable, side-by-side comparison of two critic vibes reviewing the same film. |
| Gamification | Keeps local review history, tracks daily streaks, and displays progress toward vibe unlocks. |

## Architecture

Metacritic-al uses the Next.js App Router with `output: "export"`. Reviews are generated in the browser; the application has no runtime API, database, or review-generation backend.

The build pipeline validates YAML files under `content/` and writes static JSON packs and an index under `public/data/`. It also generates curated Open Graph images under `public/og/`. Next.js exports the application to `out/` for static hosting.

Review permalinks encode the inputs needed to reproduce a card, including its title, vibe, heat, sentiment, and reroll counter. The app can rebuild a review from its URL without relying on local storage.

For curated titles, the app loads the matching movie pack and uses its metadata and authored review rules. For other titles, it uses the procedural engine and title-derived features. Both paths use the same deterministic generation engine.

## Technology

- Next.js App Router with static export
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Zustand
- `html2canvas`
- YAML and Zod for build-time content validation

## Local development

### Requirements

- Node.js 22.18 or newer
- npm

### Install and run

```bash
git clone https://github.com/advaetuc/Metacritic-al.git
cd Metacritic-al
npm ci
npm run prebuild
npm run dev
```

Run `npm run prebuild` before `npm run dev` to generate the static JSON content and Open Graph images. The development server does not generate these assets automatically.

Open [http://localhost:3000](http://localhost:3000).

### Build and checks

```bash
npm run build
npm test
npm run lint
```

`npm run build` automatically runs the `prebuild` lifecycle script before `next build`. The resulting static site is written to `out/`.

## Deployment

Import `advaetuc/Metacritic-al` into Vercel and use `npm run build` as the build command. The Next.js configuration enables static export, trailing-slash routes, and unoptimized images; Vercel serves the generated `out/` directory.

Response headers and cache rules are defined in `vercel.json`, because Next.js response headers are not applied to static exports. The configuration includes `Content-Security-Policy: default-src 'self'`, content-type and referrer protections, and cache policies for exported assets.

> **CSP compatibility:** The exported HTML contains inline Next.js bootstrap scripts. The strict `default-src 'self'` policy blocks inline scripts, including those bootstrap scripts, and can prevent the client-side interface from hydrating. Verify this behavior on a Vercel preview before deployment and use a CSP strategy compatible with Next.js static export. A plain static file server does not apply the headers from `vercel.json`.

## License

The project is released under the [MIT License](LICENSE). This license covers the project’s code and does not grant rights to third-party review content or other external materials that may be used in future development.
