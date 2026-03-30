## 1. Dependencies & Configuration

- [x] 1.1 Install `bullmq`, `@bull-board/api`, `@bull-board/h3` and remove `@boringnode/queue` and its knex adapter from package.json
- [x] 1.2 Add `NUXT_REDIS_URL` to runtime config in `nuxt.config.ts`
- [x] 1.3 Rewrite `server/queue/config.ts` — export Redis connection config from `NUXT_REDIS_URL`, default job options (retry backoff, retention), and per-queue concurrency map

## 2. Queue Registry & Plugin

- [x] 2.1 Create `server/queue/queues.ts` — central registry that creates and exports all 8 BullMQ Queue instances with shared Redis config
- [x] 2.2 Rewrite `server/plugins/02.queue.ts` — create Workers for each queue, register repeatable feed-poll cron, set up graceful shutdown via Nitro close hook. Remove all `@boringnode/queue` imports and Locator/QueueManager/SchemaService usage

## 3. Rewrite Job Processors

- [x] 3.1 Rewrite `server/queue/jobs/feed-poll.ts` — export processor function, dispatch to `download` queue via registry
- [x] 3.2 Rewrite `server/queue/jobs/download-audio.ts` — export processor function, chain to `preprocess` queue
- [x] 3.3 Rewrite `server/queue/jobs/preprocess-audio.ts` — export processor function, chain to `transcribe` queue
- [x] 3.4 Rewrite `server/queue/jobs/transcribe.ts` — export processor function, chain to `analyze` queue
- [x] 3.5 Rewrite `server/queue/jobs/analyze.ts` — export processor function, chain to `resolve-entities` queue
- [x] 3.6 Rewrite `server/queue/jobs/resolve-entities.ts` — export processor function, chain to `embed-chunks` queue
- [x] 3.7 Rewrite `server/queue/jobs/embed-chunks.ts` — export processor function, chain to `invalidate-cache` queue
- [x] 3.8 Rewrite `server/queue/jobs/invalidate-cache.ts` — export processor function (terminal stage, no chaining)

## 4. bull-board Admin Dashboard

- [x] 4.1 Mount bull-board H3Adapter at `/admin/queue/board` with all 8 BullMQAdapter instances registered. Add token auth middleware protecting all bull-board routes (support both Bearer header and `?token=` query param)
- [x] 4.2 Delete `app/pages/admin/queue.vue` and `server/api/admin/queue.get.ts`

## 5. Update Dispatch API

- [x] 5.1 Rewrite `server/api/admin/queue/dispatch.post.ts` — use queue registry to add jobs, remove `retry` action, keep `poll-feeds` and `reprocess` actions

## 6. Cleanup

- [x] 6.1 Remove any remaining `@boringnode/queue` imports across the codebase
- [x] 6.2 Verify the app starts, queues connect to Redis, bull-board loads, and a manual feed-poll dispatch creates chained jobs
