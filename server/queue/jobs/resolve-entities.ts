import { Job } from '@boringnode/queue'
import EmbedChunksJob from './embed-chunks'

export interface RawEntity {
  name: string
  type: 'person' | 'org' | 'place' | 'event' | 'other'
  mentionCount: number
  contextSnippets: string[]
}

export interface ResolveEntitiesPayload {
  episodeId: number
  rawEntities?: RawEntity[]
}

export default class ResolveEntitiesJob extends Job<ResolveEntitiesPayload> {
  static options = {
    queue: 'default',
    timeout: '10m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 7 (tasks 7.1–7.5)
    console.log('[ResolveEntitiesJob]', this.payload)

    // Chain: resolve-entities → embed-chunks
    await EmbedChunksJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
