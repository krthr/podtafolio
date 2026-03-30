import { eq, count } from 'drizzle-orm'
import RSSParser from 'rss-parser'
import { podcasts } from '../database/schema'

const parser = new RSSParser()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SEED_PODCASTS = [
  { feedUrl: 'https://feeds.simplecast.com/DeLbQ_cr', title: 'La Pulla' },
  { feedUrl: 'https://anchor.fm/s/10b6e484/podcast/rss', title: 'Presunto Podcast' },
  { feedUrl: 'https://feeds.megaphone.fm/dianaupodcast', title: 'Diana Uribe Podcast' },
  { feedUrl: 'https://anchor.fm/s/3e863a8/podcast/rss', title: 'Las Igualadas' },
  { feedUrl: 'https://anchor.fm/s/8f90d24/podcast/rss', title: 'No Ficción' },
  { feedUrl: 'https://feeds.buzzsprout.com/895972.rss', title: 'Más allá del dinero' },
  { feedUrl: 'https://anchor.fm/s/1327df18/podcast/rss', title: 'Historias de Colombia' },
  { feedUrl: 'https://anchor.fm/s/56c3e48/podcast/rss', title: 'El Primer Café' },
  { feedUrl: 'https://anchor.fm/s/84fb8d80/podcast/rss', title: 'Colombia Check' },
  { feedUrl: 'https://anchor.fm/s/f11e2d8/podcast/rss', title: 'Relato Nacional' },
  { feedUrl: 'https://feeds.simplecast.com/SUvfnMxE', title: 'La No Ficción' },
  { feedUrl: 'https://anchor.fm/s/226aa5a8/podcast/rss', title: 'Café La República' },
  { feedUrl: 'https://anchor.fm/s/29c78ac0/podcast/rss', title: 'Economía Para Todos' },
  { feedUrl: 'https://anchor.fm/s/5560e598/podcast/rss', title: 'Señal de la Mañana' },
  { feedUrl: 'https://anchor.fm/s/2cf99efc/podcast/rss', title: 'Los Danieles' },
  { feedUrl: 'https://anchor.fm/s/34d38a74/podcast/rss', title: 'Semana en Podcast' },
  { feedUrl: 'https://anchor.fm/s/8b4ead0/podcast/rss', title: 'Pacifista Podcast' },
  { feedUrl: 'https://anchor.fm/s/4f3f6c30/podcast/rss', title: 'El Colombiano Podcast' },
  { feedUrl: 'https://anchor.fm/s/a4a58a4/podcast/rss', title: 'Blu Radio Podcast' },
  { feedUrl: 'https://anchor.fm/s/38ff7e4c/podcast/rss', title: 'La W Podcast' },
]

export default defineNitroPlugin(async () => {
  const db = useDB()

  // Skip if podcasts already exist
  const [{ total }] = await db.select({ total: count() }).from(podcasts)
  if (total > 0) {
    console.log(`[Seed] ${total} podcasts already exist, skipping`)
    return
  }

  console.log(`[Seed] Seeding ${SEED_PODCASTS.length} podcasts...`)

  let created = 0
  let skipped = 0

  for (const seed of SEED_PODCASTS) {
    // Safety net: skip if this specific feed already exists
    const existing = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.feedUrl, seed.feedUrl))
      .limit(1)

    if (existing.length > 0) {
      skipped++
      continue
    }

    let feedMeta: { title?: string; description?: string; image?: string; language?: string } = {}
    try {
      const feed = await parser.parseURL(seed.feedUrl)
      feedMeta = {
        title: feed.title,
        description: feed.description,
        image: feed.image?.url || feed.itunes?.image,
        language: feed.language,
      }
    } catch {
      console.warn(`[Seed] Could not parse feed for ${seed.title}`)
    }

    const title = feedMeta.title || seed.title
    const slug = `${slugify(title)}-${Date.now().toString(36)}`

    await db.insert(podcasts).values({
      title,
      slug,
      feedUrl: seed.feedUrl,
      artworkUrl: feedMeta.image || null,
      description: feedMeta.description || null,
      language: feedMeta.language || 'es',
    })

    console.log(`[Seed] OK: ${title}`)
    created++
  }

  console.log(`[Seed] Done. Created: ${created}, Skipped: ${skipped}`)
})
