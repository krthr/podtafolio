import { eq, desc } from "drizzle-orm";
import {
  topics,
  episodeTopics,
  episodes,
  podcasts,
  episodeEntities,
  entities,
} from "../../database/schema";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")!;
  const db = useDB();

  // Get topic
  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.slug, slug))
    .limit(1);

  if (!topic) {
    throw createError({ statusCode: 404, statusMessage: "Topic not found" });
  }

  // Get related episodes
  const relatedEpisodes = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      slug: episodes.slug,
      publishedAt: episodes.publishedAt,
      podcastTitle: podcasts.title,
      podcastSlug: podcasts.slug,
      relevanceScore: episodeTopics.relevanceScore,
    })
    .from(episodeTopics)
    .innerJoin(episodes, eq(episodes.id, episodeTopics.episodeId))
    .innerJoin(podcasts, eq(podcasts.id, episodes.podcastId))
    .where(eq(episodeTopics.topicId, topic.id))
    .orderBy(desc(episodes.publishedAt))
    .limit(50);

  // Get related entities (entities that appear in episodes with this topic)
  const relatedEntities = await db
    .select({
      id: entities.id,
      canonicalName: entities.canonicalName,
      slug: entities.slug,
      type: entities.type,
      mentionCount: entities.mentionCount,
    })
    .from(entities)
    .innerJoin(episodeEntities, eq(episodeEntities.entityId, entities.id))
    .innerJoin(
      episodeTopics,
      eq(episodeTopics.episodeId, episodeEntities.episodeId),
    )
    .where(eq(episodeTopics.topicId, topic.id))
    .groupBy(
      entities.id,
      entities.canonicalName,
      entities.slug,
      entities.type,
      entities.mentionCount,
    )
    .orderBy(desc(entities.mentionCount))
    .limit(20);

  return {
    topic,
    relatedEpisodes,
    relatedEntities,
  };
});
