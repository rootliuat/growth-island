- # Repository Guidelines

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

  Use TypeScript, React function components, and named exports where existing code does. Follow repository style: two-space indentation, double quotes, semicolons, and descriptive camelCase identifiers.

  Components use `PascalCase` filenames such as `RollCallModule.tsx`; config and domain files use focused camelCase names such as `mathPk.ts`.

  Keep edits scoped. Prefer existing domain helpers such as `makeLedgerRecord`, `enrichChildren`, and service functions over duplicating logic.

  ## Testing Guidelines

  At minimum, run `npm run build` before committing or after code changes. For feature work, add a focused browser smoke check for the changed workflow, especially home focus, XP ledger writes, roll call, voice review, or math arena results.

  For layout changes, capture or inspect both desktop and narrow mobile states. When visual QA is relevant, run the existing visual QA script if available; otherwise use a targeted Playwright smoke check with system Chrome.

  ## Commit & Pull Request Guidelines

  Recent commits use short, imperative, lowercase English messages, for example `add standalone math arena module` and `strengthen roll call classroom workflow`.

  Keep commits focused and avoid mixing source changes with generated asset churn. Pull requests should include a concise summary, validation commands, screenshots for UI changes, and notes about touched data or asset directories.

  ## Agent-Specific Instructions

  Do not reinitialize the project, run destructive git commands, clean untracked assets, or delete `assets/generated/v4`, `cutout-birefnet-dynamic`, or `public/assets/map/v4`.

  Treat `/root/my-project/Points_game` as the source of truth.

  Before changing frontend UI, inspect the existing component structure first.

  For page layout or visual hierarchy tasks, spawn the `ui_designer` agent for read-only review before implementation unless the user explicitly asks for direct implementation.

  Prefer existing components and styles before adding new abstractions.

  Keep frontend changes small and targeted.

  For layout work, consider mobile-first responsive behavior.

  After frontend changes, run `npm run build`.

  Do not modify unrelated CSV or JSON data files unless explicitly asked.

  ## Agent Routing

  For frontend visual or layout work:
  1. Use `ux_researcher` for user flow, copy, cognitive load, and interaction clarity.
  2. Use `ui_designer` for visual hierarchy, component layout, responsive structure, and game skin.
  3. Use `frontend_developer` only after the implementation plan is clear.
  4. Use `code_reviewer` after code changes.

  For backend/API/data-contract work:
  1. Use `backend_architect` for read-only architecture review before implementation.

  For UI polish, avoid generic AI-looking layout patterns:
  - oversized hero titles
  - repeated subtitles
  - SaaS feature-card grids
  - purple/blue gradients
  - generic glassmorphism panels
  - decorative icons without game meaning

  Prefer:
  - compact top HUD

  - map-first layout

  - module dock or floating task panels

  - XP/gold/badge chips

  - shell/sand/sea/coral game palette

  - short task labels instead of marketing copy

    ## Agent Collaboration Workflow

    For frontend visual, layout, or UI polish work, do not implement immediately.

    Step 1: Spawn `ux_researcher` for read-only UX review:
    - user flow
    - cognitive load
    - unclear navigation
    - oversized headings/subheadings
    - confusing module entry points
    - mobile usability
    - generic AI-looking interface patterns

    Step 2: Spawn `ui_designer` for read-only visual and layout review:
    - visual hierarchy
    - game HUD structure
    - component layout
    - responsive structure
    - design tokens
    - coastal island game skin
    - concrete file-level recommendations

    Step 3: Summarize both reviews into a short implementation plan before editing.

    Step 4: Spawn `frontend_developer` only after the implementation plan is clear:
    - implement scoped React/TypeScript/CSS changes
    - preserve business logic, state flow, module routing, XP ledger, service calls, and data helpers
    - run `npm run build` after frontend changes

    Step 5: Spawn `code_reviewer` after implementation:
    - review correctness, build risk, accidental unrelated edits, accessibility, mobile layout, and state regressions
    - do not edit files during review

    Use `backend_architect` only for backend/API/data-contract tasks.



## Visual Quality Rules

The app should feel like a professional coastal island learning game, not a SaaS landing page and not a plastic AI-generated demo.

Avoid:
- oversized hero titles
- repeated title + subtitle blocks
- generic feature-card grids
- purple/blue AI gradients
- excessive glassmorphism
- random decorative icons
- too many shadows, glows, and borders
- every module starting with marketing-style introduction text

Prefer:
- compact top HUD
- map-first layout
- floating task panels
- module dock or bottom sheet
- XP/gold/badge/status chips
- short task labels
- restrained shell/sand/sea/coral palette
- consistent card, button, chip, and panel styles
- smaller headings with stronger grouping
- clear action feedback after every classroom operation

Typography guidance:
- app title: 18–24px
- screen title: 18–22px
- panel title: 15–18px
- card title: 14–16px
- body text: 13–15px
- labels and chips: 11–13px

Do not use 36–48px titles except for a true splash/start screen.
