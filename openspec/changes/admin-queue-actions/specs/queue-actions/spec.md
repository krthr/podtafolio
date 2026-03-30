## ADDED Requirements

### Requirement: Dispatch endpoint

The system SHALL expose `POST /api/admin/queue/dispatch` accepting a JSON body with an `action` field that determines the operation.

#### Scenario: Retry a failed job

- **WHEN** the body is `{ "action": "retry", "jobId": "<id>", "queue": "<queue>" }` and the job exists with status `failed`
- **THEN** the system SHALL move the job back to pending via `adapter.retryJob()` and return `{ "ok": true, "message": "Job retried" }`

#### Scenario: Retry a non-failed job

- **WHEN** the body is `{ "action": "retry", "jobId": "<id>", "queue": "<queue>" }` and the job status is not `failed`
- **THEN** the system SHALL return HTTP 400 with `{ "error": "Job is not in failed state" }`

#### Scenario: Poll all feeds

- **WHEN** the body is `{ "action": "poll-feeds" }`
- **THEN** the system SHALL dispatch a `FeedPollJob` with empty payload and return `{ "ok": true, "jobId": "<id>", "message": "Feed poll dispatched" }`

#### Scenario: Reprocess episode from download

- **WHEN** the body is `{ "action": "reprocess", "episodeId": 123, "startFrom": "download" }` and the episode exists
- **THEN** the system SHALL dispatch a `DownloadAudioJob` with the episode's ID and enclosure URL, and return `{ "ok": true, "jobId": "<id>", "message": "Reprocessing from download" }`

#### Scenario: Reprocess episode from transcribe

- **WHEN** the body is `{ "action": "reprocess", "episodeId": 123, "startFrom": "transcribe" }`and the episode exists
- **THEN** the system SHALL dispatch a `TranscribeJob` with the episode's ID and return `{ "ok": true, "jobId": "<id>", "message": "Reprocessing from transcribe" }`

#### Scenario: Reprocess episode from analyze

- **WHEN** the body is `{ "action": "reprocess", "episodeId": 123, "startFrom": "analyze" }` and the episode exists
- **THEN** the system SHALL dispatch an `AnalyzeJob` with the episode's ID and return `{ "ok": true, "jobId": "<id>", "message": "Reprocessing from analyze" }`

#### Scenario: Reprocess with invalid episode ID

- **WHEN** the body is `{ "action": "reprocess", "episodeId": 999, "startFrom": "download" }` and the episode does not exist
- **THEN** the system SHALL return HTTP 404 with `{ "error": "Episode not found" }`

#### Scenario: Unknown action

- **WHEN** the body contains an unrecognized `action` value
- **THEN** the system SHALL return HTTP 400 with `{ "error": "Unknown action" }`

### Requirement: Quick actions panel

The queue dashboard page SHALL display a "Quick Actions" section between the summary cards and the schedules section.

#### Scenario: Poll feeds button

- **WHEN** the admin clicks "Poll All Feeds"
- **THEN** the page SHALL show a confirmation dialog, and on confirm, POST the `poll-feeds` action to the dispatch endpoint

#### Scenario: Reprocess episode form

- **WHEN** the admin enters an episode ID, selects a starting stage from a dropdown (download, transcribe, analyze), and clicks "Go"
- **THEN** the page SHALL POST the `reprocess` action with the episode ID and starting stage to the dispatch endpoint

### Requirement: Retry button on failed jobs

The jobs table SHALL display a "Retry" button on each row where the job status is `failed`.

#### Scenario: Retry button clicked

- **WHEN** the admin clicks "Retry" on a failed job row
- **THEN** the page SHALL POST the `retry` action with the job's ID and queue to the dispatch endpoint

#### Scenario: Retry button not shown for non-failed jobs

- **WHEN** a job's status is not `failed`
- **THEN** no "Retry" button SHALL be displayed for that row

### Requirement: Action feedback

The page SHALL display transient feedback after dispatching an action.

#### Scenario: Successful dispatch

- **WHEN** the dispatch endpoint returns a success response
- **THEN** the page SHALL show a success message that auto-dismisses after 4 seconds

#### Scenario: Failed dispatch

- **WHEN** the dispatch endpoint returns an error response
- **THEN** the page SHALL show an error message that auto-dismisses after 4 seconds
