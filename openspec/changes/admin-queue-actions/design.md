## Context

The admin queue dashboard (`/admin/queue`) already exists with read-only views: summary cards, schedules table, job list with status filter, and auto-refresh. Auth is handled by a server middleware checking `Authorization: Bearer <token>` on `/api/admin/**` routes. The queue system uses `@boringnode/queue` with PostgreSQL, and all 8 job classes are registered in the `02.queue.ts` plugin via `Locator.register()`.

Job dispatch is done via static `Job.dispatch(payload)` which returns a `{ jobId }`. The adapter also exposes `retryJob(jobId, queue)` for moving failed jobs back to pending.

## Goals / Non-Goals

**Goals:**

- Let the admin retry failed jobs with one click
- Let the admin trigger a feed poll on demand
- Let the admin reprocess an episode from a chosen pipeline stage
- Provide clear feedback on success/failure of dispatched actions

**Non-Goals:**

- Cancel or delete jobs (destructive actions deferred)
- Arbitrary job dispatch with raw JSON payloads
- Bulk actions (retry all failed, etc.)
- Job progress tracking or live logs

## Decisions

### 1. Single dispatch endpoint with typed actions

One `POST /api/admin/queue/dispatch` endpoint handles all three action types via a discriminated union on `action`:

```
{ action: "retry", jobId: string, queue: string }
{ action: "poll-feeds" }
{ action: "reprocess", episodeId: number, startFrom: "download" | "transcribe" | "analyze" }
```

**Why one endpoint?** All actions share auth, error handling, and response shape. Splitting into 3 endpoints would triple the boilerplate with no benefit.

**Why typed actions instead of generic dispatch?** The curated approach means we control exactly which jobs can be triggered and validate payloads server-side. No risk of an admin accidentally dispatching an invalid or dangerous payload.

### 2. Retry uses adapter.retryJob(), not re-dispatch

For failed jobs, `QueueManager.use().retryJob(jobId, queue)` moves the existing job record back to pending. This preserves the original job ID and retry count rather than creating a duplicate.

**Why not re-dispatch?** Re-dispatching creates a new job with a new ID. The original failed job would remain in the table as a stale record. `retryJob()` is the idiomatic approach.

### 3. Reprocess chains from starting point

When reprocessing an episode, the admin picks a starting stage. The endpoint dispatches only the first job in the sub-chain — each job already dispatches the next one on success:

- `download` → DownloadAudioJob (chains to preprocess → transcribe → analyze → ...)
- `transcribe` → TranscribeJob (chains to analyze → ...)
- `analyze` → AnalyzeJob (chains to resolve-entities → embed-chunks → invalidate-cache)

**Why not dispatch the entire chain?** The jobs already chain themselves. Dispatching multiple would create parallel execution of sequential work.

### 4. Confirmation on the frontend, not the server

"Poll All Feeds" and "Reprocess Episode" show a browser `confirm()` dialog before sending the request. The server doesn't enforce confirmation — it trusts that the admin middleware already gates access.

### 5. Inline feedback via transient banner

After dispatching, show a success/error message that auto-dismisses after 4 seconds. No toast library — a simple reactive `ref` and `setTimeout`.

## Risks / Trade-offs

- **[retryJob on non-failed jobs]** → The adapter may error if the job isn't in failed state. Mitigation: validate job status server-side before calling retryJob, return 400 if not failed.
- **[Reprocess without checking episode exists]** → Admin could type a bad episode ID. Mitigation: validate the episode exists in DB before dispatching.
- **[No rate limiting on dispatch]** → Admin could spam "Poll All Feeds." Acceptable risk for a single-user admin panel behind token auth.
