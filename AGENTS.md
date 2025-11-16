# Agent Guide

## Build & Test
- Use `bun run build` to execute the custom **tsdown** build pipeline defined in `scripts/tsdown.ts`. This script must succeed without modifying it unless the build flow itself changes.
- Run unit tests with `bun test`.
- `bun update` currently requires external registry access; document any failures caused by network restrictions when reporting results.

## Coding Standards
- Prefer explicit exports so that critical logic can be unit-tested (see `src/utils/prompts.ts` and the action helpers).
- Maintain comprehensive JSDoc comments for public and helper functions that are imported across modules.
- Keep the CLI entrypoint (`src/index.ts`) lean by pushing reusable helpers into `src/utils/` or dedicated action modules.

## Project Structure Notes
- Bundling is handled by `scripts/tsdown.ts`, which shells out to the official `tsdown` CLI so every build honors `tsdown.config.ts`. No legacy `tsup` artifacts should be reintroduced.
- Tests live beside their respective modules (e.g., `src/actions/*.test.ts`, `src/utils/*.test.ts`). Follow this co-location pattern for new tests.
- When updating Biome, align `biome.json`'s `$schema` field with the version that is actually installed.

### File & Directory Guide
- `src/index.ts` – CLI entrypoint. Keep it lean by delegating to helpers/actions.
- `src/actions/` – Telegram workflows (`downloadMessages`, `downloadSubscribers`, `getAdminChannels`). Each action should expose typed helpers and accompanying tests in `*.test.ts`.
- `src/utils/` – Shared utilities (`prompts`, `search`, `logger`, etc.). Export granular helpers so unit tests can exercise them directly.
- `scripts/tsdown.ts` – Bun script invoked by `bun run build`. It pipes logs from the `tsdown` CLI to the terminal and fails fast on errors.
- `tsdown.config.ts` – Source of truth for the bundler (entry list, sourcemaps, declaration output, externals). Update this file instead of hard-coding build flags elsewhere.
- `biome.json` – Formatting/linting configuration. Keep `$schema` synchronized with the installed `@biomejs/biome` version.
- `release.config.mjs` – Semantic-release settings for automated publishing.
- `AGENTS.md` – This document. Update it whenever workflows or tooling change so future agents know where to look.

## Documentation
- Update `README.md` when adding user-facing commands or altering the build/test workflow.
- Keep this `AGENTS.md` in sync with significant process changes so future contributors have accurate guidance.
