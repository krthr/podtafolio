## 1. Admin Auth

- [x] 1.1 Add `adminToken` to `runtimeConfig` in `nuxt.config.ts`
- [x] 1.2 Create `server/middleware/admin-auth.ts` — check `Authorization: Bearer <token>` on `/api/admin/**` routes, return 401 if missing/invalid, pass through for non-admin routes

## 2. Queue Dashboard API

- [x] 2.1 Create `server/api/admin/queue.get.ts` — raw SQL queries against `queue_jobs` and `queue_schedules` using `pg`, returning `{ summary, jobs, schedules }`
- [x] 2.2 Support optional `?status=` query param to filter jobs by status
- [x] 2.3 Parse the `data` JSON column to extract job name for each job record

## 3. Admin Layout

- [x] 3.1 Create `app/layouts/admin.vue` with minimal header ("Podtafolio Admin" + back link to `/`), no search bar

## 4. Queue Dashboard Page

- [x] 4.1 Create `app/pages/admin/queue.vue` using admin layout
- [x] 4.2 Add token prompt — input form when no token in `sessionStorage`, clear and re-prompt on 401
- [x] 4.3 Add summary cards showing job counts by status
- [x] 4.4 Add schedules section showing id, cron, status, last/next run times
- [x] 4.5 Add job table with columns: status, job name, queue, timestamps, error
- [x] 4.6 Add status filter dropdown to filter the job table
- [x] 4.7 Add auto-refresh polling (5s interval) with toggle to pause/resume
