import { eq, desc } from 'drizzle-orm'
import {
  podcasts,
  episodes,
  episodeSummaries,
} from '../../database/schema'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const db = useDB()

  // Get podcast
  const [podcast] = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.slug, slug))
    .limit(1)

  if (!podcast) {
    throw createError({ statusCode: 404, statusMessage: 'Podcast not found' })
  }

  // Get episodes with summaries
  const episodeList = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      slug: episodes.slug,
      publishedAt: episodes.publishedAt,
      status: episodes.status,
      durationSeconds: episodes.durationSeconds,
      summary: episodeSummaries.summaryText,
    })
    .from(episodes)
    .leftJoin(episodeSummaries, eq(episodeSummaries.episodeId, episodes.id))
    .where(eq(episodes.podcastId, podcast.id))
    .orderBy(desc(episodes.publishedAt))
    .limit(100)

  return {
    podcast,
    episodes: episodeList,
  }
})
