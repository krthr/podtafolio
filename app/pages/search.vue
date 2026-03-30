<template>
  <div>
    <h1 class="page-title">Resultados de busqueda</h1>

    <div v-if="pending" class="loading">
      Buscando y sintetizando respuesta...
    </div>

    <template v-else-if="data">
      <!-- AI Answer -->
      <div v-if="data.answer" class="answer-card">
        <div class="answer-label">Respuesta</div>
        <div class="answer-text" v-html="renderMarkdown(data.answer)" />
      </div>

      <!-- No results -->
      <div v-else class="no-results">
        <p>{{ data.message || "No se encontro contenido relevante." }}</p>
        <p>
          Intenta explorar los <NuxtLink to="/">temas en tendencia</NuxtLink>.
        </p>
      </div>

      <!-- Source Episodes -->
      <section v-if="data.sources && data.sources.length > 0" class="section">
        <h2 class="section-title">Fuentes</h2>
        <div class="sources-list">
          <article
            v-for="source in data.sources"
            :key="source.episodeId"
            class="source-card"
          >
            <NuxtLink
              :to="`/podcast/${source.podcastSlug}`"
              class="source-podcast"
            >
              {{ source.podcastTitle }}
            </NuxtLink>
            <NuxtLink
              :to="`/episode/${source.episodeSlug}`"
              class="source-episode"
            >
              {{ source.episodeTitle }}
            </NuxtLink>
            <span v-if="source.publishedAt" class="source-date">
              {{ new Date(source.publishedAt).toLocaleDateString("es-CO") }}
            </span>
          </article>
        </div>
      </section>
    </template>

    <div v-if="error" class="error">Error al buscar: {{ error.message }}</div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const q = computed(() => (route.query.q as string) || "");

const { data, pending, error } = await useFetch("/api/search", {
  method: "POST",
  body: computed(() => ({ query: q.value })),
  watch: [q],
  immediate: !!q.value,
});

function renderMarkdown(text: string): string {
  return text
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]/g, "<em>[$1]</em>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
</script>

<style scoped>
.page-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.answer-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.answer-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.answer-text {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #1a1a1a;
}

.answer-text :deep(p) {
  margin-bottom: 0.75rem;
}

.answer-text :deep(em) {
  color: #2563eb;
  font-style: normal;
  font-size: 0.8125rem;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.no-results p {
  margin-bottom: 0.5rem;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #374151;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-card {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.source-podcast {
  font-weight: 500;
  color: #2563eb;
}

.source-episode {
  color: #1a1a1a;
  font-weight: 500;
}

.source-date {
  color: #6b7280;
  font-size: 0.75rem;
}

.error {
  color: #dc2626;
  padding: 1rem;
  background: #fef2f2;
  border-radius: 0.375rem;
}
</style>
