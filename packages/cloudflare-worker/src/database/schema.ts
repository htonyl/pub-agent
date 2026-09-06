import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const counters = sqliteTable('counters', {
  id: text('id').primaryKey(),
  value: integer('value').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type CounterRow = typeof counters.$inferSelect

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull(),
  version: integer('version').notNull().default(1),
  contentHash: text('content_hash').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const documentVersions = sqliteTable('document_versions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull().default(''),
  status: text('status').notNull(),
  actorId: text('actor_id').notNull(),
  clientUpdateId: text('client_update_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const documentUpdates = sqliteTable('document_updates', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  clientUpdateId: text('client_update_id').notNull(),
  version: integer('version').notNull(),
  actorId: text('actor_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const documentReviews = sqliteTable('document_reviews', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  token: text('token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export type DocumentRow = typeof documents.$inferSelect
export type DocumentVersionRow = typeof documentVersions.$inferSelect
export type DocumentReviewRow = typeof documentReviews.$inferSelect
