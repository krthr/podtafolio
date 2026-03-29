import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle> | undefined

export function useDB() {
  if (!_db) {
    const config = useRuntimeConfig()
    _db = drizzle(config.databaseUrl, { schema })
  }
  return _db
}
