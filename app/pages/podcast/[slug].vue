<template>
  <div v-if="data">
    <div class="podcast-header">
      <img
        v-if="data.podcast.artworkUrl"
        :src="data.podcast.artworkUrl"
        :alt="data.podcast.title"
        class="podcast-artwork"
      />
      <div>
        <h1 class="page-title">{{ data.podcast.title }}</h1>
        <p v-if="data.podcast.description" class="description">
          {{ data.podcast.description }}
        </p>
        <p class="meta">{{ data.episodes.length }} episodios</p>
      </div>
    </div>

    <section v-if="data.episodes.length > 0" class="section">
      <h2 class="section-title">Episodios</h2>
      <div class="episodes-list">
        <article v-for="ep in data.episodes" :key="ep.id" class="episode-card">
          <div class="episode-meta">
            <span v-if="ep.publishedAt" class="episode-date">
              {{ new Date(ep.publishedAt).toLocaleDateString("es-CO") }}
            </span>
            <span v-if="ep.durationSeconds" class="episode-duration">
              {{ Math.round(ep.durationSeconds / 60) }} min
            </span>
            <span :class="['status', `status-${ep.status}`]">{{
              ep.status
            }}</span>
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
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { data } = await useFetch(`/api/podcasts/${route.params.slug}`);

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Podcast no encontrado",
  });
}
</script>

<style scoped>
.podcast-header {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 2rem;
}
.podcast-artwork {
  width: 120px;
  height: 120px;
  border-radius: 0.75rem;
  object-fit: cover;
  flex-shrink: 0;
}
.page-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.description {
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}
.meta {
  color: #6b7280;
  font-size: 0.875rem;
}
.section {
  margin-bottom: 2rem;
}
.section-title {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #374151;
}
.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
.episode-date {
  color: #6b7280;
}
.episode-duration {
  color: #6b7280;
}
.status {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}
.status-done {
  background: #d1fae5;
  color: #065f46;
}
.status-pending {
  background: #fef3c7;
  color: #92400e;
}
.status-processing {
  background: #dbeafe;
  color: #1e40af;
}
.status-failed {
  background: #fee2e2;
  color: #991b1b;
}
.episode-title {
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
</style>
