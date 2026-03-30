export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/')) return

  const adminToken = useRuntimeConfig().adminToken
  if (!adminToken) {
    throw createError({ statusCode: 403, message: 'Admin not configured' })
  }

  const header = getRequestHeader(event, 'authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (token !== adminToken) {
    throw createError({ statusCode: 401, data: { error: 'Unauthorized' } })
  }
})
