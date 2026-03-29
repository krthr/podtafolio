import { Job } from '@boringnode/queue'
import { eq, and, inArray } from 'drizzle-orm'
import RSSParser from 'rss-parser'
import { podcasts, episodes } from '../../database/schema'
import DownloadAudioJob from './download-audio'

const parser = new RSSParser()

export interface FeedPollPayload {
  /** If set, poll only this podcast. Otherwise poll all. */
  podcastId?: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default class FeedPollJob extends Job<FeedPollPayload> {
  static options = {
    queue: 'default',
    timeout: '10m',
  }

  async execute(): Promise<void> {
    const db = useDB()

    // Get podcasts to poll
    let podcastList
    if (this.payload.podcastId) {
      podcastList = await db
        .select()
        .from(podcasts)
        .where(eq(podcasts.id, this.payload.podcastId))
    } else {
      podcastList = await db.select().from(podcasts)
    }

    console.log(`[FeedPollJob] Polling ${podcastList.length} podcast(s)`)

    for (const podcast of podcastList) {
      try {
        await this.pollFeed(db, podcast)
      } catch (err) {
        console.error(`[FeedPollJob] Error polling ${podcast.title}:`, err)
        // Continue to next podcast rather than failing the whole job
      }
    }
  }

  private async pollFeed(
    db: ReturnType<typeof useDB>,
    podcast: typeof podcasts.$inferSelect,
  ): Promise<void> {
    const feed = await parser.parseURL(podcast.feedUrl)
    if (!feed.items || feed.items.length === 0) return

    // Get existing GUIDs for this podcast to detect new episodes
    const existingEpisodes = await db
      .select({ guid: episodes.guid })
      .from(episodes)
      .where(eq(episodes.podcastId, podcast.id))

    const existingGuids = new Set(existingEpisodes.map((e) => e.guid))

    let newCount = 0
    for (const item of feed.items) {
      const guid = item.guid || item.link || item.title
      if (!guid || existingGuids.has(guid)) continue

      const enclosureUrl = item.enclosure?.url
      if (!enclosureUrl) continue // Skip episodes without audio

      const title = item.title || 'Untitled Episode'
      const slug = `${slugify(title)}-${Date.now().toString(36)}`

      const [episode] = await db
        .insert(episodes)
        .values({
          podcastId: podcast.id,
          title,
          slug,
          guid,
          enclosureUrl,
          contentLength: item.enclosure?.length
            ? parseInt(String(item.enclosure.length), 10)
            : null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          status: 'pending',
        })
        .returning()

      // Enqueue download job for this new episode
      await DownloadAudioJob.dispatch({
        episodeId: episode.id,
        enclosureUrl,
      })

      newCount++
    }

    if (newCount > 0) {
      console.log(`[FeedPollJob] ${podcast.title}: ${newCount} new episode(s) enqueued`)
    }
  }
}
