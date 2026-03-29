import { Job } from '@boringnode/queue'
import ResolveEntitiesJob from './resolve-entities'

export interface AnalyzePayload {
  episodeId: number
}

export default class AnalyzeJob extends Job<AnalyzePayload> {
  static options = {
    queue: 'default',
    timeout: '10m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 6 (tasks 6.1–6.6)
    console.log('[AnalyzeJob]', this.payload)

    // Chain: analyze → resolve-entities
    await ResolveEntitiesJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
