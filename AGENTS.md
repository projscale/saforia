# Repository Guidelines

## Project Structure & Module Organization
- `src/` — React + TypeScript UI. Components in `src/ui`, hooks in `src/ui/hooks`, screens in `src/ui/screens`, shared utilities in `src/ui/*.ts`, styles in `src/styles.css`. Browser entry: `src/main.tsx`.
- `src-tauri/` — Tauri (Rust) app: `tauri.conf.json`, `Cargo.toml`, icons, and native commands in `src-tauri/src`.
- `e2e/` — Playwright tests (`*.spec.ts`). Config: `playwright.config.ts`.
- `scripts/` — Maintenance checks (assets, legacy-parity). Output in `dist/` (do not edit).

## Build, Test, and Development Commands
- `npm run dev` — Start Vite dev server.
- `npm run preview` — Serve the built app locally.
- `npm run build` — Production build to `dist/`.
- `npm run preflight` — Run asset and legacy-parity checks.
- `npm run test:e2e` / `npm run test:e2e:headed` — Run Playwright E2E tests.
- `npm run tauri:dev` — Desktop dev via Tauri. `npm run tauri:build` to bundle. Mobile: `npm run mobile:android`, `npm run mobile:ios`.
- Using Bun is fine (`bun run dev` etc.), but examples use `npm`.

## Coding Style & Naming Conventions
- TypeScript strict mode; React function components; 2‑space indent; single quotes; no semicolons.
- Components use PascalCase (e.g., `PasswordInput.tsx`); utilities/modules use camelCase (e.g., `a11y.ts`).
- Prefer accessible labels/roles in UI and tests; localize user‑facing strings via `src/ui/i18n.tsx` (avoid hardcoded text).

## Testing Guidelines
- E2E tests live in `e2e/*.spec.ts`; prefer `getByRole`/`getByLabel` selectors and visible assertions.
- Tests must be idempotent; avoid relying on persisted state. Many flows use `?test=1` and `SAFORIA_MOCK` to control setup.
- Playwright auto‑starts `vite preview`; override with `PLAYWRIGHT_BASE_URL` when targeting an external server.

## Commit & Pull Request Guidelines
- Message style: `scope: concise, imperative summary` (e.g., `mobile: close modals on Escape`).
- Link issues (`#123`), describe motivation and testing steps; include before/after screenshots or GIFs for UI changes.
- PRs must pass `preflight` and E2E; note any i18n/ARIA changes and Tauri IPC updates.

## Security & Configuration Tips
- Never log or screenshot secrets; mask viewer/master passwords in tests and PRs.
- UI ↔ Tauri calls go through `src/bridge.ts`; avoid ad‑hoc IPC. Do not commit platform artifacts or local build outputs.
