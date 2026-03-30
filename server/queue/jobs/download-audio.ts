import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { episodes } from "../../database/schema";
import { getQueue } from "../queues";

export interface DownloadAudioPayload {
  episodeId: number;
  enclosureUrl: string;
}

export async function process(job: Job<DownloadAudioPayload>): Promise<void> {
  const db = useDB();
  const { episodeId, enclosureUrl } = job.data;

  await db
    .update(episodes)
    .set({ status: "processing" })
    .where(eq(episodes.id, episodeId));

  const res = await fetch(enclosureUrl);
  if (!res.ok) {
    throw new Error(
      `Download failed: ${res.status} ${res.statusText} for ${enclosureUrl}`,
    );
  }
  if (!res.body) {
    throw new Error(`No response body for ${enclosureUrl}`);
  }

  const contentLength = res.headers.get("content-length")
    ? parseInt(res.headers.get("content-length")!, 10)
    : null;

  await db
    .update(episodes)
    .set({ contentLength })
    .where(eq(episodes.id, episodeId));

  const downloadDir = join(tmpdir(), "podtafolio", "downloads");
  await mkdir(downloadDir, { recursive: true });
  const filePath = join(downloadDir, `${episodeId}-raw`);

  const writeStream = createWriteStream(filePath);
  await pipeline(Readable.fromWeb(res.body as any), writeStream);

  console.log(`[download] Episode ${episodeId}: downloaded to ${filePath}`);

  await getQueue("preprocess").add("preprocess", { episodeId });
}

export async function failed(
  job: Job<DownloadAudioPayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();
  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
  console.error(
    `[download] Episode ${job.data.episodeId} failed:`,
    error.message,
  );
}
