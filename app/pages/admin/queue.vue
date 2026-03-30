<template>
  <NuxtLayout name="admin">
    <!-- Token prompt -->
    <div v-if="!token" class="auth-card">
      <h2>Admin Access</h2>
      <form @submit.prevent="submitToken">
        <input
          v-model="tokenInput"
          type="password"
          placeholder="Enter admin token"
          class="token-input"
        />
        <button type="submit" class="token-btn">Enter</button>
      </form>
      <p v-if="authError" class="auth-error">Invalid token</p>
    </div>

    <!-- Dashboard -->
    <div v-else>
      <div class="dashboard-header">
        <h1 class="page-title">Queue Dashboard</h1>
        <div class="refresh-controls">
          <button class="refresh-btn" @click="refresh()">Refresh</button>
          <label class="auto-toggle">
            <input v-model="autoRefresh" type="checkbox" />
            Auto (5s)
          </label>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        Failed to load queue data. {{ error.data?.error || "" }}
      </div>

      <template v-if="data">
        <!-- Summary cards -->
        <div class="summary-cards">
          <div
            v-for="s in allStatuses"
            :key="s"
            class="summary-card"
            :class="`status-${s}`"
          >
            <span class="summary-count">{{ getCount(s) }}</span>
            <span class="summary-label">{{ s }}</span>
          </div>
        </div>

        <!-- Schedules -->
        <section v-if="data.schedules.length > 0" class="section">
          <h2 class="section-title">Schedules</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cron</th>
                  <th>Status</th>
                  <th>Last Run</th>
                  <th>Next Run</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sch in data.schedules" :key="sch.id">
                  <td class="mono">{{ sch.id }}</td>
                  <td class="mono">
                    {{ sch.cron_expression || sch.every_ms + "ms" }}
                  </td>
                  <td>
                    <span class="badge" :class="`badge-${sch.status}`">{{
                      sch.status
                    }}</span>
                  </td>
                  <td>{{ formatTs(sch.last_run_at) }}</td>
                  <td>{{ formatTs(sch.next_run_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Jobs -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Jobs</h2>
            <select v-model="statusFilter" class="filter-select">
              <option value="">All statuses</option>
              <option v-for="s in allStatuses" :key="s" :value="s">
                {{ s }}
              </option>
            </select>
          </div>
          <div v-if="data.jobs.length === 0" class="empty">No jobs found</div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Job</th>
                  <th>Queue</th>
                  <th>Acquired</th>
                  <th>Finished</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in data.jobs" :key="job.id">
                  <td>
                    <span class="badge" :class="`badge-${job.status}`">{{
                      job.status
                    }}</span>
                  </td>
                  <td class="mono">{{ job.jobName }}</td>
                  <td>{{ job.queue }}</td>
                  <td>{{ formatEpoch(job.acquiredAt) }}</td>
                  <td>{{ formatEpoch(job.finishedAt) }}</td>
                  <td class="error-cell" :title="job.error || ''">
                    {{ truncate(job.error, 60) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const allStatuses = ["pending", "active", "delayed", "completed", "failed"];

const token = ref("");
const tokenInput = ref("");
const authError = ref(false);
const autoRefresh = ref(true);
const statusFilter = ref("");

onMounted(() => {
  token.value = sessionStorage.getItem("admin_token") || "";
});

function submitToken() {
  token.value = tokenInput.value;
  sessionStorage.setItem("admin_token", token.value);
  authError.value = false;
}

const { data, error, refresh } = useFetch("/api/admin/queue", {
  query: computed(() =>
    statusFilter.value ? { status: statusFilter.value } : {},
  ),
  headers: computed(() => ({ Authorization: `Bearer ${token.value}` })),
  watch: [token, statusFilter],
  immediate: false,
});

watch(token, (v) => {
  if (v) refresh();
});

watch(error, (err) => {
  if (err && (err as any).statusCode === 401) {
    token.value = "";
    sessionStorage.removeItem("admin_token");
    authError.value = true;
  }
});

// Auto-refresh polling
let interval: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  stopPolling();
  interval = setInterval(() => {
    if (token.value) refresh();
  }, 5000);
}

function stopPolling() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

watch(autoRefresh, (enabled) => {
  if (enabled) startPolling();
  else stopPolling();
});

onMounted(() => {
  if (autoRefresh.value) startPolling();
});

onUnmounted(() => {
  stopPolling();
});

function getCount(status: string): number {
  if (!data.value) return 0;
  const entry = data.value.summary.find((s: any) => s.status === status);
  return entry ? entry.count : 0;
}

function formatEpoch(epoch: number | null): string {
  if (!epoch) return "-";
  return new Date(epoch).toLocaleString();
}

function formatTs(ts: string | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function truncate(text: string | null, max: number): string {
  if (!text) return "-";
  return text.length > max ? text.slice(0, max) + "..." : text;
}
</script>

<style scoped>
.auth-card {
  max-width: 360px;
  margin: 4rem auto;
  background: #fff;
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.auth-card h2 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.auth-card form {
  display: flex;
  gap: 0.5rem;
}

.token-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.token-btn {
  padding: 0.5rem 1rem;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.auth-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.refresh-btn {
  padding: 0.375rem 0.75rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.8125rem;
}

.auto-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #64748b;
}

.error-banner {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.summary-cards {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 120px;
  background: #fff;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-top: 3px solid #94a3b8;
}

.summary-card.status-pending {
  border-top-color: #f59e0b;
}
.summary-card.status-active {
  border-top-color: #3b82f6;
}
.summary-card.status-delayed {
  border-top-color: #8b5cf6;
}
.summary-card.status-completed {
  border-top-color: #22c55e;
}
.summary-card.status-failed {
  border-top-color: #ef4444;
}

.summary-count {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.summary-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.section-header .section-title {
  margin-bottom: 0;
}

.filter-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  background: #fff;
}

.table-wrap {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.data-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-active {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge-pending {
  background: #fef3c7;
  color: #92400e;
}
.badge-delayed {
  background: #ede9fe;
  color: #6d28d9;
}
.badge-completed {
  background: #dcfce7;
  color: #15803d;
}
.badge-failed {
  background: #fee2e2;
  color: #b91c1c;
}

.error-cell {
  color: #dc2626;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.875rem;
}
</style>
