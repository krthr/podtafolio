import { Job } from '@boringnode/queue'
import { eq, sql } from 'drizzle-orm'
import { episodes, transcripts, transcriptChunks } from '../../database/schema'
import { chunkTranscript, embedChunks } from '../../services/search'
import InvalidateCacheJob from './invalidate-cache'

export interface EmbedChunksPayload {
  episodeId: number
}

export default class EmbedChunksJob extends Job<EmbedChunksPayload> {
  static options = {
    queue: 'default',
    timeout: '15m',
  }

  async execute(): Promise<void> {
    const db = useDB()
    const { episodeId } = this.payload

    // Get clean transcript
    const [transcript] = await db
      .select({ id: transcripts.id, cleanText: transcripts.cleanText })
      .from(transcripts)
      .where(eq(transcripts.episodeId, episodeId))
      .limit(1)

    if (!transcript?.cleanText) {
      console.log(`[EmbedChunksJob] Episode ${episodeId}: no clean transcript, skipping`)
      await InvalidateCacheJob.dispatch({ episodeId })
      return
    }

    // 8.1 — Chunk the transcript
    const chunks = chunkTranscript(transcript.cleanText)
    console.log(`[EmbedChunksJob] Episode ${episodeId}: ${chunks.length} chunks`)

    // 8.2 — Embed all chunks
    const embeddings = await embedChunks(chunks.map((c) => c.text))

    // 8.3 — Store chunks with embeddings in transcript_chunks
    // Delete existing chunks for this episode first (in case of re-processing)
    await db
      .delete(transcriptChunks)
      .where(eq(transcriptChunks.episodeId, episodeId))

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(transcriptChunks).values({
        transcriptId: transcript.id,
        episodeId,
        chunkIndex: chunks[i]!.chunkIndex,
        text: chunks[i]!.text,
        embedding: embeddings[i]!,
        startOffset: chunks[i]!.startOffset,
        endOffset: chunks[i]!.endOffset,
      })
    }

    // Mark episode as done
    await db
      .update(episodes)
      .set({ status: 'done' })
      .where(eq(episodes.id, episodeId))

    console.log(`[EmbedChunksJob] Episode ${episodeId}: stored ${chunks.length} embedded chunks`)

    // Chain: embed-chunks → invalidate-cache (final stage)
    await InvalidateCacheJob.dispatch({ episodeId })
  }

  async failed(error: Error): Promise<void> {
    const db = useDB()
    await db
      .update(episodes)
      .set({ status: 'failed' })
      .where(eq(episodes.id, this.payload.episodeId))

    console.error(`[EmbedChunksJob] Episode ${this.payload.episodeId} failed:`, error.message)
  }
}
