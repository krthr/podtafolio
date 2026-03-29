import type { QueueManagerConfig } from '@boringnode/queue'
import { exponentialBackoff } from '@boringnode/queue'
import { knex } from '@boringnode/queue/drivers/knex_adapter'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createQueueConfig(): QueueManagerConfig {
  return {
    default: 'sqlite',
    adapters: {
      sqlite: knex({
        client: 'better-sqlite3',
        connection: { filename: resolve(__dirname, '../../queue.db') },
        useNullAsDefault: true,
      }),
    },
    retry: {
      maxRetries: 5,
      backoff: exponentialBackoff({
        baseDelay: '10s',
        maxDelay: '10m',
        multiplier: 2,
        jitter: true,
      }),
    },
    worker: {
      concurrency: 2,
      idleDelay: '5s',
      gracefulShutdown: true,
    },
  }
}
