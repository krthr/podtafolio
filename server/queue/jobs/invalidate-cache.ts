import { Job } from '@boringnode/queue'

export interface InvalidateCachePayload {
  episodeId: number
}

export default class InvalidateCacheJob extends Job<InvalidateCachePayload> {
  static options = {
    queue: 'default',
    timeout: '2m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 8 (task 8.7)
    console.log('[InvalidateCacheJob]', this.payload)
    // Final pipeline stage — no further chaining
  }
}
