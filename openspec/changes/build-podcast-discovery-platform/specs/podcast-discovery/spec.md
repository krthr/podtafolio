## ADDED Requirements

### Requirement: System can register podcasts from Apple iTunes API
The system SHALL search the Apple iTunes Search API for podcasts by country (CO), genre, and search term, and register discovered podcasts in the database with their feed URLs.

#### Scenario: Discover Colombian news podcasts
- **WHEN** the system searches Apple iTunes API with term "noticias" and country "CO"
- **THEN** the system SHALL store each result as a podcast record with title, feed_url, apple_id, artwork_url, and description

#### Scenario: Avoid duplicate podcast registration
- **WHEN** a podcast with the same feed_url already exists in the database
- **THEN** the system SHALL skip registration and not create a duplicate record

### Requirement: System can register podcasts from Podcast Index
The system SHALL query the Podcast Index API using the podcastindex npm package to search for and register podcasts by term or category.

#### Scenario: Search Podcast Index by term
- **WHEN** the system searches Podcast Index for "colombia politica"
- **THEN** the system SHALL store each result as a podcast record with title, feed_url, podcast_index_id, and available metadata

### Requirement: System supports manually seeded podcasts
The system SHALL accept manually provided podcast feed URLs and register them in the database.

#### Scenario: Add a podcast by feed URL
- **WHEN** a feed URL is provided manually (e.g., via a seed script or admin endpoint)
- **THEN** the system SHALL fetch the feed, parse podcast metadata, and create a podcast record

### Requirement: System polls feeds daily for new episodes
The system SHALL check all registered podcast feeds once per day and detect new episodes that are not yet in the database.

#### Scenario: New episode detected in feed
- **WHEN** the daily feed poll finds an episode whose guid does not exist in the episodes table
- **THEN** the system SHALL create a new episode record with status "pending" and enqueue it for processing

#### Scenario: No new episodes
- **WHEN** the daily feed poll finds no new episodes for a podcast
- **THEN** the system SHALL not create any new records or jobs for that podcast
