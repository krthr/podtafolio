import type { ConnectionOptions, DefaultJobOptions } from "bullmq";

export const QUEUE_NAMES = [
  "feed-poll",
  "download",
  "preprocess",
  "transcribe",
  "analyze",
  "resolve-entities",
  "embed-chunks",
  "invalidate-cache",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export const CONCURRENCY: Record<QueueName, number> = {
  "feed-poll": 1,
  download: 3,
  preprocess: 2,
  transcribe: 1,
  analyze: 2,
  "resolve-entities": 2,
  "embed-chunks": 2,
  "invalidate-cache": 3,
};

export function getRedisConnection(): ConnectionOptions {
  const redisUrl = useRuntimeConfig().redisUrl;
  if (!redisUrl) {
    throw new Error("NUXT_REDIS_URL is not configured");
  }
  return { url: redisUrl };
}

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10_000, // 10s base
  },
  removeOnComplete: { age: 604_800 }, // 7 days
  removeOnFail: { age: 2_592_000 }, // 30 days
};
