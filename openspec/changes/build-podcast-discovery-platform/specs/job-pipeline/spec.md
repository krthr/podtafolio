## ADDED Requirements

### Requirement: System orchestrates episode processing through a job queue
The system SHALL use @boringnode/queue backed by SQLite to orchestrate the episode processing pipeline with discrete job types for each stage.

#### Scenario: New episode triggers pipeline
- **WHEN** a new episode is detected during feed polling
- **THEN** the system SHALL enqueue a download job, which upon completion triggers subsequent jobs: preprocess → transcribe → analyze → resolve-entities → embed-chunks

#### Scenario: Job stages execute sequentially per episode
- **WHEN** a download job completes for an episode
- **THEN** the system SHALL enqueue the preprocess job, and each subsequent stage SHALL only be enqueued after the previous stage completes successfully

### Requirement: System retries failed jobs
The system SHALL automatically retry failed jobs according to a configured retry policy with exponential backoff.

#### Scenario: Transient failure retry
- **WHEN** a job fails due to a transient error (API timeout, network error)
- **THEN** the system SHALL retry the job up to the configured maximum attempts with exponential backoff

#### Scenario: Permanent failure
- **WHEN** a job exceeds the maximum retry attempts
- **THEN** the system SHALL mark the episode status as "failed" and stop retrying

### Requirement: System runs daily feed polling as a scheduled job
The system SHALL execute a feed polling job once per day that checks all registered podcast feeds for new episodes.

#### Scenario: Daily cron trigger
- **WHEN** the configured daily schedule time is reached
- **THEN** the system SHALL enqueue a feed-poll job that iterates over all registered podcasts and checks their feeds

### Requirement: System invalidates answer cache after episode processing
The system SHALL invalidate relevant answer_cache entries as the final step of the episode processing pipeline.

#### Scenario: Cache invalidation after processing
- **WHEN** the embed-chunks stage completes for an episode (final pipeline stage)
- **THEN** the system SHALL delete answer_cache entries whose topic_ids overlap with the episode's extracted topic_ids
