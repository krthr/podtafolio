/**
 * Test script: runs the content analysis on a sample transcript.
 *
 * Usage: npx tsx scripts/test-analysis.ts
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import * as schema from '../server/database/schema'

// We can't import the server service directly (uses Nuxt auto-imports),
// so we inline the schema and call here.
import { z } from 'zod'

const analysisSchema = z.object({
  adSegments: z.array(
    z.object({
      text: z.string(),
      reason: z.string(),
    }),
  ),
  cleanText: z.string(),
  topics: z.array(
    z.object({
      name: z.string(),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['person', 'org', 'place', 'event', 'other']),
      mentionCount: z.number(),
      contextSnippets: z.array(z.string()).max(3),
    }),
  ),
  summary: z.object({
    text: z.string(),
    keyPoints: z.array(z.string()),
  }),
})

const SAMPLE_TRANSCRIPT = `
Bienvenidos a nuestro podcast sobre la actualidad colombiana. Hoy vamos a hablar sobre la reforma pensional que se está discutiendo en el Congreso.

Este episodio es presentado por Rappi. Descarga Rappi y usa el código PODCAST para obtener un 20% de descuento en tu primer pedido.

Bueno, como decíamos, la reforma pensional del presidente Gustavo Petro ha generado un debate intenso en Colombia. El ministro de Hacienda, Ricardo Bonilla, presentó los detalles del proyecto ante la Comisión Séptima del Senado.

Los puntos principales de la reforma incluyen: primero, la creación de un pilar solidario para los adultos mayores que no alcanzaron a cotizar. Segundo, un pilar contributivo que modificaría el sistema actual de pensiones.

La senadora María del Rosario Guerra del Centro Democrático ha sido una de las voces más críticas, argumentando que la reforma podría afectar la sostenibilidad fiscal del país. Por otro lado, el senador Gustavo Bolívar del Pacto Histórico defiende la propuesta como necesaria para cerrar la brecha de desigualdad.

En Bogotá, las manifestaciones a favor y en contra de la reforma han sido constantes. La Central Unitaria de Trabajadores, la CUT, ha expresado su apoyo parcial, pidiendo modificaciones en algunos artículos.

Antes de continuar, un mensaje de nuestro patrocinador. Bancolombia te ofrece las mejores tasas para tu crédito hipotecario. Visita bancolombia.com para más información.

Volviendo al tema, el impacto de esta reforma se sentiría especialmente en ciudades como Medellín, Cali y Barranquilla, donde la informalidad laboral supera el 60%. La ANDI, la Asociación Nacional de Empresarios, ha pedido un diálogo más amplio antes de aprobar el proyecto.

En resumen, la reforma pensional es uno de los temas más importantes de la agenda legislativa de 2024 y su resultado definirá el futuro del sistema de protección social en Colombia.

Gracias por escucharnos. No olviden suscribirse y dejarnos sus comentarios.
`

async function main() {
  const databaseUrl = process.env.NUXT_DATABASE_URL
  const geminiKey = process.env.NUXT_GOOGLE_GENERATIVE_AI_API_KEY
  if (!databaseUrl || !geminiKey) {
    console.error('NUXT_DATABASE_URL and NUXT_GOOGLE_GENERATIVE_AI_API_KEY required in .env')
    process.exit(1)
  }

  const db = drizzle(databaseUrl, { schema })

  // Get first podcast to attach our test episode
  const [podcast] = await db.select().from(schema.podcasts).limit(1)
  if (!podcast) {
    console.error('No podcasts found. Run seed first.')
    process.exit(1)
  }

  // Create a test episode
  const [episode] = await db
    .insert(schema.episodes)
    .values({
      podcastId: podcast.id,
      title: 'Test: Reforma Pensional',
      slug: `test-reforma-pensional-${Date.now().toString(36)}`,
      guid: `test-${Date.now()}`,
      status: 'processing',
    })
    .returning()

  // Insert raw transcript
  await db.insert(schema.transcripts).values({
    episodeId: episode.id,
    rawText: SAMPLE_TRANSCRIPT.trim(),
  })

  console.log(`Created test episode #${episode.id}. Running analysis...`)

  // Run analysis
  const google = createGoogleGenerativeAI({ apiKey: geminiKey })
  const { object } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: analysisSchema,
    system: `You are an expert podcast content analyst specializing in Colombian Spanish media.

Analyze the following podcast transcript and return a structured analysis with:
1. Ad Segments: Identify advertisements/sponsor segments. Extract the exact text.
2. Clean Text: Return the transcript with ad segments removed.
3. Topics: Extract 3-8 main topics with names (Spanish) and relevance scores (0-1).
4. Entities: Extract named entities (people, orgs, places, events) with type, mention count, and context snippets.
5. Summary: 2-3 paragraph summary in Spanish + key takeaways list.`,
    prompt: SAMPLE_TRANSCRIPT.trim(),
  })

  console.log('\n=== RESULTS ===\n')

  console.log(`Ad segments found: ${object.adSegments.length}`)
  for (const ad of object.adSegments) {
    console.log(`  - "${ad.text.slice(0, 80)}..." (${ad.reason})`)
  }

  console.log(`\nTopics: ${object.topics.length}`)
  for (const t of object.topics) {
    console.log(`  - ${t.name} (relevance: ${t.relevanceScore})`)
  }

  console.log(`\nEntities: ${object.entities.length}`)
  for (const e of object.entities) {
    console.log(`  - ${e.name} [${e.type}] (${e.mentionCount} mentions)`)
  }

  console.log(`\nSummary:\n${object.summary.text}`)
  console.log(`\nKey Points:`)
  for (const kp of object.summary.keyPoints) {
    console.log(`  • ${kp}`)
  }

  // Clean up test data
  await db.delete(schema.transcripts).where(eq(schema.transcripts.episodeId, episode.id))
  await db.delete(schema.episodes).where(eq(schema.episodes.id, episode.id))
  console.log('\nTest data cleaned up.')

  process.exit(0)
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
