## ADDED Requirements

### Requirement: Landing page displays trending topics and recent episodes
The system SHALL render a landing page at `/` showing trending topics (by recent episode count) and the most recently processed episodes.

#### Scenario: Landing page with content
- **WHEN** a user visits `/`
- **THEN** the system SHALL display a list of trending topics (ordered by episode count in the last 7 days) and the most recent processed episodes with their podcast name, title, summary, and published date

#### Scenario: Landing page with no content
- **WHEN** a user visits `/` and no episodes have been processed yet
- **THEN** the system SHALL display a message indicating content is being prepared, along with the search bar

### Requirement: Search page provides AI-synthesized answers
The system SHALL render a search page at `/search` that accepts a query parameter and displays an AI-synthesized answer with source citations.

#### Scenario: Search with results
- **WHEN** a user visits `/search?q=reforma pensional`
- **THEN** the system SHALL display the synthesized answer, a list of source episodes cited in the answer, and links to related topic and entity pages

#### Scenario: Search with no results
- **WHEN** a user searches for a topic with no matching content
- **THEN** the system SHALL display a message indicating no relevant podcast content was found and suggest browsing trending topics

### Requirement: Topic pages display comprehensive topic information
The system SHALL render topic pages at `/topic/:slug` showing all episodes related to a topic, associated entities, and a topic description.

#### Scenario: Topic page rendering
- **WHEN** a user visits `/topic/reforma-pensional`
- **THEN** the system SHALL display the topic name, description, a list of related episodes (ordered by published date), related entities mentioned alongside this topic, and episode count

#### Scenario: Topic not found
- **WHEN** a user visits `/topic/:slug` with a slug that does not exist
- **THEN** the system SHALL return a 404 page

### Requirement: Entity pages display entity information and mentions
The system SHALL render entity pages at `/entity/:slug` showing entity details, known aliases, and all episodes where the entity is mentioned.

#### Scenario: Entity page rendering
- **WHEN** a user visits `/entity/gustavo-petro`
- **THEN** the system SHALL display the entity canonical name, type, aliases, a list of episodes mentioning this entity with context snippets, and related topics

#### Scenario: Entity not found
- **WHEN** a user visits `/entity/:slug` with a slug that does not exist
- **THEN** the system SHALL return a 404 page

### Requirement: Podcast pages display podcast details and episodes
The system SHALL render podcast pages at `/podcast/:slug` showing podcast metadata and a list of its processed episodes.

#### Scenario: Podcast page rendering
- **WHEN** a user visits `/podcast/la-w-radio`
- **THEN** the system SHALL display the podcast title, artwork, description, and a list of its episodes with summaries, topics, and published dates

### Requirement: Episode pages display full episode details
The system SHALL render episode pages at `/episode/:slug` showing the episode summary, key points, full clean transcript, extracted topics, and mentioned entities.

#### Scenario: Episode page rendering
- **WHEN** a user visits `/episode/la-w-2024-03-15-reforma`
- **THEN** the system SHALL display the episode title, podcast name, published date, summary, key points, the clean transcript text, a list of extracted topics, and a list of mentioned entities with context snippets

### Requirement: All pages include a persistent search bar
The system SHALL include a search input on every page that allows users to perform a new search from any page.

#### Scenario: Search from any page
- **WHEN** a user enters a query in the search bar from any page
- **THEN** the system SHALL navigate to `/search?q=<query>` with the entered query
