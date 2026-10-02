# Vercel Deployment Runbook

Metacritic-al can run as a Vercel-hosted Next.js application. The site UI and TMDB proxy routes are served by the same deployment. The TMDB Read Access Token is optional: without it, the V1 typed-title flow still works and TMDB search/posters report as unavailable.

## 1. Confirm the repository is ready

- Push the reviewed project changes to the GitHub branch you intend to deploy.
- Keep the repository root as the Vercel project root.
- Do not set `output: "export"`; request-time TMDB Route Handlers require a server runtime.
- Do not set a custom static output directory such as `out`.
- Keep `.env.local` out of Git. The repository's `.env.local.example` is only a placeholder.

The project declares Node.js `>=20.9.0`. Vercel's native Next.js integration handles the Next.js build and Route Handlers. The repository's `prebuild` script runs automatically before `npm run build` under npm lifecycle rules, generating content before `next build`.

## 2. Create or connect the Vercel project

1. In Vercel, import `https://github.com/advaetuc/Metacritic-al` or connect the existing Vercel project to that repository.
2. Choose the repository's production branch (`main`).
3. Set **Root Directory** to the repository root.
4. Confirm **Framework Preset** is **Next.js**.
5. Leave **Build Command**, **Output Directory**, and **Install Command** at the detected Next.js/npm defaults. The expected build is `npm run build`; do not override output to `out`.
6. Select a supported Node.js version at least `20.9.0` in Project Settings if Vercel does not select one from `package.json`.

No `vercel.json` override is required. The existing Next.js configuration supplies the app's security headers, and Vercel's Next.js integration serves the dynamic Route Handlers.

## 3. Add the optional TMDB token safely

In **Project Settings → Environment Variables**, add:

- **Name:** `TMDB_API_READ_ACCESS_TOKEN`
- **Value:** paste the TMDB API Read Access Token directly into Vercel's secure value field; never put it in source, a URL, a screenshot, or a `NEXT_PUBLIC_` variable.
- **Environments:** select **Production** and **Preview** if you want TMDB search on both. Development is only needed for `vercel dev` and is not required for the regular local demo.

Save the variable and create a new deployment. Vercel environment-variable changes apply to new deployments, not deployments that already exist. If the token is absent, the app should still work with typed titles and generated V1 cards.

## 4. Deploy and test a Preview first

1. Create a branch or pull request and wait for its Vercel Preview deployment to finish.
2. Open the Preview URL. Confirm the home page loads and the Credits/About section shows the TMDB attribution.
3. Search for a film. With the token configured and TMDB reachable, suggestions and posters should load through same-origin `/api/tmdb/...` requests.
4. Select a result, generate a card, export a PNG, copy its permalink, and reopen the permalink.
5. Check the browser Network panel: the browser should call the deployed app's `/api/tmdb/search/`, `/api/tmdb/movie/.../`, and `/api/tmdb/image/...` routes; it should not call `api.themoviedb.org` or `image.tmdb.org` directly.
6. Check failure behavior by using a Preview deployment with the TMDB variable omitted, or by temporarily removing it and redeploying Preview. Typed-title generation should continue to work.

Do not put a real token into a public test URL or a committed test fixture. Automated tests use fixtures and should not make live TMDB requests.

## 5. Promote to Production

After the Preview checks pass, merge the reviewed change into `main` (or the configured production branch) and allow Vercel's production deployment to complete. Confirm the Production deployment's commit matches the intended Git commit, then repeat the search, typed-title fallback, card export, permalink, attribution, and browser-network checks on the production URL.

If the search control is missing, first confirm the deployed commit includes the search feature. If the control is present but TMDB reports unavailable, check that the token is configured for that deployment's environment and redeploy. Never print the token in logs while troubleshooting.

## Operational notes

- TMDB calls originate in server-side Route Handlers; the credential is not needed in client assets.
- The in-memory TMDB response cache is per running function instance, limited to 100 entries and 16 MiB, and is best-effort on serverless infrastructure.
- TMDB routes are public endpoints. The bounded input, timeout, response-size checks, and cache reduce accidental load, but the cache is not a cross-instance rate limiter. If public traffic grows, add a Vercel Firewall/WAF rate limit before relying on this proxy at higher volume.
- The production CSP allows inline scripts for Next.js runtime compatibility and removes `unsafe-eval`. A nonce/hash CSP would be a worthwhile hardening pass, but must be validated against App Router hydration and rendering behavior before rollout.
- This deployment serves the app and its API routes; it does not add analytics, a database, remote review sourcing, or persistent user history.
- Follow TMDB attribution requirements in the app's Credits/About section. TMDB does not endorse or certify this product.
