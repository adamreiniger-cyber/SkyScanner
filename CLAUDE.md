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

The previous build (v9) used **React + Vite**, with `astronomy-engine` for ephemerides and `three.js`. The stack is open. The recommended stack for the redesign:

- **React 18 + TypeScript + Vite.** Keeps the existing logic portable and outputs a static build that FTP hosting can serve.
- **Styling:** CSS with custom properties (design tokens) plus CSS Modules, or Tailwind if preferred. Pick one and use it everywhere. Define all colours, spacing and type as tokens so red night mode is a token swap, not a CSS filter.
- **Astronomy:** `astronomy-engine`. Do not hand-roll ephemeris maths.
- **Testing:** Vitest for logic (scoring, visibility windows, rise/set). Playwright for responsive smoke tests at the breakpoints above.
- **Lint and format:** ESLint + Prettier.

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

Today Adam builds locally and uploads `dist/` to the web host by FTP. The plan is to **automate this**:

- A GitHub Actions workflow builds on push to `main` and deploys `dist/` over FTP/FTPS to the host's `SkyScanner` folder.
- FTP host, username, password and remote path live **only** in GitHub Actions secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_REMOTE_DIR`). Never commit credentials or put them in code, docs or chat.
- Work happens on branches and goes to `main` through a pull request, so merging is the "deploy" button.

## Commands

Fill these in once the project is scaffolded:

```bash
npm install        # install deps
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the build locally
npm test           # unit tests (Vitest)
npm run e2e        # responsive smoke tests (Playwright)
npm run lint       # ESLint
```

## Conventions

- TypeScript strict mode. Put data and logic in `src/lib/` (pure functions, unit-tested) and UI in `src/components/` and `src/screens/`.
- The target catalogue (names, descriptions, finding tips, filter advice) lives in data files, not inside components.
- Equipment presets are data too. Adding a new scope should mean adding one entry, not editing logic.
- Accessibility: semantic HTML, visible focus states, WCAG AA contrast in both normal and red night mode, and respect for `prefers-reduced-motion`.
- Persist user choices (location, equipment, sky settings, night mode) in `localStorage`, behind a small typed wrapper that tolerates it being unavailable.
- Keep the bundle lean, because it's used on phones in the field. Lazy-load `three.js` and other heavy views.
- Commit messages: short imperative summary line, for example "Add equipment preset for Seestar S30 Pro".

## Working with Claude

- Ask Adam before anything that can't be undone: pushing to `main`, changing deploy settings, or deleting features.
- Show screen designs at phone and desktop sizes before building them in full.
- When changing scoring or astronomy logic, add or update tests that prove the old behaviour still holds.
