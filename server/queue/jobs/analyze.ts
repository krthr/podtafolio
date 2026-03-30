import { Job } from "@boringnode/queue";
import { eq, sql } from "drizzle-orm";
import {
  episodes,
  transcripts,
  topics,
  episodeTopics,
  episodeEntities,
  episodeSummaries,
} from "../../database/schema";
import { analyzeTranscript } from "../../services/analysis";
import ResolveEntitiesJob from "./resolve-entities";

export interface AnalyzePayload {
  episodeId: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default class AnalyzeJob extends Job<AnalyzePayload> {
  static options = {
    queue: "default",
    timeout: "10m",
  };

  async execute(): Promise<void> {
    const db = useDB();
    const { episodeId } = this.payload;

    // Get raw transcript
    const [transcript] = await db
      .select({ id: transcripts.id, rawText: transcripts.rawText })
      .from(transcripts)
      .where(eq(transcripts.episodeId, episodeId))
      .limit(1);

    if (!transcript?.rawText) {
      throw new Error(`Episode ${episodeId}: no raw transcript found`);
    }

    // Run combined analysis via Gemini Flash
    const result = await analyzeTranscript(transcript.rawText);

    // 6.3 — Store clean_text
    await db
      .update(transcripts)
      .set({ cleanText: result.cleanText })
      .where(eq(transcripts.id, transcript.id));

    // 6.4 — Create/link topics
    for (const topicData of result.topics) {
      const topicSlug = slugify(topicData.name);

      // Upsert topic: insert or get existing by slug
      const [topic] = await db
        .insert(topics)
        .values({
          name: topicData.name,
          slug: topicSlug,
          episodeCount: 1,
        })
        .onConflictDoUpdate({
          target: topics.slug,
          set: { episodeCount: sql`${topics.episodeCount} + 1` },
        })
        .returning({ id: topics.id });

      // Link episode to topic
      await db
        .insert(episodeTopics)
        .values({
          episodeId,
          topicId: topic.id,
          relevanceScore: topicData.relevanceScore,
        })
        .onConflictDoNothing();
    }

    // 6.5 — Store raw entity mentions (temporary storage for entity resolution)
    // We store them directly in episode_entities with entity_id = 0 as a placeholder.
    // The resolve-entities job will process these and link to canonical entities.
    // Instead, we pass entity data through the job payload to the resolve step.
    // For now, store as JSONB in a temporary approach — attach to the job payload.

    // 6.6 — Store episode summary and key points
    const existingSummary = await db
      .select({ id: episodeSummaries.id })
      .from(episodeSummaries)
      .where(eq(episodeSummaries.episodeId, episodeId))
      .limit(1);

    if (existingSummary.length > 0) {
      await db
        .update(episodeSummaries)
        .set({
          summaryText: result.summary.text,
          keyPoints: result.summary.keyPoints,
        })
        .where(eq(episodeSummaries.episodeId, episodeId));
    } else {
      await db.insert(episodeSummaries).values({
        episodeId,
        summaryText: result.summary.text,
        keyPoints: result.summary.keyPoints,
      });
    }

    console.log(
      `[AnalyzeJob] Episode ${episodeId}: ${result.topics.length} topics, ` +
        `${result.entities.length} entities, ` +
        `${result.adSegments.length} ads stripped`,
    );

    // Chain: analyze → resolve-entities (pass extracted entities in payload)
    await ResolveEntitiesJob.dispatch({
      episodeId,
      rawEntities: result.entities,
    });
  }

  async failed(error: Error): Promise<void> {
    const db = useDB();
    await db
      .update(episodes)
      .set({ status: "failed" })
      .where(eq(episodes.id, this.payload.episodeId));

    console.error(
      `[AnalyzeJob] Episode ${this.payload.episodeId} failed:`,
      error.message,
    );
  }
}
