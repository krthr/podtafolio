import { QueueManager, QueueSchemaService, Worker, Locator } from '@boringnode/queue'
import Knex from 'knex'
import { createQueueConfig } from '../queue/config'

// Import jobs for manual registration (Nitro doesn't support glob-based discovery)
import FeedPollJob from '../queue/jobs/feed-poll'
import DownloadAudioJob from '../queue/jobs/download-audio'
import PreprocessAudioJob from '../queue/jobs/preprocess-audio'
import TranscribeJob from '../queue/jobs/transcribe'
import AnalyzeJob from '../queue/jobs/analyze'
import ResolveEntitiesJob from '../queue/jobs/resolve-entities'
import EmbedChunksJob from '../queue/jobs/embed-chunks'
import InvalidateCacheJob from '../queue/jobs/invalidate-cache'

export default defineNitroPlugin(async (nitro) => {
  const databaseUrl = useRuntimeConfig().databaseUrl

  // Ensure queue tables exist
  const connection = Knex({
    client: 'pg',
    connection: databaseUrl,
  })
  const schemaService = new QueueSchemaService(connection)
  await schemaService.createJobsTable('queue_jobs')
  await schemaService.createSchedulesTable('queue_schedules')
  await connection.destroy()

  // Register job classes
  Locator.register('FeedPollJob', FeedPollJob)
  Locator.register('DownloadAudioJob', DownloadAudioJob)
  Locator.register('PreprocessAudioJob', PreprocessAudioJob)
  Locator.register('TranscribeJob', TranscribeJob)
  Locator.register('AnalyzeJob', AnalyzeJob)
  Locator.register('ResolveEntitiesJob', ResolveEntitiesJob)
  Locator.register('EmbedChunksJob', EmbedChunksJob)
  Locator.register('InvalidateCacheJob', InvalidateCacheJob)

  // Initialize QueueManager
  const config = createQueueConfig()
  await QueueManager.init(config)

  // Set up daily feed-poll schedule (every day at 03:00 UTC)
  await FeedPollJob.schedule({}).id('daily-feed-poll').cron('0 3 * * *')

  // Start the worker
  const worker = new Worker(config)

  // Register job classes again for the worker (separate context)
  Locator.register('FeedPollJob', FeedPollJob)
  Locator.register('DownloadAudioJob', DownloadAudioJob)
  Locator.register('PreprocessAudioJob', PreprocessAudioJob)
  Locator.register('TranscribeJob', TranscribeJob)
  Locator.register('AnalyzeJob', AnalyzeJob)
  Locator.register('ResolveEntitiesJob', ResolveEntitiesJob)
  Locator.register('EmbedChunksJob', EmbedChunksJob)
  Locator.register('InvalidateCacheJob', InvalidateCacheJob)

  worker.start(['default']).catch((err) => {
    console.error('[Queue Worker] Failed to start:', err)
  })

  console.log('[Queue] Worker started, processing jobs on "default" queue')

  // Graceful shutdown
  nitro.hooks.hook('close', async () => {
    await worker.stop()
    await QueueManager.destroy()
    console.log('[Queue] Worker stopped')
  })
})
