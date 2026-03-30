## ADDED Requirements

### Requirement: Admin token configuration
The system SHALL accept an `adminToken` runtime config value. When set, it serves as the shared secret for authenticating admin API requests.

#### Scenario: Token configured via environment
- **WHEN** `NUXT_ADMIN_TOKEN` environment variable is set
- **THEN** the runtime config `adminToken` SHALL contain that value

### Requirement: Admin API route protection
The system SHALL protect all server routes matching `/api/admin/**` with token authentication via a server middleware.

#### Scenario: Valid token provided
- **WHEN** a request to `/api/admin/*` includes header `Authorization: Bearer <token>` matching `adminToken`
- **THEN** the request SHALL proceed to the route handler

#### Scenario: Missing or invalid token
- **WHEN** a request to `/api/admin/*` has no `Authorization` header or the token does not match `adminToken`
- **THEN** the server SHALL respond with HTTP 401 and body `{ "error": "Unauthorized" }`

#### Scenario: Non-admin routes unaffected
- **WHEN** a request targets a route NOT matching `/api/admin/**`
- **THEN** the middleware SHALL not interfere with the request

### Requirement: Frontend token prompt
The admin page SHALL prompt the user for a token on first visit and store it in `sessionStorage` for subsequent requests within the session.

#### Scenario: No stored token
- **WHEN** the user navigates to `/admin/queue` and no token is in `sessionStorage`
- **THEN** the page SHALL display a token input form before showing dashboard content

#### Scenario: Stored token is invalid
- **WHEN** the API returns 401
- **THEN** the page SHALL clear the stored token and re-display the token input form
