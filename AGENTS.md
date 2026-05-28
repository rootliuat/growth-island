# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript prototype for Beihai Growth Island. Main code lives in `src/`.

- `src/App.tsx` coordinates app state, module routing, XP ledger updates, and home focus.
- `src/components/` contains React UI. Product modules are under `src/components/modules/`; HUD and map bridge components are under `src/components/Hud/` and `src/components/WorldMap/`.
- `src/game/` contains PixiJS map configuration, placement data, and rendering layers.
- `src/domain/`, `src/data/`, and `src/services/` hold business rules, seed classroom data, and local API access.
- `server/` contains the local Beihai API and moral-agent logic.
- `docs/` records product, map, generation, and cutout decisions.
- Generated or large assets live in `assets/generated/`, `cutout-birefnet-dynamic/`, and `public/assets/map/v4/`.

## Build, Test, and Development Commands

- `npm run dev` starts both the local API and Vite dev server.
- `npm run dev:vite` starts only Vite.
- `npm run api` starts only `server/beihai-api.mjs`.
- `npm run build` runs TypeScript project build and Vite production build.
- `npm run preview` serves the production build locally.

There is no dedicated `npm test` script. For UI validation, use targeted Playwright scripts with system Chrome.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and named exports where existing code does. Follow repository style: two-space indentation, double quotes, semicolons, and descriptive camelCase identifiers. Components use `PascalCase` filenames such as `RollCallModule.tsx`; config and domain files use focused camelCase names such as `mathPk.ts`.

Keep edits scoped. Prefer existing domain helpers such as `makeLedgerRecord`, `enrichChildren`, and service functions over duplicating logic.

## Testing Guidelines

At minimum, run `npm run build` before committing. For feature work, add a focused browser smoke check for the changed workflow, especially home focus, XP ledger writes, roll call, voice review, or math arena results. Capture screenshots for desktop and narrow mobile layout changes.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, lowercase English messages, for example `add standalone math arena module` and `strengthen roll call classroom workflow`. Keep commits focused and avoid mixing source changes with generated asset churn.

Pull requests should include a concise summary, validation commands, screenshots for UI changes, and notes about touched data or asset directories.

## Agent-Specific Instructions

Do not reinitialize the project, run destructive git commands, clean untracked assets, or delete `assets/generated/v4`, `cutout-birefnet-dynamic`, or `public/assets/map/v4`. Treat `/root/my-project/Points_game` as the source of truth.
