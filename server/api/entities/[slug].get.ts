import { eq, desc } from "drizzle-orm";
import {
  entities,
  episodeEntities,
  episodes,
  podcasts,
  episodeTopics,
  topics,
} from "../../database/schema";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")!;
  const db = useDB();

  // Get entity
  const [entity] = await db
    .select()
    .from(entities)
    .where(eq(entities.slug, slug))
    .limit(1);

  if (!entity) {
    throw createError({ statusCode: 404, statusMessage: "Entity not found" });
  }

  // Get episodes mentioning this entity
  const episodeMentions = await db
    .select({
      episodeId: episodes.id,
      episodeTitle: episodes.title,
      episodeSlug: episodes.slug,
      publishedAt: episodes.publishedAt,
      podcastTitle: podcasts.title,
      podcastSlug: podcasts.slug,
      mentionCount: episodeEntities.mentionCount,
      contextSnippets: episodeEntities.contextSnippets,
    })
    .from(episodeEntities)
    .innerJoin(episodes, eq(episodes.id, episodeEntities.episodeId))
    .innerJoin(podcasts, eq(podcasts.id, episodes.podcastId))
    .where(eq(episodeEntities.entityId, entity.id))
    .orderBy(desc(episodes.publishedAt))
    .limit(50);

  // Get related topics
  const relatedTopics = await db
    .select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
    })
    .from(topics)
    .innerJoin(episodeTopics, eq(episodeTopics.topicId, topics.id))
    .innerJoin(
      episodeEntities,
      eq(episodeEntities.episodeId, episodeTopics.episodeId),
    )
    .where(eq(episodeEntities.entityId, entity.id))
    .groupBy(topics.id, topics.name, topics.slug)
    .limit(15);

  return {
    entity,
    episodeMentions,
    relatedTopics,
  };
});
