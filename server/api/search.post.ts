import { z } from 'zod'
import { inArray } from 'drizzle-orm'
import {
  embedQuery,
  searchChunks,
  synthesizeAnswer,
  findCachedAnswer,
  cacheAnswer,
} from '../services/search'
import { episodeTopics } from '../database/schema'

const querySchema = z.object({
  query: z.string().min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, querySchema.parse)
  const db = useDB()

  // Embed the query
  const queryEmbedding = await embedQuery(body.query)

  // 8.6 + 8.8 — Check semantic cache (includes 24h TTL filter)
  const cached = await findCachedAnswer(db, queryEmbedding)
  if (cached) {
    return {
      answer: cached.answerText as string | null,
      sources: [] as { episodeId: number; episodeTitle: string; episodeSlug: string; podcastTitle: string; podcastSlug: string; publishedAt: string | null }[],
      cached: true,
      message: null as string | null,
    }
  }

  // 8.4 — Semantic search over transcript chunks
  const results = await searchChunks(db, queryEmbedding)

  if (results.length === 0) {
    return {
      answer: null as string | null,
      sources: [] as { episodeId: number; episodeTitle: string; episodeSlug: string; podcastTitle: string; podcastSlug: string; publishedAt: string | null }[],
      cached: false,
      message: 'No se encontró contenido relevante en los podcasts.' as string | null,
    }
  }

  // 8.5 — Synthesize answer with Gemini via streamText
  const synthesis = synthesizeAnswer(body.query, results)
  const answerText = await synthesis.text

  // Deduplicate source episodes
  const sourceEpisodeIds = [...new Set(results.map((r) => r.episodeId))]

  // Collect topic IDs for the source episodes (for cache tagging)
  const topicRows = sourceEpisodeIds.length > 0
    ? await db
        .select({ topicId: episodeTopics.topicId })
        .from(episodeTopics)
        .where(inArray(episodeTopics.episodeId, sourceEpisodeIds))
    : []
  const sourceTopicIds = [...new Set(topicRows.map((r) => r.topicId))]

  // Cache the answer
  await cacheAnswer(
    db,
    body.query,
    queryEmbedding,
    answerText,
    sourceEpisodeIds,
    sourceTopicIds,
  )

  // Build source metadata for the response
  const sources = [...new Map(
    results.map((r) => [
      r.episodeId,
      {
        episodeId: r.episodeId,
        episodeTitle: r.episodeTitle,
        episodeSlug: r.episodeSlug,
        podcastTitle: r.podcastTitle,
        podcastSlug: r.podcastSlug,
        publishedAt: r.publishedAt,
      },
    ]),
  ).values()]

  return {
    answer: answerText as string | null,
    sources,
    cached: false,
    message: null as string | null,
  }
})
