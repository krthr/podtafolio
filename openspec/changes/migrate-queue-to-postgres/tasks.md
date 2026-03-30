# Tasks: Migrate Queue to PostgreSQL

## 1. Update queue config to use PostgreSQL adapter
- [x] In `server/queue/config.ts`, replace `better-sqlite3` adapter with `pg`
- [x] Read connection string from `NUXT_DATABASE_URL` (via `useRuntimeConfig()`)
- [x] Remove SQLite-specific options (`useNullAsDefault`, `filename`)

## 2. Update queue plugin to use PostgreSQL and prefixed tables
- [x] In `server/plugins/queue.ts`, create Knex instance with `client: 'pg'` and `NUXT_DATABASE_URL`
- [x] Pass `'queue_jobs'` to `schemaService.createJobsTable()`
- [x] Pass `'queue_schedules'` to `schemaService.createSchedulesTable()`
- [x] Remove the `queue.db` path resolution

## 3. Remove better-sqlite3 dependency
- [x] `npm uninstall better-sqlite3`
- [x] Verify no other code imports `better-sqlite3`

## 4. Clean up queue.db references
- [x] Remove `queue.db` from `.gitignore`
- [x] Remove `queue.db` from `.dockerignore`

## 5. Verify
- [x] App starts without errors
- [ ] Queue tables (`queue_jobs`, `queue_schedules`) are created in PostgreSQL *(manual — needs running PG)*
- [ ] Job dispatch and processing work end-to-end *(manual — needs running PG)*
