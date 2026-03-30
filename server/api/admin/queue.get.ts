import pg from 'pg'

export default defineEventHandler(async (event) => {
  const databaseUrl = useRuntimeConfig().databaseUrl
  const statusFilter = getQuery(event).status as string | undefined
  const validStatuses = ['pending', 'active', 'delayed', 'completed', 'failed']

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    // Summary: counts by status
    const summaryResult = await client.query(
      `SELECT status, count(*)::int AS count FROM queue_jobs GROUP BY status ORDER BY status`,
    )

    // Jobs: latest 100, optionally filtered by status
    let jobsQuery = `
      SELECT id, queue, status, data, worker_id, acquired_at, execute_at, finished_at, error
      FROM queue_jobs
    `
    const params: string[] = []
    if (statusFilter && validStatuses.includes(statusFilter)) {
      jobsQuery += ` WHERE status = $1`
      params.push(statusFilter)
    }
    jobsQuery += ` ORDER BY COALESCE(finished_at, acquired_at, execute_at, 0) DESC LIMIT 100`

    const jobsResult = await client.query(jobsQuery, params)

    const jobs = jobsResult.rows.map((row) => {
      let jobName = 'unknown'
      try {
        const data = JSON.parse(row.data)
        jobName = data.name || data.jobName || 'unknown'
      } catch {}

      return {
        id: row.id,
        queue: row.queue,
        status: row.status,
        jobName,
        workerId: row.worker_id,
        acquiredAt: row.acquired_at ? Number(row.acquired_at) : null,
        executeAt: row.execute_at ? Number(row.execute_at) : null,
        finishedAt: row.finished_at ? Number(row.finished_at) : null,
        error: row.error,
      }
    })

    // Schedules
    const schedulesResult = await client.query(`SELECT * FROM queue_schedules ORDER BY id`)

    return {
      summary: summaryResult.rows,
      jobs,
      schedules: schedulesResult.rows,
    }
  } finally {
    await client.end()
  }
})
