import { Queue } from "bullmq";
import {
  QUEUE_NAMES,
  type QueueName,
  getRedisConnection,
  DEFAULT_JOB_OPTIONS,
} from "./config";

let queues: Map<QueueName, Queue> | null = null;

export function initQueues(): Map<QueueName, Queue> {
  if (queues) return queues;

  const connection = getRedisConnection();
  queues = new Map();

  for (const name of QUEUE_NAMES) {
    queues.set(
      name,
      new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    );
  }

  return queues;
}

export function getQueue(name: QueueName): Queue {
  if (!queues) throw new Error("Queues not initialized — call initQueues()");
  return queues.get(name)!;
}

export function getAllQueues(): Map<QueueName, Queue> {
  if (!queues) throw new Error("Queues not initialized — call initQueues()");
  return queues;
}

export async function closeAllQueues(): Promise<void> {
  if (!queues) return;
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues = null;
}
