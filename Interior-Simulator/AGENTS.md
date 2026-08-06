# Repository Guidelines

## Project Structure & Module Organization

Core app code lives in `src/`:

- `src/app/`: app shell and routing (`App.tsx`, `routes.tsx`).
- `src/features/simulator/domain/`: Project v2 structure, scenario, memory, and import models.
- `src/features/simulator/editor2d/`: structure, scenario, and memory Konva workspaces.
- `src/features/simulator/scene3d/`: generalized structure and furniture rendering.
- `src/features/simulator/store/`: Zustand slices, migrations, IndexedDB, and package persistence.
- `src/features/simulator/floorplan/`: PDF rendering and semi-automatic detection.
- `src/features/simulator/components/`: workspace panels and shared simulator UI.
- `src/shared/ui/`: reusable UI primitives (for example error and toast UI).
- `src/test/setup.ts`: global Vitest + Testing Library setup.

Keep new domain logic inside `src/features/simulator/` unless it is clearly reusable across features.

## Build, Test, and Development Commands

- `npm install --legacy-peer-deps`: install dependencies (matches current project setup).
- `npm run dev`: start Vite dev server.
- `npm run build`: run TypeScript checks and create production build.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint across the repo.
- `npm run test`: run Vitest in watch mode.
- `npm run test:run`: run tests once (good for CI/local verification).
- `npm run test:ui`: open Vitest UI.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings (`tsconfig.json` has `"strict": true`).

- Indentation: 2 spaces.
- Formatting: Prettier (`.prettierrc`) with semicolons, double quotes, trailing commas (`es5`), width 100.
- Linting: ESLint with React, React Hooks, and TypeScript rules.
- Naming: React components in `PascalCase` (`Canvas2D.tsx`), hooks in `useCamelCase` (`useAutoSave.ts`), utilities in lower camel/specific domain names (`geometry2d.ts`, `openings.ts`).

## Testing Guidelines

Tests use Vitest + Testing Library in `jsdom` (`vitest.config.ts`).

- Place tests near source files using `*.test.ts` naming (example: `src/features/simulator/utils/snap.test.ts`).
- Prefer deterministic unit tests for geometry, snapping, openings, migrations, persistence,
  project/store transitions, 3D math, and history behavior.
- Run `npm run test:run` and `npm run lint` before opening a PR.

## Commit & Pull Request Guidelines

Use the Conventional Commit style already present on `main`
(example: `feat(simulator): add wall snapping toggle`).

- Keep commits focused and logically grouped.
- PRs should include: concise summary, test commands run, linked issue/task, and screenshots/GIFs for UI changes.
