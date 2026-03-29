import { Job } from '@boringnode/queue'
import AnalyzeJob from './analyze'

export interface TranscribePayload {
  episodeId: number
}

export default class TranscribeJob extends Job<TranscribePayload> {
  static options = {
    queue: 'default',
    timeout: '30m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 5 (tasks 5.1–5.3)
    console.log('[TranscribeJob]', this.payload)

    // Chain: transcribe → analyze
    await AnalyzeJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
