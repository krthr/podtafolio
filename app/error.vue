<template>
  <div class="error-page">
    <h1 class="error-code">{{ error?.statusCode || 500 }}</h1>
    <p class="error-message">{{ error?.statusMessage || 'Algo salio mal' }}</p>
    <NuxtLink to="/" class="back-link">Volver al inicio</NuxtLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  error: { statusCode: number; statusMessage: string } | null
}>()
</script>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.error-code { font-size: 4rem; font-weight: 700; color: #d1d5db; margin-bottom: 0.5rem; }
.error-message { font-size: 1.125rem; color: #6b7280; margin-bottom: 1.5rem; }
.back-link { color: #2563eb; font-weight: 500; }
</style>
