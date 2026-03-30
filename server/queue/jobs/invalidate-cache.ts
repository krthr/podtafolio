import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { episodeTopics } from "../../database/schema";
import {
  invalidateCacheByTopics,
  purgeExpiredCache,
} from "../../services/search";

export interface InvalidateCachePayload {
  episodeId: number;
}

export async function process(job: Job<InvalidateCachePayload>): Promise<void> {
  const db = useDB();
  const { episodeId } = job.data;

  const topicRows = await db
    .select({ topicId: episodeTopics.topicId })
    .from(episodeTopics)
    .where(eq(episodeTopics.episodeId, episodeId));

  const topicIds = topicRows.map((r) => r.topicId);

  const invalidated = await invalidateCacheByTopics(db, topicIds);
  const purged = await purgeExpiredCache(db);

  console.log(
    `[invalidate-cache] Episode ${episodeId}: invalidated ${invalidated} cached answers (topics: ${topicIds.join(",")}), purged ${purged} expired`,
  );
}
