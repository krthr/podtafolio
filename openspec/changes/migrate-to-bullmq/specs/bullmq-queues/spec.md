## ADDED Requirements

### Requirement: Redis connection configuration

The system SHALL read Redis connection details from `NUXT_REDIS_URL` runtime config and provide a shared connection configuration object used by all queues and workers.

#### Scenario: Redis URL configured

- **WHEN** the server starts with `NUXT_REDIS_URL` set
- **THEN** all BullMQ queues and workers connect to that Redis instance

#### Scenario: Redis URL missing

- **WHEN** the server starts without `NUXT_REDIS_URL`
- **THEN** the queue plugin SHALL log an error and skip queue initialization (server still starts for frontend-only dev)

### Requirement: Dedicated queue per job type

The system SHALL create 8 separate BullMQ queues, one per pipeline stage: `feed-poll`, `download`, `preprocess`, `transcribe`, `analyze`, `resolve-entities`, `embed-chunks`, `invalidate-cache`.

#### Scenario: Queue creation on startup

- **WHEN** the queue plugin initializes
- **THEN** all 8 Queue instances are created with the shared Redis connection

### Requirement: Per-queue worker with configurable concurrency

Each queue SHALL have a dedicated Worker with concurrency configured per queue type. Default concurrency values: feed-poll=1, download=3, preprocess=2, transcribe=1, analyze=2, resolve-entities=2, embed-chunks=2, invalidate-cache=3.

#### Scenario: Workers start processing

- **WHEN** the queue plugin initializes
- **THEN** 8 Workers start, each listening on its respective queue with its configured concurrency

### Requirement: Job chaining via manual dispatch

Each processor function SHALL dispatch the next pipeline stage by adding a job to the appropriate queue. The chain is: feed-poll → download → preprocess → transcribe → analyze → resolve-entities → embed-chunks → invalidate-cache.

#### Scenario: Successful stage completion triggers next stage

- **WHEN** a transcribe job completes successfully
- **THEN** a new job is added to the `analyze` queue with `{ episodeId }` payload

#### Scenario: Feed poll dispatches multiple downloads

- **WHEN** a feed-poll job discovers 3 new episodes
- **THEN** 3 separate jobs are added to the `download` queue

### Requirement: Retry policy with exponential backoff

All jobs SHALL be configured with 5 retry attempts using exponential backoff starting at 10 seconds, maxing at 10 minutes, with a 2x multiplier.

#### Scenario: Job fails and retries

- **WHEN** a job throws an error
- **THEN** it is retried up to 5 times with increasing delays (10s, 20s, 40s, 80s, 160s capped at 600s)

### Requirement: Repeatable feed-poll cron schedule

The system SHALL register a repeatable job on the `feed-poll` queue that runs daily at 03:00 UTC.

#### Scenario: Cron triggers daily

- **WHEN** the clock reaches 03:00 UTC
- **THEN** a new feed-poll job with empty payload is added to the `feed-poll` queue

#### Scenario: Repeatable job registered on startup

- **WHEN** the queue plugin initializes
- **THEN** the repeatable job is upserted (not duplicated on restart)

### Requirement: Job retention policy

Completed jobs SHALL be retained for 7 days. Failed jobs SHALL be retained for 30 days. Jobs beyond retention are automatically removed by BullMQ.

#### Scenario: Completed job cleanup

- **WHEN** a completed job is older than 7 days
- **THEN** it is removed from Redis

### Requirement: Graceful shutdown

On server shutdown, all workers SHALL stop accepting new jobs and wait for in-progress jobs to complete before closing Redis connections.

#### Scenario: Server receives shutdown signal

- **WHEN** the Nitro `close` hook fires
- **THEN** all 8 workers are closed gracefully, then all queue instances are closed

### Requirement: Queue registry

A central module SHALL export all Queue instances and a name-to-queue map, serving as the single source of truth for queue access across the application.

#### Scenario: Dispatch API adds a job

- **WHEN** the dispatch API needs to add a job to the `download` queue
- **THEN** it imports the queue instance from the registry module
