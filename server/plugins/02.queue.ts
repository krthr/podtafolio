import { Worker } from "bullmq";
import { QUEUE_NAMES, CONCURRENCY, getRedisConnection } from "../queue/config";
import { initQueues, getQueue, closeAllQueues } from "../queue/queues";

import * as feedPoll from "../queue/jobs/feed-poll";
import * as downloadAudio from "../queue/jobs/download-audio";
import * as preprocessAudio from "../queue/jobs/preprocess-audio";
import * as transcribe from "../queue/jobs/transcribe";
import * as analyze from "../queue/jobs/analyze";
import * as resolveEntities from "../queue/jobs/resolve-entities";
import * as embedChunks from "../queue/jobs/embed-chunks";
import * as invalidateCache from "../queue/jobs/invalidate-cache";

const processors: Record<string, { process: Function; failed?: Function }> = {
  "feed-poll": feedPoll,
  download: downloadAudio,
  preprocess: preprocessAudio,
  transcribe: transcribe,
  analyze: analyze,
  "resolve-entities": resolveEntities,
  "embed-chunks": embedChunks,
  "invalidate-cache": invalidateCache,
};

export default defineNitroPlugin(async (nitro) => {
  const redisUrl = useRuntimeConfig().redisUrl;
  if (!redisUrl) {
    console.warn("[Queue] NUXT_REDIS_URL not set — skipping queue init");
    return;
  }

  const connection = getRedisConnection();

  // Initialize all queues
  initQueues();

  // Create workers
  const workers: Worker[] = [];

  for (const name of QUEUE_NAMES) {
    const mod = processors[name]!;
    const worker = new Worker(name, mod.process as any, {
      connection,
      concurrency: CONCURRENCY[name],
    });

    if (mod.failed) {
      worker.on("failed", mod.failed as any);
    }

    workers.push(worker);
  }

  // Register repeatable feed-poll cron (upserts — safe on restart)
  const feedPollQueue = getQueue("feed-poll");
  await feedPollQueue.add(
    "daily-feed-poll",
    {},
    { repeat: { pattern: "0 3 * * *" } },
  );

  console.log(
    `[Queue] ${workers.length} workers started (${QUEUE_NAMES.join(", ")})`,
  );

  // Graceful shutdown
  nitro.hooks.hook("close", async () => {
    await Promise.all(workers.map((w) => w.close()));
    await closeAllQueues();
    console.log("[Queue] All workers and queues closed");
  });
});
