<template>
  <div class="admin-app">
    <header class="admin-header">
      <div class="admin-header-inner">
        <span class="admin-logo">Podtafolio Admin</span>
        <NuxtLink to="/" class="admin-back">&larr; Back to site</NuxtLink>
      </div>
    </header>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-app {
  min-height: 100vh;
  background: #f1f5f9;
}

.admin-header {
  background: #1e293b;
  color: #fff;
}

.admin-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-logo {
  font-size: 1.125rem;
  font-weight: 700;
}

.admin-back {
  color: #94a3b8;
  font-size: 0.875rem;
}

.admin-back:hover {
  color: #fff;
  text-decoration: none;
}

.admin-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
</style>
