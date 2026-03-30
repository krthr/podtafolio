<template>
  <div class="app">
    <header class="header">
      <div class="header-inner">
        <NuxtLink to="/" class="logo">Podtafolio</NuxtLink>
        <form class="search-form" @submit.prevent="onSearch">
          <input
            v-model="query"
            type="search"
            placeholder="Buscar en podcasts colombianos..."
            class="search-input"
          />
          <button type="submit" class="search-btn">Buscar</button>
        </form>
      </div>
    </header>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const query = ref((route.query.q as string) || "");

watch(
  () => route.query.q,
  (q) => {
    if (typeof q === "string") query.value = q;
  },
);

function onSearch() {
  if (query.value.trim()) {
    router.push({ path: "/search", query: { q: query.value.trim() } });
  }
}
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
  background: #fafafa;
  line-height: 1.6;
}

a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.app {
  min-height: 100vh;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
}

.logo:hover {
  text-decoration: none;
}

.search-form {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  outline: none;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.search-btn {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.search-btn:hover {
  background: #1d4ed8;
}

.main {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
</style>
