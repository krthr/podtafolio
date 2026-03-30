## Context

Podtafolio is a greenfield Nuxt 4 project. The goal is a public podcast discovery platform focused on Colombian content (news, politics, popular shows). Users search in natural language and receive AI-synthesized answers grounded in transcribed podcast content, similar to Perplexity. The platform also provides structured browsing through topic, entity, podcast, and episode pages.

The existing codebase is a bare Nuxt 4 scaffold with no application code yet.

## Goals / Non-Goals

**Goals:**

- Build an end-to-end pipeline from podcast discovery through transcription, analysis, and searchable storage
- Deliver a Perplexity-like search experience over Colombian podcast content
- Provide structured browsing via topic, entity, podcast, and episode pages
- Keep infrastructure manageable for a single-developer project at launch scale (~20 podcasts, ~60 episodes/week)

**Non-Goals:**

- User accounts, authentication, or personalization
- Real-time feed updates or websocket-based notifications
- Auto-discovery of new podcasts (curated + manual seeding only for MVP)
- Audio-level ad detection (LLM-based post-transcription only)
- Wikidata or external knowledge base linking
- Multi-language UI (Spanish content, but UI language is a later decision)
- Public API for third-party consumers

## Decisions

### 1. Nuxt 4 SSR for the web layer

**Choice**: Server-side rendered Nuxt 4 application.

**Why**: SSR gives good SEO for topic/entity/episode pages (critical for organic discovery), fast initial loads, and server routes for API endpoints. Nuxt's server directory provides a natural place for the API layer without a separate backend.

**Alternatives considered**:

- SPA (Nuxt generate): Poor SEO, requires separate API server
- Separate backend (Fastify/Express) + Nuxt frontend: More infrastructure to manage for a single-developer project

### 2. PostgreSQL + pgvector as the primary database

**Choice**: PostgreSQL with the pgvector extension for both relational data and vector embeddings.

**Why**: Single database for all data — podcasts, episodes, transcripts, entities, topics, embeddings, and the answer cache. pgvector handles cosine similarity search for both entity deduplication and semantic search. Avoids running a separate vector database.

**Alternatives considered**:

- SQLite + a vector DB (Qdrant, Pinecone): Adds operational complexity with a separate service
- Supabase: Would work (has pgvector), but adds vendor coupling for what can run on a single Postgres instance

### 3. @boringnode/queue with SQLite for job orchestration

**Choice**: @boringnode/queue backed by SQLite for the ingest pipeline.

**Why**: Lightweight, no Redis dependency, runs in-process. The pipeline is sequential per episode (download → preprocess → transcribe → analyze → embed) and the volume (~60 jobs/week) doesn't require a distributed queue. SQLite is sufficient and keeps the deployment simple.

**Alternatives considered**:

- BullMQ (Redis): Overkill for this volume, adds Redis dependency
- Simple cron + sequential processing: No retry logic, no job visibility, harder to debug failures

### 4. Groq Whisper for transcription

**Choice**: Groq's Whisper API for audio-to-text.

**Why**: Fast (~10x realtime), affordable, good Spanish language support. The 25MB direct upload limit is manageable with ffmpeg preprocessing (mono/16kHz/opus reduces most episodes to under 25MB). For larger files, Groq accepts an external URL.

**Alternatives considered**:

- Self-hosted Whisper (faster-whisper): Free but requires GPU infrastructure
- OpenAI Whisper API: Slower, similar pricing
- Deepgram: Good quality but higher cost for Spanish

### 5. Vercel AI SDK as the unified LLM interface

**Choice**: Use the Vercel AI SDK (`ai` + `@ai-sdk/google`) as the abstraction layer for all LLM interactions, with Gemini Flash for pipeline batch processing and Gemini Pro for user-facing answer synthesis.

**Why**: The Vercel AI SDK provides a unified interface for text generation, structured output (via `generateObject`), embeddings, and streaming. It abstracts provider-specific APIs, making it easy to swap models later. `generateObject` with Zod schemas is particularly valuable for the analysis pipeline where we need structured JSON output (topics, entities, summaries) from Gemini. The SDK also handles streaming for the search synthesis UX.

**Alternatives considered**:

- Direct `@google/generative-ai` SDK: Works but couples all code to Google's API. No structured output helpers, manual JSON parsing.
- LangChain: Heavier abstraction with more overhead than needed for this use case
- Single model for everything: Either too expensive (Pro for batch) or too low quality (Flash for synthesis)
- Local models (Ollama): Quality not sufficient for entity extraction in Spanish

### 6. ffmpeg preprocessing before transcription

**Choice**: Convert audio to mono, 16kHz, opus at 32kbps before sending to Groq.

**Why**: Whisper internally converts to 16kHz mono anyway. Preprocessing reduces upload size by ~5x, making most episodes fit under Groq's 25MB limit and reducing upload time. The quality loss is irrelevant since Whisper discards the extra information.

### 7. Semantic answer cache with topic-aware invalidation

**Choice**: Cache AI-synthesized search answers in PostgreSQL with pgvector embeddings. Invalidate when new episodes with overlapping topics are processed. 24h TTL as safety net.

**Why**: AI synthesis is the most expensive and slowest operation in the search flow. Semantic caching (vector similarity on the query embedding) means semantically similar queries hit the same cache entry. Topic-aware invalidation ensures answers stay fresh when new relevant content arrives without waiting for TTL expiry.

**Alternatives considered**:

