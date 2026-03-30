# Tasks: Move seed to server plugin

## 1. Create seed plugin

- [x] Create `server/plugins/01.seed.ts` as a Nitro plugin
- [x] Use `useDB()` instead of standalone Drizzle connection
- [x] Add early return if `podcasts` table already has rows
- [x] Keep the idempotent per-podcast `feedUrl` check as a safety net
- [x] Remove `dotenv/config`, `process.exit()`, and standalone DB setup

## 2. Rename queue plugin for ordering

- [x] Rename `server/plugins/queue.ts` to `server/plugins/02.queue.ts`
- [x] Verify no import paths reference the old filename

## 3. Clean up old seed script

- [x] Delete `scripts/seed-podcasts.ts`
- [x] Remove `"seed"` script from `package.json`

## 4. Verify

- [x] App builds without errors
