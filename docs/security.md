# Local demo security policy

The browser policy is self-only for scripts, styles, images, fonts, and connections. The UI calls only same-origin `/api/tmdb/*` routes; those server handlers contact the fixed TMDB API and image hosts. Browser CORS does not govern server-side fetches.

Next.js development mode adds `'unsafe-eval'` to `script-src` because Next.js documents it as necessary for React development diagnostics. Production mode omits that exception. The production policy still allows inline scripts/styles for the Next.js runtime, but does not allow third-party origins. `img-src` includes `data:` and `blob:` for local inline/generated app assets; TMDB posters and the approved TMDB logo load from same-origin paths.

The TMDB read token is read only by server route code from `TMDB_API_READ_ACCESS_TOKEN`. Do not prefix it with `NEXT_PUBLIC_`, include it in a URL, log it, or return it in an error. Root `.env.local` is ignored by Git; `.env.local.example` contains an empty value only. API errors are normalized to safe codes/messages, and movie/image paths are validated before fixed-host requests.

The local proxy accepts only bounded movie search, numeric movie IDs, and poster basenames. JSON and image responses are size-limited and normalized; image MIME type and file signatures are checked. Review text, authors, and ratings are never requested or rendered. Movie titles remain escaped text, and generated copy is checked against the engine's hard blocklist for every vibe and heat setting.

This policy is for the localhost college demo. It does not configure Vercel or authorize commercial use of TMDB data/images.
