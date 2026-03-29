import { Job } from '@boringnode/queue'
import TranscribeJob from './transcribe'

export interface PreprocessAudioPayload {
  episodeId: number
}

export default class PreprocessAudioJob extends Job<PreprocessAudioPayload> {
  static options = {
    queue: 'default',
    timeout: '30m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 4 (task 4.2, 4.3)
    console.log('[PreprocessAudioJob]', this.payload)

    // Chain: preprocess → transcribe
    await TranscribeJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
