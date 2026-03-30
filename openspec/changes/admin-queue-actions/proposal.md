## Why

The admin queue dashboard is read-only — when jobs fail or feeds need re-polling, there's no way to act from the panel. Admins must SSH in or use a REPL to dispatch jobs manually. Adding curated actions lets the admin retry failed jobs, trigger feed polling, and reprocess episodes directly from the dashboard.

## What Changes

- Add a `POST /api/admin/queue/dispatch` endpoint accepting typed actions: retry a failed job, poll feeds, or reprocess an episode from a chosen pipeline stage
- Add a "Quick Actions" panel to the queue dashboard with:
  - "Poll All Feeds" button (with confirmation)
  - "Reprocess Episode" form: episode ID + starting stage dropdown (download, transcribe, analyze)
- Add a "Retry" button on each failed job row in the jobs table
- Show transient success/error feedback after dispatching

## Capabilities

### New Capabilities

- `queue-actions`: Admin actions for dispatching jobs — retry failed jobs, poll feeds, and reprocess episodes from the queue dashboard

### Modified Capabilities

(none)

## Impact

- **Server**: New API route `server/api/admin/queue/dispatch.post.ts` — imports job classes and uses `Job.dispatch()` / `adapter.retryJob()`
- **Frontend**: Modified `app/pages/admin/queue.vue` — new quick actions panel, retry button on job rows, feedback messages
- **Auth**: Reuses existing admin token middleware (no changes needed)
- **Dependencies**: None — uses existing `@boringnode/queue` dispatch API
