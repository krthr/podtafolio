# Migrate @boringnode/queue from SQLite to PostgreSQL

## Problem

The app runs two databases: PostgreSQL for application data (via Drizzle ORM) and a local SQLite file (`queue.db`) for the job queue (via `@boringnode/queue` + Knex). This adds operational complexity — two storage engines to monitor, no transactional coordination between app data and job dispatch, and a local file that doesn't survive container restarts without a volume mount.

## Solution

Switch the `@boringnode/queue` Knex adapter from `better-sqlite3` to `pg`, pointing at the same PostgreSQL instance the app already uses. The queue gets its own small Knex connection pool (separate from Drizzle's `node-postgres` pool) and writes to prefixed tables (`queue_jobs`, `queue_schedules`) to avoid naming collisions.

## Scope

### In scope

- Swap the Knex adapter config from SQLite to PostgreSQL
- Use `NUXT_DATABASE_URL` for the queue's Postgres connection
- Prefix queue tables as `queue_jobs` and `queue_schedules`
- Remove `better-sqlite3` dependency
- Clean up `queue.db` references in `.gitignore` and `.dockerignore`

### Out of scope

- Migrating in-flight jobs from SQLite (the schedule re-creates on boot; deploy during a quiet window)
- Sharing the Drizzle connection pool with the queue (separate Knex pool is simpler)
- Changing any job class implementations

## Decisions

| Decision               | Choice                          | Rationale                                                                             |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| Connection strategy    | Separate Knex pool for queue    | Avoids coupling with Drizzle's `node-postgres` pool; `@boringnode/queue` expects Knex |
| Table naming           | `queue_jobs`, `queue_schedules` | Prevents collisions with app tables, clear ownership                                  |
| Existing job migration | None — redeploy clean           | Daily schedule re-creates on boot; risk of losing in-flight jobs is low               |

## Files affected

| File                      | Change                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `server/queue/config.ts`  | Swap adapter to `pg`, read `NUXT_DATABASE_URL`, pass prefixed table names          |
| `server/plugins/queue.ts` | Point schema service at Postgres, use prefixed table names, remove `queue.db` path |
| `.gitignore`              | Remove `queue.db` entry                                                            |
| `.dockerignore`           | Remove `queue.db` entry                                                            |
| `package.json`            | Remove `better-sqlite3`                                                            |

## Risks

- **In-flight job loss on deploy**: Low risk. The cron schedule re-registers on boot. Deploy during a quiet window or after existing jobs drain.
- **Connection pool sizing**: The queue's Knex pool defaults are fine for the current `concurrency: 2` worker config. No tuning needed unless concurrency increases.
