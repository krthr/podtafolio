<template>
  <div v-if="data">
    <h1 class="page-title">{{ data.topic.name }}</h1>
    <p v-if="data.topic.description" class="description">{{ data.topic.description }}</p>
    <p class="meta">{{ data.topic.episodeCount }} episodios</p>

    <!-- Related Entities -->
    <section v-if="data.relatedEntities.length > 0" class="section">
      <h2 class="section-title">Entidades relacionadas</h2>
      <div class="tags">
        <NuxtLink
          v-for="e in data.relatedEntities"
          :key="e.id"
          :to="`/entity/${e.slug}`"
          class="tag"
        >
          {{ e.canonicalName }}
          <span class="tag-type">{{ e.type }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Episodes -->
    <section v-if="data.relatedEpisodes.length > 0" class="section">
      <h2 class="section-title">Episodios</h2>
      <div class="episodes-list">
        <article v-for="ep in data.relatedEpisodes" :key="ep.id" class="episode-card">
          <div class="episode-meta">
            <NuxtLink :to="`/podcast/${ep.podcastSlug}`" class="podcast-name">
              {{ ep.podcastTitle }}
            </NuxtLink>
            <span v-if="ep.publishedAt" class="episode-date">
              {{ new Date(ep.publishedAt).toLocaleDateString('es-CO') }}
            </span>
          </div>
          <NuxtLink :to="`/episode/${ep.slug}`" class="episode-title">
            {{ ep.title }}
          </NuxtLink>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch(`/api/topics/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tema no encontrado' })
}
</script>

<style scoped>
.page-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
.description { color: #4b5563; margin-bottom: 0.5rem; }
.meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
.section { margin-bottom: 2rem; }
.section-title { font-size: 1.125rem; margin-bottom: 1rem; color: #374151; }
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.625rem; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 0.375rem; font-size: 0.8125rem; color: #1a1a1a;
}
.tag:hover { border-color: #2563eb; text-decoration: none; }
.tag-type { color: #9ca3af; font-size: 0.6875rem; }
.episodes-list { display: flex; flex-direction: column; gap: 0.75rem; }
.episode-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.75rem; }
.episode-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; font-size: 0.8125rem; }
.podcast-name { font-weight: 500; color: #2563eb; }
.episode-date { color: #6b7280; }
.episode-title { font-weight: 600; color: #1a1a1a; }
.episode-title:hover { color: #2563eb; text-decoration: none; }
</style>
