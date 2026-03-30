import { eq } from "drizzle-orm";
import {
  episodes,
  podcasts,
  transcripts,
  episodeSummaries,
  episodeTopics,
  topics,
  episodeEntities,
  entities,
} from "../../database/schema";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")!;
  const db = useDB();

  // Get episode with podcast
  const [episode] = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      slug: episodes.slug,
      publishedAt: episodes.publishedAt,
      durationSeconds: episodes.durationSeconds,
      status: episodes.status,
      podcastId: episodes.podcastId,
      podcastTitle: podcasts.title,
      podcastSlug: podcasts.slug,
      podcastArtwork: podcasts.artworkUrl,
    })
    .from(episodes)
    .innerJoin(podcasts, eq(podcasts.id, episodes.podcastId))
    .where(eq(episodes.slug, slug))
    .limit(1);

  if (!episode) {
    throw createError({ statusCode: 404, statusMessage: "Episode not found" });
  }

  // Get summary
  const [summary] = await db
    .select({
      summaryText: episodeSummaries.summaryText,
      keyPoints: episodeSummaries.keyPoints,
    })
    .from(episodeSummaries)
    .where(eq(episodeSummaries.episodeId, episode.id))
    .limit(1);

  // Get clean transcript
  const [transcript] = await db
    .select({ cleanText: transcripts.cleanText })
    .from(transcripts)
    .where(eq(transcripts.episodeId, episode.id))
    .limit(1);

  // Get topics
  const episodeTopicList = await db
    .select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
      relevanceScore: episodeTopics.relevanceScore,
    })
    .from(episodeTopics)
    .innerJoin(topics, eq(topics.id, episodeTopics.topicId))
    .where(eq(episodeTopics.episodeId, episode.id));

  // Get entities
  const episodeEntityList = await db
    .select({
      id: entities.id,
      canonicalName: entities.canonicalName,
      slug: entities.slug,
      type: entities.type,
      mentionCount: episodeEntities.mentionCount,
      contextSnippets: episodeEntities.contextSnippets,
    })
    .from(episodeEntities)
    .innerJoin(entities, eq(entities.id, episodeEntities.entityId))
    .where(eq(episodeEntities.episodeId, episode.id));

  return {
    episode,
    summary: summary ?? null,
    transcript: transcript?.cleanText ?? null,
    topics: episodeTopicList,
    entities: episodeEntityList,
  };
});
