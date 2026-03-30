## ADDED Requirements

### Requirement: System chunks and embeds transcripts for vector search

The system SHALL split clean transcripts into chunks and generate vector embeddings for each chunk using Vercel AI SDK's `embedMany` function, stored in the transcript_chunks table with pgvector.

#### Scenario: Transcript chunking

- **WHEN** a clean transcript is available
- **THEN** the system SHALL split it into chunks (with overlap) and store each chunk with its text, embedding, chunk_index, and positional offsets

### Requirement: System supports semantic search over transcript chunks

The system SHALL accept a natural language query, embed it, and perform vector similarity search against transcript_chunks to find relevant content.

#### Scenario: Semantic search returns relevant chunks

- **WHEN** a user submits a search query
- **THEN** the system SHALL embed the query and return the top-K most similar transcript chunks from pgvector, ordered by cosine similarity

#### Scenario: Search includes metadata context

- **WHEN** search results are returned
- **THEN** each result SHALL include the episode title, podcast name, published date, and the chunk text with surrounding context

### Requirement: System synthesizes AI answers from search results

The system SHALL use Gemini Pro via Vercel AI SDK's `generateText` (or `streamText` for streaming UX) to synthesize a coherent answer from the top-K relevant transcript chunks, citing the source episodes.

#### Scenario: Answer synthesis

- **WHEN** relevant transcript chunks are retrieved for a query
- **THEN** the system SHALL send the chunks as context to Gemini Pro with the user's query and return a synthesized answer with source episode references

#### Scenario: No relevant results

- **WHEN** no transcript chunks have similarity above the minimum threshold for a query
- **THEN** the system SHALL return a message indicating no relevant podcast content was found, without calling Gemini Pro

### Requirement: System caches synthesized answers with semantic matching

The system SHALL cache synthesized answers in the answer_cache table with query embeddings, and serve cached answers for semantically similar queries.

#### Scenario: Cache hit on semantically similar query

- **WHEN** a new query's embedding has cosine similarity above the cache threshold with an existing cached answer, and the cached answer has not expired
- **THEN** the system SHALL return the cached answer without calling Gemini Pro

#### Scenario: Cache miss

- **WHEN** no cached answer matches the query embedding above the threshold
- **THEN** the system SHALL proceed with full search and synthesis, then cache the result

### Requirement: System invalidates cached answers when new content arrives

The system SHALL delete cached answers whose topic_ids overlap with newly processed episode topic_ids. A 24-hour TTL SHALL serve as a safety net for any entries not caught by topic-based invalidation.

#### Scenario: Topic-aware cache invalidation

- **WHEN** a new episode is processed and its topics are extracted
- **THEN** the system SHALL delete all answer_cache entries whose topic_ids array overlaps with the new episode's topic_ids

#### Scenario: TTL-based expiration

- **WHEN** a cached answer's created_at is more than 24 hours ago
- **THEN** the system SHALL not serve that cached answer regardless of topic overlap
