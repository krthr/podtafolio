import { eq } from 'drizzle-orm'
import RSSParser from 'rss-parser'
import { podcasts } from '../database/schema'

const parser = new RSSParser()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface RegisterPodcastInput {
  feedUrl: string
  title?: string
  appleId?: string
  podcastIndexId?: string
  artworkUrl?: string
  description?: string
  language?: string
}

/**
 * Register a podcast by feed URL. Fetches and parses the feed to fill
 * missing metadata. Deduplicates by feed_url.
 * Returns the podcast record (existing or newly created).
 */
export async function registerPodcast(input: RegisterPodcastInput) {
  const db = useDB()

  // Check for existing podcast by feed URL
  const existing = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.feedUrl, input.feedUrl))
    .limit(1)

  if (existing.length > 0) {
    return { podcast: existing[0], created: false }
  }

  // Parse feed to fill in missing metadata
  let feedMeta: { title?: string; description?: string; image?: string; language?: string } = {}
  try {
    const feed = await parser.parseURL(input.feedUrl)
    feedMeta = {
      title: feed.title,
      description: feed.description,
      image: feed.image?.url || feed.itunes?.image,
      language: feed.language,
    }
  } catch (err) {
    console.warn(`[registerPodcast] Failed to parse feed ${input.feedUrl}:`, err)
  }

  const title = input.title || feedMeta.title || 'Unknown Podcast'
  const baseSlug = slugify(title)
  // Ensure slug uniqueness by appending a random suffix
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const [podcast] = await db
    .insert(podcasts)
    .values({
      title,
      slug,
      feedUrl: input.feedUrl,
      appleId: input.appleId || null,
      podcastIndexId: input.podcastIndexId || null,
      artworkUrl: input.artworkUrl || feedMeta.image || null,
      description: input.description || feedMeta.description || null,
      language: input.language || feedMeta.language || 'es',
    })
    .returning()

  return { podcast, created: true }
}
