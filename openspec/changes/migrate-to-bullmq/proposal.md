## Why

The current queue system (`@boringnode/queue` with PostgreSQL backend) lacks visibility into job processing, has no per-queue concurrency control, and required building a custom admin dashboard from scratch. BullMQ is the most mature Redis-backed job queue for Node.js, and bull-board provides a production-ready admin UI out of the box — replacing custom code with battle-tested tooling.

## What Changes

- **BREAKING**: Replace `@boringnode/queue` (PostgreSQL-backed) with BullMQ (Redis-backed). Queue data moves from `queue_jobs`/`queue_schedules` tables to Redis.
- Split the single `"default"` queue into 8 dedicated queues (one per job type) with independent concurrency settings.
- Rewrite 8 job classes from `Job<T>` class pattern to BullMQ processor functions.
- Replace custom admin dashboard (`queue.vue` + `queue.get.ts`) with bull-board mounted via `@bull-board/h3`.
- Add Redis as a new infrastructure dependency.
- Remove `retry` action from dispatch API (bull-board handles retries natively); keep `poll-feeds` and `reprocess` custom actions.

## Capabilities

### New Capabilities

- `bullmq-queues`: Queue and worker setup using BullMQ with per-queue concurrency, Redis connection management, repeatable jobs (cron), and graceful shutdown.
- `bull-board-admin`: bull-board dashboard mounted on H3 with token-based auth, replacing the custom Vue admin page and raw SQL query API.

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Dependencies added**: `bullmq`, `@bull-board/api`, `@bull-board/h3`, `@bull-board/api/bullMQAdapter`
- **Dependencies removed**: `@boringnode/queue`, `knex` (if only used for queue)
- **Infrastructure**: Redis instance required (new)
- **Database**: `queue_jobs` and `queue_schedules` PostgreSQL tables become unused (can be dropped)
- **Files removed**: `app/pages/admin/queue.vue`, `server/api/admin/queue.get.ts`
- **Files rewritten**: `server/queue/config.ts`, `server/plugins/02.queue.ts`, all 8 job files in `server/queue/jobs/`
- **Files modified**: `server/api/admin/queue/dispatch.post.ts` (remove retry action, update imports)
