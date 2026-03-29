import { Job } from '@boringnode/queue'
import { eq } from 'drizzle-orm'
import Groq from 'groq-sdk'
import { episodes, transcripts } from '../../database/schema'
import { transcribeAudio } from '../../services/groq'
import { getAudioUrl } from '../../utils/storage'
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
    const db = useDB()
    const { episodeId } = this.payload

    // Get the episode's storage key
    const [episode] = await db
      .select({ audioStorageKey: episodes.audioStorageKey })
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1)

    if (!episode?.audioStorageKey) {
      throw new Error(`Episode ${episodeId}: no audio storage key found`)
    }

    // Build the public URL for Groq
    const audioUrl = await getAudioUrl(episode.audioStorageKey)

    // Transcribe via Groq Whisper
    const rawText = await transcribeAudio(audioUrl)

    if (!rawText || rawText.trim().length === 0) {
      throw new Error(`Episode ${episodeId}: transcription returned empty text`)
    }

    // Store transcript (upsert in case of reprocessing)
    const existing = await db
      .select({ id: transcripts.id })
      .from(transcripts)
      .where(eq(transcripts.episodeId, episodeId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(transcripts)
        .set({ rawText, cleanText: null })
        .where(eq(transcripts.episodeId, episodeId))
    } else {
      await db.insert(transcripts).values({
        episodeId,
        rawText,
        cleanText: null,
      })
    }

    console.log(`[TranscribeJob] Episode ${episodeId}: transcribed (${rawText.length} chars)`)

    // Chain: transcribe → analyze
    await AnalyzeJob.dispatch({ episodeId })
  }

  async failed(error: Error): Promise<void> {
    const db = useDB()

    // Log specific Groq error details
    if (error instanceof Groq.APIError) {
      console.error(
        `[TranscribeJob] Episode ${this.payload.episodeId} Groq API error:`,
        `status=${error.status}`,
        error.message,
      )
    } else {
      console.error(`[TranscribeJob] Episode ${this.payload.episodeId} failed:`, error.message)
    }

    await db
      .update(episodes)
      .set({ status: 'failed' })
      .where(eq(episodes.id, this.payload.episodeId))
  }
}
