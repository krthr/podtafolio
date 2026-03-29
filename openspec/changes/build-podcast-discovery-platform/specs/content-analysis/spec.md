## ADDED Requirements

### Requirement: System strips ads from transcripts
The system SHALL use Gemini Flash via Vercel AI SDK to identify and remove advertisement segments from the raw transcript, producing a clean transcript.

#### Scenario: Transcript with ads
- **WHEN** a raw transcript contains ad segments (e.g., sponsor reads, promotional language like "este episodio es presentado por...")
- **THEN** the system SHALL identify those segments, mark them as likely_ad, and produce a clean_text version with ad segments removed

#### Scenario: Transcript without ads
- **WHEN** a raw transcript contains no identifiable ad segments
- **THEN** the system SHALL set clean_text equal to raw_text

### Requirement: System extracts topics from transcripts
The system SHALL use Gemini Flash via Vercel AI SDK to extract the main topics discussed in each episode from the clean transcript.

#### Scenario: Topic extraction
- **WHEN** a clean transcript is available for an episode
- **THEN** the system SHALL extract a list of topics with names and relevance scores, and create or link to existing topic records in the topics table

#### Scenario: Topic already exists
- **WHEN** an extracted topic name matches an existing topic in the database (case-insensitive)
- **THEN** the system SHALL link the episode to the existing topic rather than creating a duplicate

### Requirement: System extracts entities from transcripts
The system SHALL use Gemini Flash via Vercel AI SDK to extract named entities (people, organizations, places, events) from the clean transcript.

#### Scenario: Entity extraction
- **WHEN** a clean transcript is available for an episode
- **THEN** the system SHALL extract entities with their canonical name suggestion, type (person/org/place/event/other), mention count, and context snippets

### Requirement: System generates episode summaries
The system SHALL use Gemini Flash via Vercel AI SDK to generate a concise summary and key points for each episode from the clean transcript.

#### Scenario: Summary generation
- **WHEN** a clean transcript is available for an episode
- **THEN** the system SHALL generate a summary_text (2-3 paragraphs) and key_points (list of main takeaways) and store them in the episode_summaries table

### Requirement: System performs analysis in a single LLM pass
The system SHALL combine ad stripping, topic extraction, entity extraction, and summary generation into a single Gemini Flash call via Vercel AI SDK's `generateObject` with a Zod schema to minimize cost and latency and ensure structured output.

#### Scenario: Combined analysis pass
- **WHEN** a raw transcript is ready for analysis
- **THEN** the system SHALL send a single prompt to Gemini Flash via `generateObject` that returns ad segments, topics, entities, and summary as a validated structured object
