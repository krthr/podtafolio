## Context

Podtafolio uses `@boringnode/queue` with a PostgreSQL adapter (Knex) for background job processing. Jobs live in `queue_jobs` and schedules in `queue_schedules` — both tables are managed by the queue library, not Drizzle. There is currently no auth system, no admin routes, and no middleware.

The public frontend is a Nuxt 4 app with a default layout (header + search bar). All existing API routes are public read endpoints under `server/api/`.

## Goals / Non-Goals

**Goals:**
- Provide real-time visibility into queue health (counts by status)
- Show individual job records with status, name, timestamps, and errors
- Show registered schedules with their status and next run time
- Protect admin routes with a simple token gate

**Non-Goals:**
- Full admin CRUD (no retry, cancel, or delete actions in this change)
- Role-based access control or user accounts
- WebSocket/SSE — polling is sufficient for a single-user admin tool
- Covering other admin concerns (podcasts, episodes, etc.)

## Decisions

### 1. Token-based auth via server middleware

Admin routes under `/api/admin/**` are protected by a Nitro server middleware that checks `Authorization: Bearer <token>` against `runtimeConfig.adminToken`. The frontend page stores the token in `sessionStorage` after a simple prompt.

**Why not session/cookie auth?** Overkill for a single admin user. A shared secret is the minimal viable approach and can be upgraded later.

**Why middleware instead of per-route checks?** All future admin endpoints get protection automatically.

### 2. Raw SQL via `pg` for querying queue tables

The `queue_jobs` and `queue_schedules` tables aren't in the Drizzle schema. Rather than adding them to Drizzle or creating a separate Knex instance, we use the existing `pg` connection (same `databaseUrl`) with raw queries.

**Why not the `@boringnode/queue` Adapter API?** The adapter only exposes `getJob(id, queue)` and `sizeOf(queue)` — no listing or filtering.

### 3. Single API endpoint returning all dashboard data

One `GET /api/admin/queue` endpoint returns `{ summary, jobs, schedules }`. Three queries in one request keeps the frontend simple (one `useFetch` call, one polling interval).

**Why not separate endpoints?** The data volume is small (50 jobs max per page) and they always load together. Splitting adds complexity for no benefit.

### 4. Dedicated admin layout

A separate `app/layouts/admin.vue` with minimal chrome — just a header with "Podtafolio Admin" and a back link. No search bar, no public navigation.

### 5. Client-side polling at 5-second interval

`setInterval` calling `refresh()` on the `useFetch` composable. A toggle lets the user pause auto-refresh.

## Risks / Trade-offs

- **[Token in sessionStorage]** → Acceptable for admin-only tool. Token is never sent to third parties. If stronger security is needed later, upgrade to HTTP-only cookies.
- **[Raw SQL on library-managed tables]** → Table schema could change on `@boringnode/queue` upgrades. Mitigation: pin the dependency and review schema on upgrades.
- **[No pagination]** → First version returns latest 100 jobs. If the table grows very large, add cursor-based pagination later.
- **[Polling vs push]** → 5s polling means up to 5s staleness. Acceptable for an admin dashboard.
