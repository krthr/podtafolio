import type { QueueManagerConfig } from "@boringnode/queue/types";
import { exponentialBackoff } from "@boringnode/queue";
import { knex } from "@boringnode/queue/drivers/knex_adapter";

export function createQueueConfig(): QueueManagerConfig {
  const databaseUrl = useRuntimeConfig().databaseUrl;

  return {
    default: "postgres",
    adapters: {
      postgres: knex({
        client: "pg",
        connection: databaseUrl,
      }),
    },
    retry: {
      maxRetries: 5,
      backoff: exponentialBackoff({
        baseDelay: "10s",
        maxDelay: "10m",
        multiplier: 2,
        jitter: true,
      }),
    },
    worker: {
      concurrency: 2,
      idleDelay: "5s",
      gracefulShutdown: true,
    },
  };
}
