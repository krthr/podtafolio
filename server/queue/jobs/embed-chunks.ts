import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { episodes, transcripts, transcriptChunks } from "../../database/schema";
import { chunkTranscript, embedChunks } from "../../services/search";
import { getQueue } from "../queues";

export interface EmbedChunksPayload {
  episodeId: number;
}

export async function process(job: Job<EmbedChunksPayload>): Promise<void> {
  const db = useDB();
  const { episodeId } = job.data;

  const [transcript] = await db
    .select({ id: transcripts.id, cleanText: transcripts.cleanText })
    .from(transcripts)
    .where(eq(transcripts.episodeId, episodeId))
    .limit(1);

  if (!transcript?.cleanText) {
    console.log(
      `[embed-chunks] Episode ${episodeId}: no clean transcript, skipping`,
    );
    await getQueue("invalidate-cache").add("invalidate-cache", { episodeId });
    return;
  }

  const chunks = chunkTranscript(transcript.cleanText);
  console.log(`[embed-chunks] Episode ${episodeId}: ${chunks.length} chunks`);

  const embeddings = await embedChunks(chunks.map((c) => c.text));

  await db
    .delete(transcriptChunks)
    .where(eq(transcriptChunks.episodeId, episodeId));

  for (let i = 0; i < chunks.length; i++) {
    await db.insert(transcriptChunks).values({
      transcriptId: transcript.id,
      episodeId,
      chunkIndex: chunks[i]!.chunkIndex,
      text: chunks[i]!.text,
      embedding: embeddings[i]!,
      startOffset: chunks[i]!.startOffset,
      endOffset: chunks[i]!.endOffset,
    });
  }

  await db
    .update(episodes)
    .set({ status: "done" })
    .where(eq(episodes.id, episodeId));

  console.log(
    `[embed-chunks] Episode ${episodeId}: stored ${chunks.length} embedded chunks`,
  );

  await getQueue("invalidate-cache").add("invalidate-cache", { episodeId });
}

export async function failed(
  job: Job<EmbedChunksPayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();
  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
  console.error(
    `[embed-chunks] Episode ${job.data.episodeId} failed:`,
    error.message,
  );
}
