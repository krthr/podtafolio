## ADDED Requirements

### Requirement: Queue dashboard API endpoint
The system SHALL expose `GET /api/admin/queue` returning a JSON object with `summary`, `jobs`, and `schedules` fields.

#### Scenario: Summary data
- **WHEN** the endpoint is called
- **THEN** `summary` SHALL be an array of `{ status, count }` objects representing job counts grouped by status (pending, active, delayed, completed, failed)

#### Scenario: Jobs list
- **WHEN** the endpoint is called
- **THEN** `jobs` SHALL be an array of the 100 most recent job records, ordered newest first, each containing: `id`, `queue`, `status`, `jobName` (parsed from `data` JSON), `workerBd`, `acquiredAt`, `executeAt`, `finishedAt`, `error`

#### Scenario: Jobs filtered by status
- **WHEN** the endpoint is called with query parameter `status` (e.g., `?status=failed`)
- **THEN** `jobs` SHALL contain only jobs matching that status

#### Scenario: Schedules list
- **WHEN** the endpoint is called
- **THEN** `schedules` SHALL be an array of all schedule records from `queue_schedules`

### Requirement: Queue dashboard page
The system SHALL render an admin page at `/admin/queue` using a dedicated admin layout.

#### Scenario: Summary cards displayed
- **WHEN** the page loads
- **THEN** it SHALL display status cards showing job counts for each status (pending, active, delayed, completed, failed)

#### Scenario: Schedules section displayed
- **WHEN** schedules exist
- **THEN** the page SHALL display each schedule's id, cron expression, status, last run time, and next run time

#### Scenario: Job table displayed
- **WHEN** jobs exist
- **THEN** the page SHALL display a table with columns: status, job name, queue, timestamps, and error (truncated)

#### Scenario: Status filter
- **WHEN** the user selects a status filter
- **THEN** the job table SHALL show only jobs with that status

### Requirement: Auto-refresh
The page SHALL poll `GET /api/admin/queue` every 5 seconds to provide near-real-time updates.

#### Scenario: Polling active
- **WHEN** the page is loaded and auto-refresh is enabled
- **THEN** the dashboard data SHALL refresh every 5 seconds

#### Scenario: Polling paused
- **WHEN** the user toggles auto-refresh off
- **THEN** polling SHALL stop until re-enabled

### Requirement: Admin layout
The system SHALL provide a dedicated layout for admin pages with minimal chrome.

#### Scenario: Admin layout renders
- **WHEN** an admin page loads
- **THEN** it SHALL display a header with "Podtafolio Admin" text, a link back to the public site, and no search bar
