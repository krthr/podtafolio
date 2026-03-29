## ADDED Requirements

### Requirement: System deduplicates entities using vector similarity
The system SHALL embed each extracted entity mention and compare it against existing entities in pgvector to detect duplicates and aliases.

#### Scenario: Entity matches existing canonical entity
- **WHEN** an extracted entity's embedding has cosine similarity above the configured threshold with an existing entity
- **THEN** the system SHALL link the episode to the existing entity and add the mention as an alias if not already present

#### Scenario: No similar entity exists
- **WHEN** an extracted entity's embedding has no match above the similarity threshold
- **THEN** the system SHALL create a new canonical entity with the suggested name, type, slug, and embedding

#### Scenario: Ambiguous match requires LLM confirmation
- **WHEN** an extracted entity's embedding has a match in the borderline similarity range (between a lower and upper threshold)
- **THEN** the system SHALL use Gemini Flash to confirm whether the mention refers to the same entity or is a distinct one

### Requirement: System maintains canonical entities with aliases
The system SHALL store entities with a canonical_name and an array of known aliases. The canonical_name SHALL be the most common or formal form of the entity name.

#### Scenario: Alias added to existing entity
- **WHEN** the system confirms that "el presidente" refers to the existing entity "Gustavo Petro"
- **THEN** the system SHALL add "el presidente" to the aliases array of the "Gustavo Petro" entity

#### Scenario: Entity slug generation
- **WHEN** a new canonical entity is created
- **THEN** the system SHALL generate a URL-safe slug from the canonical_name (e.g., "Gustavo Petro" → "gustavo-petro")
