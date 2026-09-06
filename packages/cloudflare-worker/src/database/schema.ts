import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const counters = sqliteTable('counters', {
  id: text('id').primaryKey(),
  value: integer('value').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type CounterRow = typeof counters.$inferSelect
