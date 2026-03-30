## Context

The project runs an 8-stage podcast processing pipeline (feed-poll → download → preprocess → transcribe → analyze → resolve-entities → embed-chunks → invalidate-cache) using `@boringnode/queue` with PostgreSQL as the job store. All jobs share a single `"default"` queue with concurrency 2. A custom admin dashboard (`queue.vue`) polls a raw SQL endpoint every 5 seconds for job visibility.

This works but has limitations: no per-stage concurrency control, limited job inspection, and the admin UI required custom code that duplicates what battle-tested tools already provide.

## Goals / Non-Goals

**Goals:**

- Replace `@boringnode/queue` with BullMQ backed by Redis
- Give each pipeline stage its own queue with tunable concurrency
- Replace custom admin dashboard with bull-board via `@bull-board/h3`
- Preserve existing pipeline behavior: job chaining, cron schedule, retry policy, graceful shutdown
- Keep custom admin dispatch actions (poll-feeds, reprocess)

**Non-Goals:**

- Changing pipeline logic or adding new stages
- Implementing BullMQ Flows/FlowProducer (manual dispatch is sufficient)
- Persisting job history to PostgreSQL (Redis retention is acceptable)
- Running workers in a separate process (keep in-process for now)

## Decisions

### 1. One Queue per job type

Each of the 8 job types gets its own BullMQ `Queue` and `Worker`. This allows independent concurrency tuning.

| Queue              | Concurrency | Rationale                                |
| ------------------ | ----------- | ---------------------------------------- |
| `feed-poll`        | 1           | Sequential, avoid hammering RSS feeds    |
| `download`         | 3           | I/O bound network downloads              |
| `preprocess`       | 2           | CPU-heavy ffmpeg, avoid starving the box |
| `transcribe`       | 1           | Groq API rate limits                     |
| `analyze`          | 2           | Gemini API, moderate parallelism         |
| `resolve-entities` | 2           | Entity resolution service calls          |
| `embed-chunks`     | 2           | Google Embeddings API                    |
| `invalidate-cache` | 3           | Lightweight DB operations                |

**Alternative considered**: Single queue with named processors. Rejected because BullMQ's single-queue concurrency applies globally, not per-processor name.

### 2. Shared Redis connection via IORedis

All queues and workers share a single `IORedis` connection config (not instance — BullMQ manages its own connections). Configuration stored in `server/queue/config.ts` reading from `NUXT_REDIS_URL` runtime config.

### 3. Processor functions in separate files

Keep the existing `server/queue/jobs/` file structure. Each file exports a processor function `(job: Job<T>) => Promise<void>` instead of a class. The queue/worker wiring happens in the plugin.

```
server/queue/jobs/transcribe.ts
  export async function process(job: Job<TranscribePayload>) { ... }
```

**Alternative considered**: Sandboxed processors (separate Node processes). Rejected — adds complexity, and in-process workers are fine for this scale.

### 4. bull-board mounted behind existing admin auth

The `H3Adapter` is mounted at `/admin/queue/board`. The existing `admin-auth.ts` middleware already protects `/api/admin/**` routes. For bull-board, add an H3 event handler that checks the token before serving the board UI.

### 5. Manual dispatch pattern preserved

Each processor dispatches the next job explicitly (e.g., transcribe processor adds to `analyze` queue on completion). Same pattern as current, just using `queue.add()` instead of `JobClass.dispatch()`.

### 6. Job retention and retry policy

- Completed jobs retained for 7 days: `removeOnComplete: { age: 604800 }`
- Failed jobs retained for 30 days: `removeOnFail: { age: 2592000 }`
- Retry: 5 attempts with exponential backoff (matching current config)
- Repeatable job for feed-poll cron: `{ repeat: { cron: '0 3 * * *' } }`

### 7. Queue registry pattern

A central `server/queue/queues.ts` file exports all Queue instances and a registry map. This is the single source of truth for queue names, used by:

- The plugin (to create workers)
- bull-board (to register adapters)
- Dispatch API (to add jobs)
- Processors (to chain to next queue)

## Risks / Trade-offs

- **[New Redis dependency]** → Redis must be provisioned alongside PostgreSQL. For local dev, a simple `redis-server` or Docker container suffices. For production, use a managed Redis (e.g., Upstash, Railway Redis addon).
- **[Job history loss]** → PostgreSQL `queue_jobs` table had full history. Redis retention is time-bounded. → Acceptable per user decision; bull-board provides sufficient operational visibility.
- **[Migration is non-incremental]** → Can't run both queue systems simultaneously. → Deploy as a single cutover. Drain existing `queue_jobs` (let pending jobs complete or manually re-enqueue post-migration).
- **[bull-board auth boundary]** → bull-board serves static assets and API routes that must all be behind auth. → Wrap the H3Adapter handler with token validation middleware before mounting.
