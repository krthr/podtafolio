import { embed, embedMany, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { sql } from 'drizzle-orm'
import { answerCache } from '../database/schema'

// ── Config ───────────────────────────────────────────────

const EMBEDDING_MODEL = google.textEmbeddingModel('gemini-embedding-2-preview')
const EMBEDDING_PROVIDER_OPTIONS = { google: { outputDimensionality: 768 } }
const SYNTHESIS_MODEL = google('gemini-2.5-pro-preview-06-05')

const CHUNK_SIZE = 1000 // characters
const CHUNK_OVERLAP = 200 // characters
const SEARCH_TOP_K = 10
const SEARCH_MIN_SIMILARITY = 0.50
const CACHE_SIMILARITY_THRESHOLD = 0.92
const CACHE_TTL_HOURS = 24

// ── 8.1 — Transcript Chunking ───────────────────────────

export interface TextChunk {
  text: string
  chunkIndex: number
  startOffset: number
  endOffset: number
}

/**
 * Split text into overlapping chunks with positional offsets.
 */
export function chunkTranscript(text: string): TextChunk[] {
  const chunks: TextChunk[] = []
  let start = 0
  let index = 0

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push({
      text: text.slice(start, end),
      chunkIndex: index,
      startOffset: start,
      endOffset: end,
    })
    index++
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  return chunks
}

// ── 8.2 — Chunk Embedding ────────────────────────────────

/**
 * Embed multiple text chunks using Vercel AI SDK's `embedMany`.
 * Batches in groups of 100 to stay within API limits.
 */
export async function embedChunks(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    })
    allEmbeddings.push(...embeddings)
  }

  return allEmbeddings
}

/**
 * Embed a single query string.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: query,
    providerOptions: EMBEDDING_PROVIDER_OPTIONS,
  })
  return embedding
}

// ── 8.4 — Semantic Search ────────────────────────────────

export interface SearchResult {
  chunkId: number
  text: string
  similarity: number
  episodeId: number
  episodeTitle: string
  episodeSlug: string
  podcastTitle: string
  podcastSlug: string
  publishedAt: string | null
}

/**
 * Embed query and search transcript_chunks via pgvector cosine similarity.
 * Returns top-K results with episode and podcast metadata.
 */
export async function searchChunks(
  db: ReturnType<typeof useDB>,
  queryEmbedding: number[],
): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const results = await db.execute(sql`
    SELECT
      tc.id AS chunk_id,
      tc.text,
      1 - (tc.embedding <=> ${embeddingStr}::vector) AS similarity,
      e.id AS episode_id,
      e.title AS episode_title,
      e.slug AS episode_slug,
      p.title AS podcast_title,
      p.slug AS podcast_slug,
      e.published_at
    FROM transcript_chunks tc
    JOIN episodes e ON e.id = tc.episode_id
    JOIN podcasts p ON p.id = e.podcast_id
    WHERE tc.embedding IS NOT NULL
      AND 1 - (tc.embedding <=> ${embeddingStr}::vector) > ${SEARCH_MIN_SIMILARITY}
    ORDER BY similarity DESC
    LIMIT ${SEARCH_TOP_K}
  `)

  return (results.rows as any[]).map((row) => ({
    chunkId: row.chunk_id,
    text: row.text,
    similarity: Number(row.similarity),
    episodeId: row.episode_id,
    episodeTitle: row.episode_title,
    episodeSlug: row.episode_slug,
    podcastTitle: row.podcast_title,
    podcastSlug: row.podcast_slug,
    publishedAt: row.published_at,
  }))
}

// ── 8.5 — Answer Synthesis ───────────────────────────────

const SYNTHESIS_PROMPT = `You are a knowledgeable assistant that answers questions about Colombian podcasts.
You will receive transcript excerpts from various podcast episodes as context.

Rules:
- Answer the user's question based ONLY on the provided context
- Write your answer in Spanish
- Cite source episodes using [Episode Title - Podcast Name] format
- If the context doesn't contain enough information, say so honestly
- Be concise but thorough`

/**
 * Synthesize an answer from search results using Gemini Pro via streamText.
 * Returns a ReadableStream for streaming response to the client.
 */
export function synthesizeAnswer(
  query: string,
  searchResults: SearchResult[],
) {
  const contextBlock = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}: "${r.episodeTitle}" - ${r.podcastTitle}]\n${r.text}`,
    )
    .join('\n\n---\n\n')

  return streamText({
    model: SYNTHESIS_MODEL,
    system: SYNTHESIS_PROMPT,
    prompt: `Context from podcast transcripts:\n\n${contextBlock}\n\n---\n\nUser question: ${query}`,
  })
}

// ── 8.6 — Semantic Answer Cache ──────────────────────────

export interface CachedAnswer {
  id: number
  queryText: string
  answerText: string
  sourceEpisodeIds: number[]
  topicIds: number[]
}

/**
 * Check for a cached answer by query embedding similarity.
 * Returns null if no cache hit or if the cached answer has expired (8.8 — 24h TTL).
 */
export async function findCachedAnswer(
  db: ReturnType<typeof useDB>,
  queryEmbedding: number[],
): Promise<CachedAnswer | null> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const results = await db.execute(sql`
    SELECT
      id,
      query_text,
      answer_text,
      source_episode_ids,
      topic_ids,
      1 - (query_embedding <=> ${embeddingStr}::vector) AS similarity
    FROM answer_cache
    WHERE query_embedding IS NOT NULL
      AND 1 - (query_embedding <=> ${embeddingStr}::vector) > ${CACHE_SIMILARITY_THRESHOLD}
      AND expires_at > NOW()
    ORDER BY similarity DESC
    LIMIT 1
  `)

  const row = (results.rows as any[])[0]
  if (!row) return null

  return {
    id: row.id,
    queryText: row.query_text,
    answerText: row.answer_text,
    sourceEpisodeIds: row.source_episode_ids ?? [],
    topicIds: row.topic_ids ?? [],
  }
}

/**
 * Store a synthesized answer in the cache.
 */
export async function cacheAnswer(
  db: ReturnType<typeof useDB>,
  queryText: string,
  queryEmbedding: number[],
  answerText: string,
  sourceEpisodeIds: number[],
  topicIds: number[],
): Promise<void> {
  await db.insert(answerCache).values({
    queryText,
    queryEmbedding: queryEmbedding,
    answerText,
    sourceEpisodeIds,
    topicIds,
    expiresAt: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000),
  })
}

// ── 8.7 — Topic-Aware Cache Invalidation ─────────────────

/**
 * Delete cached answers whose topic_ids overlap with the given topic IDs.
 */
export async function invalidateCacheByTopics(
  db: ReturnType<typeof useDB>,
  topicIds: number[],
): Promise<number> {
  if (topicIds.length === 0) return 0

  const result = await db.execute(sql`
    DELETE FROM answer_cache
    WHERE topic_ids && ${sql`ARRAY[${sql.join(topicIds.map((id) => sql`${id}`), sql`,`)}]::int[]`}
  `)

  return (result as any).rowCount ?? 0
}

/**
 * Delete all expired cached answers (24h TTL safety net).
 */
export async function purgeExpiredCache(
  db: ReturnType<typeof useDB>,
): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM answer_cache
    WHERE expires_at <= NOW()
  `)

  return (result as any).rowCount ?? 0
}
