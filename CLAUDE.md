# CLAUDE.md: SkyShot

Guidance for Claude (and any other contributor) working in this repository.

## What this project is

**SkyShot** ("Tonight's Targets") is a night-sky observing and astrophotography planner. It is Adam's own site, live at https://webuiltthis.co.uk/SkyScanner/.

> The repo is named "SkyScanner" for historical reasons. It has **nothing to do with the Skyscanner travel company**. Never use that company's name, branding or assets.

For the user's location and chosen equipment, the app works out the best targets to look at or photograph tonight. It covers:

- **Targets:** deep-sky objects (nebulae, galaxies, clusters), double stars, the Moon and planets, and the Sun (with solar-filter safety guidance).
- **Scoring:** a suitability score for each target and a "best window" for each, using altitude, moonlight, cloud forecast and sky brightness.
- **Location:** device geolocation, IP fallback and town search.
- **Sky settings:** sky brightness (city to dark site), moon filter, date and time.
- **Equipment:** presets for smart telescopes (Dwarf II / 3 / Mini / Draco, Seestar S30 / S50 variants), binoculars, visual scopes and filters (UHC, OIII, duo-band). Advice and exposure tips adapt to the preset.
- **Red night mode:** keeps dark adaptation at the eyepiece.
- **Target details:** a description, a finding tip, and links out to Wikipedia, Stellarium Web and AstroBin.

## Current goal: redesign

**The original source code is lost.** Only the built v9 bundle survives (minified `index.html`, JS and CSS, as uploaded by FTP). The redesign is therefore a **rebuild from scratch** in this repo. Use the v9 behaviour, as described above, as the feature reference, but don't try to reverse-engineer or copy the minified code.

The redesign is about continuous improvement. **Nothing from the current UI has to be kept.** Look, layout, fonts, colours and the logo can all change, and existing features should keep working unless Adam agrees to drop one.

**Priority screens, in order:**
1. Target details
2. Location
3. Sky settings
4. Equipment setup

The target list or home screen will be reworked to fit around these, but it isn't the main focus.

**Must render well on phones, tablets and desktops.** Design mobile-first. Test at roughly 375px (phone), 768px and 1024px (tablet, both orientations) and 1440px (desktop). Touch targets must be at least 44px. Assume the app is used outdoors at night: support one-handed use, high legibility in the dark theme, and red night mode on every screen.

## Tech stack

The previous build (v9) used React + Vite, with `astronomy-engine` for ephemerides and `three.js`. The rebuild uses:

- **React 19 + TypeScript (strict) + Vite.** The build is static, so the FTP host can serve it as-is.
- **Styling:** plain CSS with custom properties. All colours, spacing, radii and type are tokens in `src/styles/tokens.css`. Red night mode is `<html data-theme="night">`, which redefines the colour tokens. Never use a CSS filter for it, and never hard-code a colour in a component.
- **Astronomy:** `astronomy-engine` (add it when the first feature needs it). Do not hand-roll ephemeris maths.
- **Testing:** Vitest + Testing Library (jsdom) for logic and components. Playwright responsive smoke tests at the breakpoints above are planned but not set up yet.
- **Lint:** oxlint (`.oxlintrc.json`).
- **Node 22** (CI uses 22).

The site is served from a **sub-path** (`/SkyScanner/`), so set `base` in `vite.config` accordingly, or use `'./'`. Never hard-code root-relative asset URLs.

## External services (all free, no API keys)

| Purpose | Service |
|---|---|
| Cloud forecast | Open-Meteo forecast API (`hourly=cloud_cover`) |
| Town search | Open-Meteo geocoding API |
| IP location fallback | get.geojs.io |
| Reverse geocode | BigDataCloud reverse-geocode-client |
| Target blurbs | Wikipedia REST / action API |
| Solar imagery | SOHO / SDO latest images |
| Outbound links | Stellarium Web, AstroBin, SpaceWeatherLive |

Every network call must fail gracefully. The app should still produce a target list with no network (cloud forecast unavailable, location set manually).

Google Analytics (gtag `G-19J4LN1XH4`) is in `index.html`. Keep it unless Adam says otherwise.

## Deployment

Deploys are automated with GitHub Actions. Nobody uploads by hand any more.

- `.github/workflows/ci.yml` runs lint, tests and a build on every pull request and every push to `main`.
- `.github/workflows/deploy.yml` builds and uploads `dist/` over FTP on every push to `main`. It can also be started by hand from the Actions tab. It uses `SamKirkland/FTP-Deploy-Action`, which uploads only changed files and never wipes the server folder.
- **Backup:** before uploading, the deploy job downloads the live page and the files it loads and saves them as a `live-site-backup-N` artifact on the run (kept 90 days). If the backup fails, nothing is uploaded.
- **Safety switch:** the deploy job does nothing until the repository variable `FTP_DEPLOY_ENABLED` is `true`. Leave it off until the rebuild is good enough to replace the live v9 site.
- Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`. Variables: `FTP_DEPLOY_ENABLED`, `FTP_REMOTE_DIR` (with a trailing slash), and optionally `FTP_PROTOCOL` (`ftps` by default, `ftp` if the host has no TLS). They live **only** in GitHub settings. Never commit credentials or put them in code, docs or chat.
- Work happens on branches and goes to `main` through a pull request, so merging is the "deploy" button.

## Commands

```bash
npm install        # install deps
npm run dev        # local dev server
npm run build      # type-check, then production build to dist/
npm run preview    # serve the build locally
npm test           # unit and component tests (Vitest, single run)
npm run test:watch # tests in watch mode
npm run lint       # oxlint
npm run typecheck  # TypeScript only
```

## Layout

```
src/
  main.tsx            entry, imports global styles
  App.tsx             app shell: header, night-mode toggle, screen nav
  screens/            one folder or file per screen; screens.ts lists them in priority order
  components/         shared UI
  lib/                pure logic and hooks (storage.ts, usePersistentState.ts), unit-tested
  styles/tokens.css   design tokens, including red night mode
  styles/base.css     reset, layout, breakpoints
public/               copied as-is (favicon.svg)
```

## Conventions

- TypeScript strict mode. Put data and logic in `src/lib/` (pure functions, unit-tested) and UI in `src/components/` and `src/screens/`. Co-locate tests as `*.test.ts(x)`.
- The target catalogue (names, descriptions, finding tips, filter advice) lives in data files, not inside components.
- Equipment presets are data too. Adding a new scope should mean adding one entry, not editing logic.
- Accessibility: semantic HTML, visible focus states, WCAG AA contrast in both normal and red night mode, and respect for `prefers-reduced-motion`.
- Persist user choices (location, equipment, sky settings, night mode) with `usePersistentState` / `src/lib/storage.ts`. Never call `localStorage` directly, because it can be unavailable.
- Keep the bundle lean, because it's used on phones in the field. Lazy-load `three.js` and other heavy views.
- Commit messages: short imperative summary line, for example "Add equipment preset for Seestar S30 Pro".

## Working with Claude

- Ask Adam before anything that can't be undone: pushing to `main`, changing deploy settings, or deleting features.
- Show screen designs at phone and desktop sizes before building them in full.
- When changing scoring or astronomy logic, add or update tests that prove the old behaviour still holds.
