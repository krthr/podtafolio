import { Job } from '@boringnode/queue'
import { eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { episodes } from '../../database/schema'
import { uploadAudio, getAudioUrl } from '../../utils/storage'
import TranscribeJob from './transcribe'

const execFileAsync = promisify(execFile)

export interface PreprocessAudioPayload {
  episodeId: number
}

export default class PreprocessAudioJob extends Job<PreprocessAudioPayload> {
  static options = {
    queue: 'default',
    timeout: '30m',
  }

  async execute(): Promise<void> {
    const db = useDB()
    const { episodeId } = this.payload

    const downloadDir = join(tmpdir(), 'podtafolio', 'downloads')
    const inputPath = join(downloadDir, `${episodeId}-raw`)
    const outputPath = join(downloadDir, `${episodeId}-processed.opus`)

    // Run ffmpeg: convert to mono, 16kHz, opus 32kbps
    try {
      await execFileAsync('ffmpeg', [
        '-i', inputPath,
        '-ac', '1',           // mono
        '-ar', '16000',       // 16kHz sample rate
        '-c:a', 'libopus',   // opus codec
        '-b:a', '32k',       // 32kbps bitrate
        '-y',                 // overwrite output
        outputPath,
      ])
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error('ffmpeg is not installed or not found in PATH. Please install ffmpeg.')
      }
      throw new Error(`ffmpeg failed: ${err.stderr || err.message}`)
    }

    // Clean up raw download
    await unlink(inputPath).catch(() => {})

    // Always upload to object storage
    const storageKey = `audio/${episodeId}.opus`
    const fileBuffer = await readFile(outputPath)
    await uploadAudio(storageKey, fileBuffer)

    await db
      .update(episodes)
      .set({ audioStorageKey: storageKey })
      .where(eq(episodes.id, episodeId))

    console.log(`[PreprocessAudioJob] Episode ${episodeId}: uploaded to storage (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`)

    // Clean up local file after upload
    await unlink(outputPath).catch(() => {})

    // Chain: preprocess → transcribe
    await TranscribeJob.dispatch({ episodeId })
  }

  async failed(error: Error): Promise<void> {
    const db = useDB()
    await db
      .update(episodes)
      .set({ status: 'failed' })
      .where(eq(episodes.id, this.payload.episodeId))

    console.error(`[PreprocessAudioJob] Episode ${this.payload.episodeId} failed:`, error.message)
  }
}
