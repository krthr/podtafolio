<template>
  <div v-if="data">
    <!-- Episode Header -->
    <div class="episode-header">
      <NuxtLink
        :to="`/podcast/${data.episode.podcastSlug}`"
        class="podcast-name"
      >
        {{ data.episode.podcastTitle }}
      </NuxtLink>
      <h1 class="page-title">{{ data.episode.title }}</h1>
      <div class="meta">
        <span v-if="data.episode.publishedAt">
          {{ new Date(data.episode.publishedAt).toLocaleDateString("es-CO") }}
        </span>
        <span v-if="data.episode.durationSeconds">
          {{ Math.round(data.episode.durationSeconds / 60) }} min
        </span>
      </div>
    </div>

    <!-- Summary -->
    <section v-if="data.summary" class="section">
      <h2 class="section-title">Resumen</h2>
      <p class="summary-text">{{ data.summary.summaryText }}</p>
      <div v-if="data.summary.keyPoints" class="key-points">
        <h3 class="subsection-title">Puntos clave</h3>
        <ul>
          <li v-for="(point, i) in data.summary.keyPoints as string[]" :key="i">
            {{ point }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Topics -->
    <section v-if="data.topics.length > 0" class="section">
      <h2 class="section-title">Temas</h2>
      <div class="tags">
        <NuxtLink
          v-for="t in data.topics"
          :key="t.id"
          :to="`/topic/${t.slug}`"
          class="tag"
        >
          {{ t.name }}
        </NuxtLink>
      </div>
    </section>

    <!-- Entities -->
    <section v-if="data.entities.length > 0" class="section">
      <h2 class="section-title">Entidades mencionadas</h2>
      <div class="entities-list">
        <div v-for="e in data.entities" :key="e.id" class="entity-item">
          <NuxtLink :to="`/entity/${e.slug}`" class="entity-name">
            {{ e.canonicalName }}
          </NuxtLink>
          <span class="entity-type">{{ e.type }}</span>
          <span class="entity-mentions">{{ e.mentionCount }} menciones</span>
          <div v-if="e.contextSnippets" class="snippets">
            <p
              v-for="(snippet, i) in (e.contextSnippets as string[]).slice(
                0,
                2,
              )"
              :key="i"
              class="snippet"
            >
              "{{ snippet }}"
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Transcript -->
    <section v-if="data.transcript" class="section">
      <h2 class="section-title">Transcripcion</h2>
      <div class="transcript">{{ data.transcript }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { data } = await useFetch(`/api/episodes/${route.params.slug}`);

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Episodio no encontrado",
  });
}
</script>

<style scoped>
.episode-header {
  margin-bottom: 2rem;
}
.podcast-name {
  font-size: 0.875rem;
  color: #2563eb;
  font-weight: 500;
}
.page-title {
  font-size: 1.5rem;
  margin: 0.25rem 0 0.5rem;
}
.meta {
  display: flex;
  gap: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.section {
  margin-bottom: 2rem;
}
.section-title {
  font-size: 1.125rem;
  margin-bottom: 0.75rem;
  color: #374151;
}
.subsection-title {
  font-size: 0.9375rem;
  margin: 0.75rem 0 0.5rem;
  color: #374151;
}

.summary-text {
  font-size: 0.9375rem;
  color: #1a1a1a;
  line-height: 1.7;
  white-space: pre-line;
}

.key-points ul {
  padding-left: 1.25rem;
}
.key-points li {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 0.375rem;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  padding: 0.375rem 0.625rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: #1a1a1a;
}
.tag:hover {
  border-color: #2563eb;
  text-decoration: none;
}

.entities-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.entity-item {
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}
.entity-name {
  font-weight: 600;
  color: #2563eb;
}
.entity-type {
  font-size: 0.6875rem;
  background: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
  text-transform: uppercase;
}
.entity-mentions {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: 0.5rem;
}
.snippets {
  margin-top: 0.375rem;
}
.snippet {
  font-size: 0.8125rem;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 0.125rem;
}

.transcript {
  font-size: 0.875rem;
  line-height: 1.8;
  color: #374151;
  white-space: pre-line;
  max-height: 600px;
  overflow-y: auto;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}
</style>
