## ADDED Requirements

### Requirement: bull-board dashboard mounted on H3

The system SHALL mount the bull-board UI using `@bull-board/h3` `H3Adapter` at the path `/admin/queue/board`.

#### Scenario: Accessing the dashboard

- **WHEN** an authenticated user navigates to `/admin/queue/board`
- **THEN** the bull-board UI is rendered showing all 8 queues

#### Scenario: Dashboard shows all queues

- **WHEN** the dashboard loads
- **THEN** all 8 queues (feed-poll, download, preprocess, transcribe, analyze, resolve-entities, embed-chunks, invalidate-cache) are listed with their job counts

### Requirement: Token-based authentication for bull-board

All bull-board routes SHALL be protected by the same token authentication used for admin APIs. The token is provided via `Authorization: Bearer <token>` header or `?token=<token>` query parameter to support browser access.

#### Scenario: Valid token via header

- **WHEN** a request to `/admin/queue/board` includes a valid Bearer token
- **THEN** the bull-board UI is served

#### Scenario: Valid token via query parameter

- **WHEN** a request to `/admin/queue/board?token=<valid>` is made
- **THEN** the bull-board UI is served (enables browser bookmark access)

#### Scenario: Missing or invalid token

- **WHEN** a request to `/admin/queue/board` has no token or an invalid token
- **THEN** the server responds with 401 Unauthorized

### Requirement: Custom dispatch actions preserved

The dispatch API at `/api/admin/queue/dispatch` SHALL continue to support `poll-feeds` and `reprocess` actions, using BullMQ queue instances to add jobs.

#### Scenario: Poll feeds dispatch

- **WHEN** a POST to `/api/admin/queue/dispatch` with `{ action: "poll-feeds" }` is received
- **THEN** a job is added to the `feed-poll` queue and the job ID is returned

#### Scenario: Reprocess episode dispatch

- **WHEN** a POST with `{ action: "reprocess", episodeId: 42, startFrom: "transcribe" }` is received
- **THEN** a job is added to the `transcribe` queue with `{ episodeId: 42 }` and the job ID is returned

### Requirement: Retry action removed from dispatch API

The `retry` action SHALL be removed from the dispatch API. Job retries are handled natively through the bull-board UI.

#### Scenario: Retry action rejected

- **WHEN** a POST with `{ action: "retry" }` is received
- **THEN** the server responds with 400 and error "Unknown action"

### Requirement: Custom admin page removed

The Vue admin page at `app/pages/admin/queue.vue` and the queue stats API at `server/api/admin/queue.get.ts` SHALL be removed, replaced entirely by bull-board.

#### Scenario: Old dashboard URL

- **WHEN** a user navigates to `/admin/queue`
- **THEN** the page is no longer served (404 or redirect to bull-board)
