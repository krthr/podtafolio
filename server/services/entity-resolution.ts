import { embed, generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { entities, episodeEntities } from '../database/schema'
import type { RawEntity } from '../queue/jobs/resolve-entities'

// ── Config ───────────────────────────────────────────────

const EMBEDDING_MODEL = google.textEmbeddingModel('gemini-embedding-2-preview', {
  outputDimensionality: 768,
})
const LLM_MODEL = google('gemini-3-flash')

/** Above this: auto-match (confirmed same entity) */
const HIGH_SIMILARITY_THRESHOLD = 0.85
/** Below this: auto-create (confirmed new entity) */
const LOW_SIMILARITY_THRESHOLD = 0.70

// ── 7.1 — Entity Embedding ──────────────────────────────

/**
 * Embed an entity name using Vercel AI SDK's `embed` function.
 */
export async function embedEntity(name: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: name,
  })
  return embedding
}

// ── 7.2 — pgvector Similarity Search ────────────────────

interface EntityCandidate {
  id: number
  canonicalName: string
  slug: string
  type: string
  aliases: string[] | null
  similarity: number
}

/**
 * Find existing entities similar to the given embedding using pgvector cosine distance.
 * Returns candidates above the low threshold, ordered by similarity descending.
 */
export async function findSimilarEntities(
  db: ReturnType<typeof useDB>,
  queryEmbedding: number[],
): Promise<EntityCandidate[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const results = await db.execute(sql`
    SELECT
      id,
      canonical_name,
      slug,
      type,
      aliases,
      1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM entities
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingStr}::vector) > ${LOW_SIMILARITY_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT 5
  `)

  return (results.rows as any[]).map((row) => ({
    id: row.id,
    canonicalName: row.canonical_name,
    slug: row.slug,
    type: row.type,
    aliases: row.aliases,
    similarity: Number(row.similarity),
  }))
}

// ── 7.3 — LLM Confirmation for Borderline Matches ──────

const confirmMatchSchema = z.object({
  isSameEntity: z.boolean().describe('Whether the mention refers to the same entity as the candidate'),
  reason: z.string().describe('Brief explanation of the decision'),
})

/**
 * Use Gemini Flash to confirm whether a mention matches an existing entity
 * when similarity falls in the borderline range.
 */
export async function confirmEntityMatch(
  mentionName: string,
  mentionType: string,
  contextSnippets: string[],
  candidate: EntityCandidate,
): Promise<boolean> {
  const { object } = await generateObject({
    model: LLM_MODEL,
    schema: confirmMatchSchema,
    system: `You are an entity resolution expert for Colombian podcast content. Determine if two entity mentions refer to the same real-world entity. Consider aliases, nicknames, abbreviations, and contextual clues.`,
    prompt: `Do these refer to the same entity?

Mention: "${mentionName}" (type: ${mentionType})
Context snippets: ${contextSnippets.slice(0, 2).join(' | ')}

Existing entity: "${candidate.canonicalName}" (type: ${candidate.type})
Known aliases: ${candidate.aliases?.join(', ') || 'none'}

Answer whether they are the same entity.`,
  })

  return object.isSameEntity
}

// ── 7.4 — Canonical Entity Creation ─────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Create a new canonical entity with embedding.
 */
export async function createCanonicalEntity(
  db: ReturnType<typeof useDB>,
  raw: RawEntity,
  entityEmbedding: number[],
): Promise<number> {
  const slug = slugify(raw.name)

  const [entity] = await db
    .insert(entities)
    .values({
      canonicalName: raw.name,
      slug,
      type: raw.type,
      aliases: [raw.name],
      embedding: entityEmbedding,
      mentionCount: raw.mentionCount,
    })
    .onConflictDoUpdate({
      target: entities.slug,
      set: {
        mentionCount: sql`${entities.mentionCount} + ${raw.mentionCount}`,
      },
    })
    .returning({ id: entities.id })

  return entity!.id
}

/**
 * Link an entity mention to an existing entity: update mention count, add alias if new.
 */
export async function linkToExistingEntity(
  db: ReturnType<typeof useDB>,
  entityId: number,
  raw: RawEntity,
): Promise<void> {
  const [existing] = await db
    .select({ aliases: entities.aliases })
    .from(entities)
    .where(eq(entities.id, entityId))
    .limit(1)

  const currentAliases = existing?.aliases ?? []
  const nameNorm = raw.name.toLowerCase()
  const hasAlias = currentAliases.some((a) => a.toLowerCase() === nameNorm)

  await db
    .update(entities)
    .set({
      mentionCount: sql`${entities.mentionCount} + ${raw.mentionCount}`,
      ...(hasAlias ? {} : { aliases: [...currentAliases, raw.name] }),
    })
    .where(eq(entities.id, entityId))
}

// ── 7.5 — Resolve All Entities for an Episode ──────────

/**
 * Process all raw entity mentions from the analyze step:
 * embed → find similar → confirm/create → link to episode.
 */
export async function resolveEntities(
  db: ReturnType<typeof useDB>,
  episodeId: number,
  rawEntities: RawEntity[],
): Promise<void> {
  for (const raw of rawEntities) {
    // 7.1 — Embed the entity mention
    const entityEmbedding = await embedEntity(raw.name)

    // 7.2 — Search for similar existing entities
    const candidates = await findSimilarEntities(db, entityEmbedding)

    let resolvedEntityId: number

    if (candidates.length === 0) {
      // No match — create new canonical entity (7.4)
      resolvedEntityId = await createCanonicalEntity(db, raw, entityEmbedding)
      console.log(`[EntityResolution] Created new entity: "${raw.name}" (${raw.type})`)
    } else {
      const best = candidates[0]!

      if (best.similarity >= HIGH_SIMILARITY_THRESHOLD) {
        // High confidence match — link directly
        resolvedEntityId = best.id
        await linkToExistingEntity(db, resolvedEntityId, raw)
        console.log(`[EntityResolution] Matched "${raw.name}" → "${best.canonicalName}" (${best.similarity.toFixed(3)})`)
      } else {
        // Borderline — use LLM confirmation (7.3)
        const isMatch = await confirmEntityMatch(
          raw.name,
          raw.type,
          raw.contextSnippets,
          best,
        )

        if (isMatch) {
          resolvedEntityId = best.id
          await linkToExistingEntity(db, resolvedEntityId, raw)
          console.log(`[EntityResolution] LLM confirmed "${raw.name}" → "${best.canonicalName}"`)
        } else {
          // LLM says different entity — create new
          resolvedEntityId = await createCanonicalEntity(db, raw, entityEmbedding)
          console.log(`[EntityResolution] LLM rejected match, created new: "${raw.name}"`)
        }
      }
    }

    // Populate episode_entities junction
    await db
      .insert(episodeEntities)
      .values({
        episodeId,
        entityId: resolvedEntityId,
        mentionCount: raw.mentionCount,
        contextSnippets: raw.contextSnippets,
      })
      .onConflictDoUpdate({
        target: [episodeEntities.episodeId, episodeEntities.entityId],
        set: {
          mentionCount: sql`${episodeEntities.mentionCount} + ${raw.mentionCount}`,
        },
      })
  }
}
