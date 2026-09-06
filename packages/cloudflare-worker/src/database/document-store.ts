import { and, eq } from 'drizzle-orm'
import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite'

import {
  documentReviews,
  documents,
  documentUpdates,
  documentVersions,
  type DocumentReviewRow,
  type DocumentRow,
  type DocumentVersionRow,
} from './schema'
import {
  DocumentConflictError,
  type DocumentSnapshot,
  type DocumentStatus,
  type DocumentStore,
  type DocumentUpdate,
  type DocumentVersion,
  type ReviewLink,
} from '../models/document-model'

type Database = DrizzleSqliteDODatabase<Record<string, never>>

export class DrizzleDocumentStore implements DocumentStore {
  constructor(private readonly db: Database) {}

  async create(input: {
    id: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
    now: Date
    contentHash: string
  }): Promise<DocumentSnapshot> {
    const snapshot: DocumentSnapshot = {
      id: input.id,
      title: input.title,
      content: input.content,
      status: 'draft',
      version: 1,
      contentHash: input.contentHash,
      createdAt: input.now,
      updatedAt: input.now,
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(documents).values(snapshotToRow(snapshot))
      await tx.insert(documentVersions).values({
        id: versionId(input.id, 1),
        documentId: input.id,
        version: 1,
        title: input.title,
        content: input.content,
        contentHash: input.contentHash,
        status: 'draft',
        actorId: input.actorId,
        clientUpdateId: input.clientUpdateId,
        createdAt: input.now,
      })
      await tx.insert(documentUpdates).values({
        id: updateId(input.id, input.clientUpdateId),
        documentId: input.id,
        clientUpdateId: input.clientUpdateId,
        version: 1,
        actorId: input.actorId,
        createdAt: input.now,
      })
    })

    return snapshot
  }

  async get(documentId: string): Promise<DocumentSnapshot | null> {
    const row = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .get()
    return row ? rowToSnapshot(row) : null
  }

  async hasUpdate(documentId: string, clientUpdateId: string): Promise<boolean> {
    const row = await this.db
      .select({ id: documentUpdates.id })
      .from(documentUpdates)
      .where(eq(documentUpdates.id, updateId(documentId, clientUpdateId)))
      .get()
    return Boolean(row)
  }

  async getUpdateAck(documentId: string, clientUpdateId: string): Promise<DocumentSnapshot | null> {
    const update = await this.db
      .select({ version: documentUpdates.version })
      .from(documentUpdates)
      .where(eq(documentUpdates.id, updateId(documentId, clientUpdateId)))
      .get()
    if (!update) return null
    const version = await this.getVersion(documentId, update.version)
    return version ? versionToSnapshot(version) : null
  }

  async getVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    const row = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.version, version)))
      .get()
    return row ? rowToVersion(row) : null
  }

  async appendUpdate(input: DocumentUpdate & { now: Date; contentHash: string }): Promise<{
    document: DocumentSnapshot
    duplicate: boolean
  }> {
    return this.db.transaction(async (tx) => {
      const existingUpdate = await tx
        .select()
        .from(documentUpdates)
        .where(eq(documentUpdates.id, updateId(input.documentId, input.clientUpdateId)))
        .get()
      const currentRow = await tx
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .get()
      const current = currentRow ? rowToSnapshot(currentRow) : null

      if (!current) {
        throw new Error('Document not found')
      }
      if (existingUpdate) {
        const original = await tx
          .select()
          .from(documentVersions)
          .where(and(eq(documentVersions.documentId, input.documentId), eq(documentVersions.version, existingUpdate.version)))
          .get()
        return { document: original ? versionToSnapshot(rowToVersion(original)) : current, duplicate: true }
      }
      if (current.version !== input.baseVersion) {
        throw new DocumentConflictError()
      }

      const next: DocumentSnapshot = {
        ...current,
        content: input.content,
        contentHash: input.contentHash,
        version: current.version + 1,
        updatedAt: input.now,
      }

      await tx
        .update(documents)
        .set({ content: next.content, contentHash: next.contentHash, version: next.version, updatedAt: next.updatedAt })
        .where(eq(documents.id, input.documentId))
      await tx.insert(documentVersions).values({
        id: versionId(input.documentId, next.version),
        documentId: input.documentId,
        version: next.version,
        title: next.title,
        content: next.content,
        contentHash: next.contentHash,
        status: next.status,
        actorId: input.actorId,
        clientUpdateId: input.clientUpdateId,
        createdAt: input.now,
      })
      await tx.insert(documentUpdates).values({
        id: updateId(input.documentId, input.clientUpdateId),
        documentId: input.documentId,
        clientUpdateId: input.clientUpdateId,
        version: next.version,
        actorId: input.actorId,
        createdAt: input.now,
      })

      return { document: next, duplicate: false }
    })
  }

  async setStatus(documentId: string, status: DocumentStatus, now: Date): Promise<DocumentSnapshot> {
    const current = await this.get(documentId)
    if (!current) {
      throw new Error('Document not found')
    }

    await this.db.update(documents).set({ status, updatedAt: now }).where(eq(documents.id, documentId))
    return { ...current, status, updatedAt: now }
  }

  async createReview(input: { id: string; documentId: string; token: string; now: Date }): Promise<ReviewLink> {
    const document = await this.get(input.documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const row: DocumentReviewRow = {
      id: input.id,
      documentId: input.documentId,
      token: input.token,
      createdAt: input.now,
    }
    await this.db.insert(documentReviews).values(row)
    return { id: row.id, documentId: row.documentId, token: row.token, createdAt: row.createdAt }
  }
}

function updateId(documentId: string, clientUpdateId: string) {
  return `${documentId}:${clientUpdateId}`
}

function versionId(documentId: string, version: number) {
  return `${documentId}:${version}`
}

function snapshotToRow(snapshot: DocumentSnapshot): DocumentRow {
  return snapshot
}

function rowToSnapshot(row: DocumentRow): DocumentSnapshot {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentHash: row.contentHash,
    status: row.status as DocumentStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function rowToVersion(row: DocumentVersionRow): DocumentVersion {
  return {
    id: versionId(row.documentId, row.version),
    title: row.title,
    content: row.content,
    contentHash: row.contentHash,
    status: row.status as DocumentStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
    actorId: row.actorId,
    clientUpdateId: row.clientUpdateId,
  }
}

function versionToSnapshot(version: DocumentVersion): DocumentSnapshot {
  return {
    id: version.id.slice(0, version.id.lastIndexOf(':')),
    title: version.title,
    content: version.content,
    status: version.status,
    version: version.version,
    contentHash: version.contentHash,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  }
}
