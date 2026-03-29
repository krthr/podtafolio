## 1. Project Setup & Infrastructure

- [x] 1.1 Install core dependencies: podcastindex, @boringnode/queue, pg, drizzle-orm (or chosen ORM), ai (Vercel AI SDK), @ai-sdk/google, groq-sdk
- [x] 1.2 Configure Nuxt modules and runtime config for API keys (Groq, Gemini, Podcast Index, object storage)
- [x] 1.3 Set up PostgreSQL connection with pgvector extension enabled
- [x] 1.4 Set up object storage client (R2/S3) for audio file uploads
- [x] 1.5 Create the database schema: podcasts, episodes, transcripts, transcript_chunks, topics, entities, episode_topics, episode_entities, episode_summaries, answer_cache tables with pgvector columns
- [x] 1.6 Create database migrations for all tables

## 2. Job Pipeline Setup

- [x] 2.1 Configure @boringnode/queue with SQLite backing store
- [x] 2.2 Define job types: feed-poll, download-audio, preprocess-audio, transcribe, analyze, resolve-entities, embed-chunks, invalidate-cache
- [x] 2.3 Implement job chaining logic (each stage enqueues the next on success)
- [x] 2.4 Configure retry policy with exponential backoff for all job types
- [x] 2.5 Set up daily cron trigger for the feed-poll job

## 3. Podcast Discovery

- [x] 3.1 Implement Apple iTunes Search API client (search by country=CO, genre, term)
- [x] 3.2 Implement Podcast Index search client using the podcastindex npm package
- [x] 3.3 Implement podcast registration logic: parse feed metadata, create podcast record, deduplicate by feed_url
- [x] 3.4 Create a seed script that registers an initial curated list of ~20 Colombian podcasts
- [x] 3.5 Implement the feed-poll job: iterate all podcasts, parse RSS feeds, detect new episodes by guid, enqueue new episodes

## 4. Episode Ingestion

- [x] 4.1 Implement the download-audio job: fetch audio from enclosure URL, store Content-Length, save to temp directory
- [x] 4.2 Implement the preprocess-audio job: ffmpeg conversion to mono/16kHz/opus 32kbps
- [x] 4.3 Always upload preprocessed audio to object storage
- [x] 4.4 Implement episode change detection: compare enclosure URL and Content-Length on feed polls

## 5. Transcription

- [x] 5.1 Implement Groq Whisper API client with URL-based transcription via object storage
- [x] 5.2 Implement the transcribe job: send preprocessed audio to Groq, store raw transcript in transcripts table
- [x] 5.3 Handle Groq API errors and rate limits with appropriate retry behavior

## 6. Content Analysis

- [ ] 6.1 Design the combined analysis Zod schema and Gemini Flash prompt for single-pass analysis via Vercel AI SDK `generateObject` (ad stripping, topics, entities, summary)
- [ ] 6.2 Implement the analyze job: send raw transcript to Gemini Flash via Vercel AI SDK, receive validated structured response
- [ ] 6.3 Store clean_text (ads stripped) in transcripts table
- [ ] 6.4 Create/link topic records in topics table and episode_topics junction
- [ ] 6.5 Store extracted entities as raw mentions for the entity resolution step
- [ ] 6.6 Store episode summary and key points in episode_summaries table

## 7. Entity Resolution

- [ ] 7.1 Implement entity embedding: embed each extracted entity mention using Vercel AI SDK's `embed` function
- [ ] 7.2 Implement pgvector similarity search for existing entities with configurable threshold
- [ ] 7.3 Implement LLM confirmation for borderline matches using Gemini Flash via Vercel AI SDK `generateObject`
- [ ] 7.4 Implement canonical entity creation: canonical_name, slug, type, aliases array, embedding
- [ ] 7.5 Implement the resolve-entities job: process all raw mentions from the analyze step, link or create entities, populate episode_entities

## 8. Semantic Search & Embedding

- [ ] 8.1 Implement transcript chunking: split clean_text into overlapping chunks with positional offsets
- [ ] 8.2 Implement chunk embedding using Vercel AI SDK's `embedMany` function
- [ ] 8.3 Implement the embed-chunks job: chunk transcript, embed, store in transcript_chunks with pgvector
- [ ] 8.4 Implement the search API endpoint: embed query, pgvector similarity search on transcript_chunks, return top-K results with episode metadata
- [ ] 8.5 Implement Gemini Pro answer synthesis via Vercel AI SDK `streamText`: send top-K chunks + query, stream structured answer with source references
- [ ] 8.6 Implement semantic answer cache: store/retrieve cached answers by query embedding similarity
- [ ] 8.7 Implement topic-aware cache invalidation in the invalidate-cache job
- [ ] 8.8 Implement 24h TTL expiration for cached answers

## 9. Public Pages — Layout & Navigation

- [ ] 9.1 Create the app layout with persistent search bar (header with search input, navigation)
- [ ] 9.2 Implement search bar behavior: navigate to /search?q=<query> on submit from any page

## 10. Public Pages — Landing

- [ ] 10.1 Create the landing page (`/`): trending topics (by episode count in last 7 days), recent episodes
- [ ] 10.2 Create API endpoint for trending topics and recent episodes
- [ ] 10.3 Handle empty state when no episodes are processed yet

## 11. Public Pages — Search

- [ ] 11.1 Create the search page (`/search`): query input, AI-synthesized answer display, source episode list
- [ ] 11.2 Wire search page to the search API endpoint (embed → cache check → synthesis)
- [ ] 11.3 Display related topic and entity links alongside the answer
- [ ] 11.4 Handle no-results state with suggestions to browse trending topics

## 12. Public Pages — Topic, Entity, Podcast, Episode

- [ ] 12.1 Create the topic page (`/topic/:slug`): topic name, description, related episodes, related entities
- [ ] 12.2 Create the entity page (`/entity/:slug`): canonical name, type, aliases, episode mentions with context snippets, related topics
- [ ] 12.3 Create the podcast page (`/podcast/:slug`): podcast metadata, artwork, episode list with summaries
- [ ] 12.4 Create the episode page (`/episode/:slug`): summary, key points, clean transcript, topics, entities
- [ ] 12.5 Create API endpoints for each page's data needs
- [ ] 12.6 Handle 404 states for non-existent slugs

## 13. Integration Testing & Initial Data Load

- [ ] 13.1 Test the full pipeline end-to-end: seed a podcast → poll feed → download → preprocess → transcribe → analyze → resolve → embed
- [ ] 13.2 Run initial backfill of existing episodes for the curated podcast list
- [ ] 13.3 Verify search works against backfilled data: query → chunks → synthesis → cached response
- [ ] 13.4 Verify all public pages render correctly with real data
