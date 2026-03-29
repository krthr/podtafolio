## Why

There is no dedicated platform for discovering and searching Colombian podcast content by topic. Listeners who want to find what podcasters have said about specific news, political events, or trending topics must manually listen through hours of audio. By transcribing and analyzing podcast episodes, we can build a Perplexity-like search experience where users get AI-synthesized answers grounded in real podcast content, plus structured topic and entity pages for deeper exploration.

## What Changes

- Add a podcast ingestion pipeline that discovers, downloads, preprocesses, transcribes, and analyzes episodes from Colombian podcasts
- Add AI-powered content extraction via Vercel AI SDK: ad stripping, topic/entity extraction, episode summarization using Gemini Flash
- Add entity resolution system using pgvector similarity and Vercel AI SDK to deduplicate entities across episodes and language variations
- Add semantic search with AI-synthesized answers (Gemini Pro via Vercel AI SDK) and a semantic answer cache with topic-aware invalidation
- Add public-facing pages: landing (trending), search, topic, entity, podcast, and episode pages
- Add a background job queue (@boringnode/queue backed by SQLite) to orchestrate the entire ingest pipeline
- Add daily cron-based feed polling for new episodes

## Capabilities

### New Capabilities

- `podcast-discovery`: Finding and registering Colombian podcasts via Apple iTunes API, Podcast Index, and manual seeds
- `episode-ingestion`: Downloading episode audio, ffmpeg preprocessing (mono/16kHz/opus), and managing audio storage for files exceeding Groq's 25MB limit
- `transcription`: Transcribing episode audio using Groq Whisper API, including file size handling and chunking strategy
- `content-analysis`: LLM-based analysis pass via Vercel AI SDK (Gemini Flash) that strips ads, extracts topics, extracts entities, and generates episode summaries from transcripts
- `entity-resolution`: Deduplicating entities using pgvector cosine similarity and Vercel AI SDK (Gemini Flash), maintaining canonical entities with aliases
- `semantic-search`: Embedding transcript chunks in pgvector via Vercel AI SDK, hybrid vector + full-text search, and AI-synthesized answers (Gemini Pro) with semantic caching and topic-aware invalidation
- `job-pipeline`: Background job queue using @boringnode/queue (SQLite-backed) that orchestrates the full ingest pipeline with retry logic and daily feed polling
- `public-pages`: Nuxt SSR pages for landing, search, topic, entity, podcast, and episode views

### Modified Capabilities

(none - greenfield project)

## Impact

- **Dependencies**: nuxt, podcastindex, @boringnode/queue, ai (Vercel AI SDK), @ai-sdk/google (Gemini provider), groq-sdk, fluent-ffmpeg (or child_process ffmpeg), pg + pgvector extension
- **Infrastructure**: PostgreSQL with pgvector extension, object storage (R2 or S3) for audio files, ffmpeg binary on the server
- **APIs**: Groq (transcription), Google Gemini (analysis + synthesis), Apple iTunes Search API (discovery), Podcast Index API (discovery + feeds)
- **Deployment**: Requires a long-running server process for the job queue (not just static/serverless)
