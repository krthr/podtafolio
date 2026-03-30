<template>
  <div v-if="data">
    <h1 class="page-title">{{ data.entity.canonicalName }}</h1>
    <p class="meta">
      <span class="entity-type">{{ data.entity.type }}</span>
      <span v-if="data.entity.aliases?.length" class="aliases">
        Tambien conocido como: {{ data.entity.aliases.join(', ') }}
      </span>
    </p>
    <p v-if="data.entity.description" class="description">{{ data.entity.description }}</p>

    <!-- Related Topics -->
    <section v-if="data.relatedTopics.length > 0" class="section">
      <h2 class="section-title">Temas relacionados</h2>
      <div class="tags">
        <NuxtLink
          v-for="t in data.relatedTopics"
          :key="t.id"
          :to="`/topic/${t.slug}`"
          class="tag"
        >
          {{ t.name }}
        </NuxtLink>
      </div>
    </section>

    <!-- Episode Mentions -->
    <section v-if="data.episodeMentions.length > 0" class="section">
      <h2 class="section-title">Mencionado en</h2>
      <div class="episodes-list">
        <article v-for="ep in data.episodeMentions" :key="ep.episodeId" class="episode-card">
          <div class="episode-meta">
            <NuxtLink :to="`/podcast/${ep.podcastSlug}`" class="podcast-name">
              {{ ep.podcastTitle }}
            </NuxtLink>
            <span v-if="ep.publishedAt" class="episode-date">
              {{ new Date(ep.publishedAt).toLocaleDateString('es-CO') }}
            </span>
            <span class="mention-count">{{ ep.mentionCount }} menciones</span>
          </div>
          <NuxtLink :to="`/episode/${ep.episodeSlug}`" class="episode-title">
            {{ ep.episodeTitle }}
          </NuxtLink>
          <div v-if="ep.contextSnippets" class="snippets">
            <p v-for="(snippet, i) in (ep.contextSnippets as string[]).slice(0, 2)" :key="i" class="snippet">
              "{{ snippet }}"
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch(`/api/entities/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Entidad no encontrada' })
}
</script>

<style scoped>
.page-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
.meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; font-size: 0.875rem; }
.entity-type { background: #e5e7eb; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; text-transform: uppercase; }
.aliases { color: #6b7280; }
.description { color: #4b5563; margin-bottom: 1.5rem; }
.section { margin-bottom: 2rem; }
.section-title { font-size: 1.125rem; margin-bottom: 1rem; color: #374151; }
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag {
  padding: 0.375rem 0.625rem; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 0.375rem; font-size: 0.8125rem; color: #1a1a1a;
}
.tag:hover { border-color: #2563eb; text-decoration: none; }
.episodes-list { display: flex; flex-direction: column; gap: 1rem; }
.episode-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; }
.episode-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; font-size: 0.8125rem; }
.podcast-name { font-weight: 500; color: #2563eb; }
.episode-date { color: #6b7280; }
.mention-count { color: #6b7280; font-size: 0.75rem; }
.episode-title { font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 0.5rem; }
.episode-title:hover { color: #2563eb; text-decoration: none; }
.snippets { margin-top: 0.5rem; }
.snippet { font-size: 0.8125rem; color: #6b7280; font-style: italic; margin-bottom: 0.25rem; }
</style>
