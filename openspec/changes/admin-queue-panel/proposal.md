## Why

There is no visibility into the background job queue. When jobs fail or stall, the only way to know is by checking raw database rows or waiting for downstream effects. An admin panel provides at-a-glance status of the processing pipeline and helps diagnose issues quickly.

## What Changes

- Add a token-based auth gate for admin API routes (`ADMIN_TOKEN` env var)
- Add a server endpoint that queries `queue_jobs` and `queue_schedules` tables directly via raw SQL
- Add an admin-only page at `/admin/queue` with:
  - Summary cards showing job counts by status (pending, active, completed, failed, delayed)
  - A list of registered schedules with their status and next run time
  - A filterable job table showing recent jobs with status, name, queue, timestamps, and errors
  - Auto-refresh polling (every 5 seconds) for live updates
- Add a dedicated admin layout (minimal chrome, no public site navigation)

## Capabilities

### New Capabilities

- `admin-auth`: Token-based authentication for admin API routes via server middleware
- `queue-dashboard`: Admin page and API endpoint for viewing queue job status, schedules, and job history

### Modified Capabilities

(none)

## Impact

- **Config**: New `adminToken` runtime config key in `nuxt.config.ts`
- **Server**: New middleware (`server/middleware/admin-auth.ts`), new API route (`server/api/admin/queue.get.ts`)
- **Frontend**: New layout (`app/layouts/admin.vue`), new page (`app/pages/admin/queue.vue`)
- **Database**: Read-only access to `queue_jobs` and `queue_schedules` tables (no schema changes)
- **Dependencies**: Uses existing `pg` package for raw queries; no new dependencies
