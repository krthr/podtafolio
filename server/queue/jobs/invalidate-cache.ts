import { Job } from "@boringnode/queue";
import { eq } from "drizzle-orm";
import { episodeTopics } from "../../database/schema";
import {
  invalidateCacheByTopics,
  purgeExpiredCache,
} from "../../services/search";

export interface InvalidateCachePayload {
  episodeId: number;
}

export default class InvalidateCacheJob extends Job<InvalidateCachePayload> {
  static options = {
    queue: "default",
    timeout: "2m",
  };

  async execute(): Promise<void> {
    const db = useDB();
    const { episodeId } = this.payload;

    // 8.7 — Get topic IDs for this episode
    const topicRows = await db
      .select({ topicId: episodeTopics.topicId })
      .from(episodeTopics)
      .where(eq(episodeTopics.episodeId, episodeId));

    const topicIds = topicRows.map((r) => r.topicId);

    // Invalidate cached answers with overlapping topics
    const invalidated = await invalidateCacheByTopics(db, topicIds);

    // 8.8 — Also purge any expired cache entries
    const purged = await purgeExpiredCache(db);

    console.log(
      `[InvalidateCacheJob] Episode ${episodeId}: invalidated ${invalidated} cached answers (topics: ${topicIds.join(",")}), purged ${purged} expired`,
    );
    // Final pipeline stage — no further chaining
  }
}
