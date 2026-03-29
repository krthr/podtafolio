import { Job } from '@boringnode/queue'
import InvalidateCacheJob from './invalidate-cache'

export interface EmbedChunksPayload {
  episodeId: number
}

export default class EmbedChunksJob extends Job<EmbedChunksPayload> {
  static options = {
    queue: 'default',
    timeout: '15m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 8 (tasks 8.1–8.3)
    console.log('[EmbedChunksJob]', this.payload)

    // Chain: embed-chunks → invalidate-cache (final stage)
    await InvalidateCacheJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
