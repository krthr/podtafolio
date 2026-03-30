import { sql, desc, eq } from "drizzle-orm";
import {
  topics,
  episodes,
  podcasts,
  episodeSummaries,
} from "../database/schema";

export default defineEventHandler(async () => {
  const db = useDB();

  // Trending topics: by episode count, considering recent activity
  const trendingTopics = await db
    .select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
      episodeCount: topics.episodeCount,
    })
    .from(topics)
    .orderBy(desc(topics.episodeCount))
    .limit(12);

  // Recent episodes with podcast info and summary
  const recentEpisodes = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      slug: episodes.slug,
      publishedAt: episodes.publishedAt,
      podcastTitle: podcasts.title,
      podcastSlug: podcasts.slug,
      podcastArtwork: podcasts.artworkUrl,
      summary: episodeSummaries.summaryText,
    })
    .from(episodes)
    .innerJoin(podcasts, eq(episodes.podcastId, podcasts.id))
    .leftJoin(episodeSummaries, eq(episodeSummaries.episodeId, episodes.id))
    .where(eq(episodes.status, "done"))
    .orderBy(desc(episodes.publishedAt))
    .limit(20);

  return {
    trendingTopics,
    recentEpisodes,
  };
});