- Exact-match query cache: Misses semantic duplicates ("reforma pensional" vs "pension reform")
- TTL-only: Stale answers for up to 24h after relevant new content
- Pre-compute answers for all topics: Too expensive, most won't be queried

### 8. Entity resolution via pgvector + LLM

**Choice**: Embed entity mentions using Vercel AI SDK's `embed` function, use pgvector cosine similarity to find candidates, then use Gemini Flash (via `generateObject`) to confirm match or create new canonical entity.

**Why**: Pure string matching fails on aliases ("Petro" vs "el presidente"). Pure LLM is expensive for every mention. The hybrid approach uses cheap vector search to narrow candidates, then uses the LLM only for ambiguous cases. The Vercel AI SDK unifies both the embedding and generation calls under a single API.

### 9. Object storage for all audio files

**Choice**: Always upload preprocessed audio to object storage (Cloudflare R2 or S3-compatible), regardless of file size.

**Why**: Simplifies the transcription step — Groq always receives a URL rather than branching between direct upload and URL-based transcription. Storing all audio also enables re-processing if the pipeline improves. R2 has no egress fees, so the cost is negligible.

### 10. Apple iTunes API + Podcast Index for discovery

**Choice**: Use both Apple's iTunes Search API and Podcast Index for finding Colombian podcasts, supplemented by a manually curated seed list.

**Why**: Apple has the largest podcast directory and supports country-scoped search (country=CO). Podcast Index provides open RSS feed URLs and additional metadata. Neither is complete for Colombian content, so manual curation fills the gaps.

## Risks / Trade-offs

**[Groq API reliability]** → Groq is relatively new; API stability is uncertain for production workloads. **Mitigation**: The queue has retry logic. If Groq has prolonged outages, transcription jobs queue up and process when service returns. Consider adding OpenAI Whisper as a fallback path later.

**[Gemini quality for Colombian Spanish]** → Entity extraction and ad detection quality depends on Gemini's proficiency with Colombian Spanish idioms and political context. **Mitigation**: Test with a sample of 10 episodes from different podcasts before committing. Tune prompts with Colombian-specific examples.

**[Dynamic ad insertion variability]** → LLM-based ad detection may miss some ads or incorrectly flag content as ads. **Mitigation**: Err on the side of keeping content (false negatives are better than false positives). Mark detected ads as "likely_ad" rather than deleting, so they can be reviewed.

**[Entity resolution drift]** → Over time, the entity table could accumulate near-duplicates if the similarity threshold is too loose, or miss valid aliases if too tight. **Mitigation**: Start conservative (high similarity threshold), monitor duplicate rates, adjust. Add a manual merge/split UI later if needed.

**[Cost at scale]** → At 20 podcasts the costs are trivial (~$25/week). Scaling to 200+ podcasts would multiply Groq and Gemini API costs significantly. **Mitigation**: Monitor costs per episode. The preprocessing step keeps Groq costs low. Consider batch Gemini API pricing for high volume.

**[Single server dependency]** → The job queue runs in-process, meaning the Nuxt server must be running for episode processing. **Mitigation**: Acceptable for MVP. If the server restarts, SQLite-backed queue preserves pending jobs. For scale, extract the worker to a separate process.

## Data Model (high-level)

```
podcasts
  id, title, slug, feed_url, apple_id, podcast_index_id,
  artwork_url, description, language, created_at

episodes
  id, podcast_id, title, slug, guid, audio_url, audio_storage_key,
  duration_seconds, published_at, enclosure_url, content_length,
  status (pending|processing|done|failed), created_at

transcripts
  id, episode_id, raw_text, clean_text (ads stripped),
  created_at

transcript_chunks
  id, transcript_id, episode_id, chunk_index, text,
  embedding (vector), start_offset, end_offset

topics
  id, name, slug, description, embedding (vector), episode_count

entities
  id, canonical_name, slug, type (person|org|place|event|other),
  aliases (text[]), description, embedding (vector), mention_count

episode_topics
  episode_id, topic_id, relevance_score

episode_entities
  episode_id, entity_id, mention_count, context_snippets (jsonb)

episode_summaries
  id, episode_id, summary_text, key_points (jsonb)

answer_cache
  id, query_text, query_embedding (vector), answer_text,
  source_episode_ids (int[]), topic_ids (int[]),
  created_at, expires_at
```

## Migration Plan

Not applicable — greenfield project. Initial deployment requires:

1. PostgreSQL instance with pgvector extension enabled
2. Object storage bucket configured (R2/S3)
3. Environment variables for Groq, Gemini, Podcast Index API keys
4. ffmpeg installed on the server
5. Seed the podcast registry with initial curated list
6. Run initial backfill of existing episodes

## Open Questions

1. **Embedding model**: Which model to use for transcript chunk and query embeddings via Vercel AI SDK's `embed`/`embedMany`? Options: Gemini's text-embedding, OpenAI's text-embedding-3-small, or a local model. Needs to balance cost, quality for Spanish text, and dimensionality for pgvector performance.
2. **Chunk size strategy**: How to split transcripts for embedding — fixed token windows, sentence boundaries, or topic-based segments? Affects search retrieval quality.
3. **UI language**: Should the interface be in Spanish (matching content) or English (broader reach) or bilingual?
4. **Hosting**: Where to deploy — a VPS (Hetzner, DigitalOcean), a PaaS (Railway, Render), or cloud (AWS/GCP)? Needs to support long-running processes for the queue worker.
