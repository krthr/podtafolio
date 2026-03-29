/**
 * Seed script: registers an initial curated list of Colombian podcasts.
 *
 * Usage: npx tsx scripts/seed-podcasts.ts
 *
 * Requires NUXT_DATABASE_URL to be set in .env
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import RSSParser from 'rss-parser'
import * as schema from '../server/database/schema'

const parser = new RSSParser()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Curated list of Colombian podcasts
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

async function main() {
  const databaseUrl = process.env.NUXT_DATABASE_URL
  if (!databaseUrl) {
    console.error('NUXT_DATABASE_URL is required. Set it in .env')
    process.exit(1)
  }

  const db = drizzle(databaseUrl, { schema })

  console.log(`Seeding ${SEED_PODCASTS.length} podcasts...`)

  let created = 0
  let skipped = 0

  for (const seed of SEED_PODCASTS) {
    // Check for existing
    const existing = await db
      .select()
      .from(schema.podcasts)
      .where(eq(schema.podcasts.feedUrl, seed.feedUrl))
      .limit(1)

    if (existing.length > 0) {
      console.log(`  SKIP: ${seed.title} (already exists)`)
      skipped++
      continue
    }

    // Try to parse feed for metadata
    let feedMeta: { title?: string; description?: string; image?: string; language?: string } = {}
    try {
      const feed = await parser.parseURL(seed.feedUrl)
      feedMeta = {
        title: feed.title,
        description: feed.description,
        image: feed.image?.url || feed.itunes?.image,
        language: feed.language,
      }
    } catch (err) {
      console.warn(`  WARN: Could not parse feed for ${seed.title}`)
    }

    const title = feedMeta.title || seed.title
    const slug = `${slugify(title)}-${Date.now().toString(36)}`

    await db.insert(schema.podcasts).values({
      title,
      slug,
      feedUrl: seed.feedUrl,
      artworkUrl: feedMeta.image || null,
      description: feedMeta.description || null,
      language: feedMeta.language || 'es',
    })

    console.log(`  OK: ${title}`)
    created++
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
