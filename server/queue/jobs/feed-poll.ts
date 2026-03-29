import { Job } from '@boringnode/queue'

export interface FeedPollPayload {
  /** If set, poll only this podcast. Otherwise poll all. */
  podcastId?: number
}

export default class FeedPollJob extends Job<FeedPollPayload> {
  static options = {
    queue: 'default',
    timeout: '10m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 3 (task 3.5)
    console.log('[FeedPollJob] polling feeds', this.payload)
  }
}
