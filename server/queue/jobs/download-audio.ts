import { Job } from '@boringnode/queue'
import { eq } from 'drizzle-orm'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { episodes } from '../../database/schema'
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
    const db = useDB()
    const { episodeId, enclosureUrl } = this.payload

    // Update episode status to processing
    await db
      .update(episodes)
      .set({ status: 'processing' })
      .where(eq(episodes.id, episodeId))

    // Download the audio file
    const res = await fetch(enclosureUrl)
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText} for ${enclosureUrl}`)
    }
    if (!res.body) {
      throw new Error(`No response body for ${enclosureUrl}`)
    }

    // Store Content-Length for change detection
    const contentLength = res.headers.get('content-length')
      ? parseInt(res.headers.get('content-length')!, 10)
      : null

    await db
      .update(episodes)
      .set({ contentLength })
      .where(eq(episodes.id, episodeId))

    // Save to temp directory
    const downloadDir = join(tmpdir(), 'podtafolio', 'downloads')
    await mkdir(downloadDir, { recursive: true })
    const filePath = join(downloadDir, `${episodeId}-raw`)

    const writeStream = createWriteStream(filePath)
    await pipeline(Readable.fromWeb(res.body as any), writeStream)

    console.log(`[DownloadAudioJob] Episode ${episodeId}: downloaded to ${filePath}`)

    // Chain: download → preprocess
    await PreprocessAudioJob.dispatch({
      episodeId,
    })
  }

  async failed(error: Error): Promise<void> {
    // Mark episode as failed
    const db = useDB()
    await db
      .update(episodes)
      .set({ status: 'failed' })
      .where(eq(episodes.id, this.payload.episodeId))

    console.error(`[DownloadAudioJob] Episode ${this.payload.episodeId} failed:`, error.message)
  }
}
