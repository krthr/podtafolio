import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { episodes } from "../../database/schema";
import { uploadAudio } from "../../utils/storage";
import { getQueue } from "../queues";

const execFileAsync = promisify(execFile);

export interface PreprocessAudioPayload {
  episodeId: number;
}

export async function process(job: Job<PreprocessAudioPayload>): Promise<void> {
  const db = useDB();
  const { episodeId } = job.data;

  const downloadDir = join(tmpdir(), "podtafolio", "downloads");
  const inputPath = join(downloadDir, `${episodeId}-raw`);
  const outputPath = join(downloadDir, `${episodeId}-processed.opus`);

  try {
    await execFileAsync("ffmpeg", [
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      "-y",
      outputPath,
    ]);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error(
        "ffmpeg is not installed or not found in PATH. Please install ffmpeg.",
      );
    }
    throw new Error(`ffmpeg failed: ${err.stderr || err.message}`);
  }

  await unlink(inputPath).catch(() => {});

  const storageKey = `audio/${episodeId}.opus`;
  const fileBuffer = await readFile(outputPath);
  await uploadAudio(storageKey, fileBuffer);

  await db
    .update(episodes)
    .set({ audioStorageKey: storageKey })
    .where(eq(episodes.id, episodeId));

  console.log(
    `[preprocess] Episode ${episodeId}: uploaded to storage (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`,
  );

  await unlink(outputPath).catch(() => {});

  await getQueue("transcribe").add("transcribe", { episodeId });
}

export async function failed(
  job: Job<PreprocessAudioPayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();
  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
  console.error(
    `[preprocess] Episode ${job.data.episodeId} failed:`,
    error.message,
  );
}
