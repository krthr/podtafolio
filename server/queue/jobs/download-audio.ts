import { Job } from '@boringnode/queue'
import PreprocessAudioJob from './preprocess-audio'

export interface DownloadAudioPayload {
  episodeId: number
  enclosureUrl: string
}

export default class DownloadAudioJob extends Job<DownloadAudioPayload> {
  static options = {
    queue: 'default',
    timeout: '15m',
  }

  async execute(): Promise<void> {
    // Implemented in Group 4 (task 4.1)
    console.log('[DownloadAudioJob]', this.payload)

    // Chain: download → preprocess
    await PreprocessAudioJob.dispatch({
      episodeId: this.payload.episodeId,
    })
  }
}
