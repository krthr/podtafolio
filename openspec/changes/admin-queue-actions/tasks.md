## 1. Dispatch API Endpoint

- [x] 1.1 Create `server/api/admin/queue/dispatch.post.ts` with action discriminator and shared response shape
- [x] 1.2 Implement `retry` action — validate job is failed via `adapter.getJob()`, then call `adapter.retryJob()`
- [x] 1.3 Implement `poll-feeds` action — dispatch `FeedPollJob` with empty payload
- [x] 1.4 Implement `reprocess` action — validate episode exists, dispatch the appropriate job based on `startFrom` (download, transcribe, analyze)

## 2. Frontend — Quick Actions Panel

- [x] 2.1 Add quick actions section to `app/pages/admin/queue.vue` between summary cards and schedules
- [x] 2.2 Add "Poll All Feeds" button with `confirm()` dialog before dispatching
- [x] 2.3 Add "Reprocess Episode" form with episode ID input and starting stage dropdown (download, transcribe, analyze)

## 3. Frontend — Retry Button

- [x] 3.1 Add "Retry" button to job table rows where status is `failed`
- [x] 3.2 Wire retry button to POST the `retry` action with job ID and queue

## 4. Frontend — Feedback

- [x] 4.1 Add transient success/error banner with auto-dismiss after 4 seconds
- [x] 4.2 Show feedback after all dispatch actions (poll, reprocess, retry)
