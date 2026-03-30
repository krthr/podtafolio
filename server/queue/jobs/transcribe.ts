import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";
import { episodes, transcripts } from "../../database/schema";
import { transcribeAudio } from "../../services/groq";
import { getAudioUrl } from "../../utils/storage";
import { getQueue } from "../queues";

export interface TranscribePayload {
  episodeId: number;
}

export async function process(job: Job<TranscribePayload>): Promise<void> {
  const db = useDB();
  const { episodeId } = job.data;

  const [episode] = await db
    .select({ audioStorageKey: episodes.audioStorageKey })
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  if (!episode?.audioStorageKey) {
    throw new Error(`Episode ${episodeId}: no audio storage key found`);
  }

  const audioUrl = await getAudioUrl(episode.audioStorageKey);
  const rawText = await transcribeAudio(audioUrl);

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(`Episode ${episodeId}: transcription returned empty text`);
  }

  const existing = await db
    .select({ id: transcripts.id })
    .from(transcripts)
    .where(eq(transcripts.episodeId, episodeId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(transcripts)
      .set({ rawText, cleanText: null })
      .where(eq(transcripts.episodeId, episodeId));
  } else {
    await db.insert(transcripts).values({
      episodeId,
      rawText,
      cleanText: null,
    });
  }

  console.log(
    `[transcribe] Episode ${episodeId}: transcribed (${rawText.length} chars)`,
  );

  await getQueue("analyze").add("analyze", { episodeId });
}

export async function failed(
  job: Job<TranscribePayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();

  if (error instanceof Groq.APIError) {
    console.error(
      `[transcribe] Episode ${job.data.episodeId} Groq API error:`,
      `status=${error.status}`,
      error.message,
    );
  } else {
    console.error(
      `[transcribe] Episode ${job.data.episodeId} failed:`,
      error.message,
    );
  }

  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
}
