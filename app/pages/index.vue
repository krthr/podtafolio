<template>
  <div>
    <h1 class="page-title">Descubre podcasts colombianos</h1>

    <template
      v-if="
        data &&
        (data.trendingTopics.length > 0 || data.recentEpisodes.length > 0)
      "
    >
      <!-- Trending Topics -->
      <section v-if="data.trendingTopics.length > 0" class="section">
        <h2 class="section-title">Temas en tendencia</h2>
        <div class="topics-grid">
          <NuxtLink
            v-for="topic in data.trendingTopics"
            :key="topic.id"
            :to="`/topic/${topic.slug}`"
            class="topic-card"
          >
            <span class="topic-name">{{ topic.name }}</span>
            <span class="topic-count">{{ topic.episodeCount }} episodios</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Recent Episodes -->
      <section v-if="data.recentEpisodes.length > 0" class="section">
        <h2 class="section-title">Episodios recientes</h2>
        <div class="episodes-list">
          <article
            v-for="ep in data.recentEpisodes"
            :key="ep.id"
            class="episode-card"
          >
            <div class="episode-meta">
              <NuxtLink :to="`/podcast/${ep.podcastSlug}`" class="podcast-name">
                {{ ep.podcastTitle }}
              </NuxtLink>
              <span v-if="ep.publishedAt" class="episode-date">
                {{ new Date(ep.publishedAt).toLocaleDateString("es-CO") }}
              </span>
            </div>
            <NuxtLink :to="`/episode/${ep.slug}`" class="episode-title">
              {{ ep.title }}
            </NuxtLink>
            <p v-if="ep.summary" class="episode-summary">
              {{ ep.summary.slice(0, 200)
              }}{{ ep.summary.length > 200 ? "..." : "" }}
            </p>
          </article>
        </div>
      </section>
    </template>

    <!-- Empty State -->
    <div v-else-if="!pending" class="empty-state">
      <p>Estamos preparando el contenido. Los podcasts se estan procesando.</p>
      <p>Mientras tanto, puedes intentar una busqueda.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data, pending } = await useFetch("/api/landing");
</script>

<style scoped>
.page-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #374151;
}

.topics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.topic-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  color: #1a1a1a;
  font-size: 0.875rem;
}

.topic-card:hover {
  border-color: #2563eb;
  text-decoration: none;
}

.topic-name {
  font-weight: 500;
}

.topic-count {
  color: #6b7280;
  font-size: 0.75rem;
}

.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.episode-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.episode-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.8125rem;
}

.podcast-name {
  font-weight: 500;
  color: #2563eb;
}

.episode-date {
  color: #6b7280;
}

.episode-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
  margin-bottom: 0.25rem;
}

.episode-title:hover {
  color: #2563eb;
  text-decoration: none;
}

.episode-summary {
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-state p {
  margin-bottom: 0.5rem;
}
</style>
