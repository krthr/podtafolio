# Move podcast seed to a Nitro server plugin

## Problem

The seed script (`scripts/seed-podcasts.ts`) must be run manually via `npx tsx`. It creates its own database connection, requires `dotenv/config`, and uses `process.exit()`. In a containerized deployment, this means either adding a separate step to the Dockerfile or remembering to run it manually — easy to forget on fresh deploys.

## Solution

Convert the seed into a Nitro server plugin that runs on every boot. It uses `useDB()` (shared connection) and is idempotent — existing podcasts are skipped by `feedUrl` check. The cost is negligible (20 SELECTs on startup).

Use numeric prefixes to control plugin load order so seeding happens before the queue worker starts.

## Scope

### In scope

- Create `server/plugins/01.seed.ts` from the existing seed script logic
- Rename `server/plugins/queue.ts` to `server/plugins/02.queue.ts`
- Update imports in `02.queue.ts` (no logic changes)
- Remove `scripts/seed-podcasts.ts` and the `seed` script from `package.json`

### Out of scope

- Extracting the duplicated `slugify` helper (exists in both seed and `FeedPollJob`)
- Adding new podcasts to the seed list
- Conditional seeding via env var or DB flag

## Decisions

| Decision        | Choice                                    | Rationale                                             |
| --------------- | ----------------------------------------- | ----------------------------------------------------- |
| Run frequency   | Every boot, unconditionally               | Idempotent by design; 20 SELECTs is negligible        |
| Short-circuit   | Check `podcasts` count first, skip if > 0 | One fast query avoids 20 feed parses on every restart |
| Plugin ordering | Numeric prefixes (`01.seed`, `02.queue`)  | Seed must insert podcasts before queue worker starts  |
| DB connection   | `useDB()`                                 | Shared pool, no standalone connection needed          |

## Files affected

| File                                                     | Change                           |
| -------------------------------------------------------- | -------------------------------- |
| `server/plugins/01.seed.ts`                              | New — seed logic as Nitro plugin |
| `server/plugins/queue.ts` → `server/plugins/02.queue.ts` | Rename for ordering              |
| `scripts/seed-podcasts.ts`                               | Delete                           |
| `package.json`                                           | Remove `seed` script             |
