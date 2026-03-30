import type { Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import {
  episodes,
  transcripts,
  topics,
  episodeTopics,
  episodeSummaries,
} from "../../database/schema";
import { analyzeTranscript } from "../../services/analysis";
import { getQueue } from "../queues";

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

export async function process(job: Job<AnalyzePayload>): Promise<void> {
  const db = useDB();
  const { episodeId } = job.data;

  const [transcript] = await db
    .select({ id: transcripts.id, rawText: transcripts.rawText })
    .from(transcripts)
    .where(eq(transcripts.episodeId, episodeId))
    .limit(1);

  if (!transcript?.rawText) {
    throw new Error(`Episode ${episodeId}: no raw transcript found`);
  }

  const result = await analyzeTranscript(transcript.rawText);

  await db
    .update(transcripts)
    .set({ cleanText: result.cleanText })
    .where(eq(transcripts.id, transcript.id));

  for (const topicData of result.topics) {
    const topicSlug = slugify(topicData.name);

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

    await db
      .insert(episodeTopics)
      .values({
        episodeId,
        topicId: topic!.id,
        relevanceScore: topicData.relevanceScore,
      })
      .onConflictDoNothing();
  }

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
    `[analyze] Episode ${episodeId}: ${result.topics.length} topics, ` +
      `${result.entities.length} entities, ` +
      `${result.adSegments.length} ads stripped`,
  );

  await getQueue("resolve-entities").add("resolve-entities", {
    episodeId,
    rawEntities: result.entities,
  });
}

export async function failed(
  job: Job<AnalyzePayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();
  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
  console.error(
    `[analyze] Episode ${job.data.episodeId} failed:`,
    error.message,
  );
}
