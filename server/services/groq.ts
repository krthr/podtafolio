import Groq from 'groq-sdk'

let _client: Groq | undefined

export function useGroq(): Groq {
  if (!_client) {
    const config = useRuntimeConfig()
    _client = new Groq({
      apiKey: config.groqApiKey,
      maxRetries: 3,
      timeout: 5 * 60 * 1000, // 5 minutes for long audio files
    })
  }
  return _client
}

/**
 * Transcribe audio from an object storage URL using Groq Whisper.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const groq = useGroq()

  const transcription = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3-turbo',
    url: audioUrl,
    language: 'es',
    response_format: 'text',
  })

  return typeof transcription === 'string'
    ? transcription
    : transcription.text
}
