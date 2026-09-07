import { DocumentCrdt as BlockDocumentCrdt, chunkText } from './document-crdt'

export type DocumentStatus = 'draft' | 'in_review' | 'finalized'

export type DocumentSnapshot = {
  id: string
  title: string
  content: string
  status: DocumentStatus
  version: number
  contentHash: string
  createdAt: Date
  updatedAt: Date
}

export type DocumentVersion = DocumentSnapshot & {
  actorId: string
  clientUpdateId: string
}

export type DocumentUpdate = {
  documentId: string
  actorId: string
  clientUpdateId: string
  baseVersion: number
  content: string
  contentHash?: string
}

export type ReviewLink = {
  id: string
  documentId: string
  token: string
  createdAt: Date
}

export type DocumentStore = {
  create(input: {
    id: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
    now: Date
    contentHash: string
  }): Promise<DocumentSnapshot>
  get(documentId: string): Promise<DocumentSnapshot | null>
  hasUpdate(documentId: string, clientUpdateId: string): Promise<boolean>
  getUpdateAck(documentId: string, clientUpdateId: string): Promise<DocumentSnapshot | null>
  getVersion(documentId: string, version: number): Promise<DocumentVersion | null>
  appendUpdate(input: DocumentUpdate & { now: Date; contentHash: string }): Promise<{
    document: DocumentSnapshot
    duplicate: boolean
  }>
  setStatus(
    documentId: string,
    status: DocumentStatus,
    now: Date,
    expected?: { version: number; contentHash: string },
  ): Promise<DocumentSnapshot>
  createReview(input: { id: string; documentId: string; token: string; now: Date }): Promise<ReviewLink>
}

export class DocumentConflictError extends Error {
  constructor(message = 'Document base version is stale') {
    super(message)
    this.name = 'DocumentConflictError'
  }
}

export class DocumentFinalizedError extends Error {
  constructor(message = 'Finalized documents cannot be changed') {
    super(message)
    this.name = 'DocumentFinalizedError'
  }
}

/** Adapter from the persisted document shape to the repository's pure block CRDT. */
export type DocumentCrdtAdapter = {
  apply(current: DocumentSnapshot, update: DocumentUpdate, now: Date): DocumentSnapshot
}

export const replacementDocumentCrdt: DocumentCrdtAdapter = {
  apply(current, update, now) {
    if (update.baseVersion !== current.version) {
      throw new DocumentConflictError()
    }

    const crdt = new BlockDocumentCrdt()
    const blockId = `${current.id}:content`
    crdt.apply({
      type: 'insert',
      actorId: 'storage',
      clientId: 'storage',
      opId: `${current.id}:initial`,
      logicalClock: 0,
      baseSequence: 0,
      block: {
        blockId,
        kind: 'paragraph',
        schemaVersion: 1,
        attrs: {},
        content: { type: 'text', chunks: chunkText(current.content) },
        provenance: { source: 'document-store' },
        deleted: false,
      },
    })
    const applied = crdt.apply({
      type: 'update',
      actorId: update.actorId,
      clientId: update.actorId,
      opId: update.clientUpdateId,
      logicalClock: current.version,
      baseSequence: 1,
      blockId,
      patch: { content: { type: 'text', chunks: chunkText(update.content) } },
    })
    const content = applied.snapshot.visibleBlocks[0]?.content

    return {
      ...current,
      content: content?.type === 'text' ? content.chunks.join('') : update.content,
      version: current.version + 1,
      updatedAt: now,
    }
  },
}

const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 1_000_000

export class DocumentModel {
  constructor(
    private readonly store: DocumentStore,
    private readonly crdt: DocumentCrdtAdapter = replacementDocumentCrdt,
  ) {}

  create(input: {
    id: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
    now?: Date
  }): Promise<DocumentSnapshot> {
    validateText(input.title, 'title', MAX_TITLE_LENGTH)
    validateText(input.content, 'content', MAX_CONTENT_LENGTH)
    chunkText(input.content)
    validateText(input.actorId, 'actorId', 200)
    validateText(input.clientUpdateId, 'clientUpdateId', 200)
    const now = input.now ?? new Date()
    return hashText(input.content).then(async (contentHash) => {
      const existing = await this.getCreateAck(input.id, input.actorId, input.clientUpdateId)
      if (existing) return this.assertCreateRetry(existing, input.title, input.content, contentHash)

      try {
        return await this.store.create({ ...input, contentHash, now })
      } catch (error) {
        // A concurrent retry can pass the read above before the first request
        // commits. Re-read after a uniqueness failure and return the original
        // result when the idempotency key identifies the same request.
        const retry = await this.getCreateAck(input.id, input.actorId, input.clientUpdateId)
        if (retry) return this.assertCreateRetry(retry, input.title, input.content, contentHash)
        throw error
      }
    })
  }

  get(documentId: string): Promise<DocumentSnapshot | null> {
    return this.store.get(documentId)
  }

  getUpdateAck(documentId: string, clientUpdateId: string): Promise<DocumentSnapshot | null> {
    return this.store.getUpdateAck(documentId, clientUpdateId)
  }

  getVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    if (!Number.isInteger(version) || version < 1) {
      throw new Error('version must be a positive integer')
    }
    return this.store.getVersion(documentId, version)
  }

  async applyUpdate(input: DocumentUpdate & { now?: Date }): Promise<{
    document: DocumentSnapshot
    duplicate: boolean
  }> {
    validateText(input.content, 'content', MAX_CONTENT_LENGTH)
    validateText(input.actorId, 'actorId', 200)
    validateText(input.clientUpdateId, 'clientUpdateId', 200)
    if (!Number.isInteger(input.baseVersion) || input.baseVersion < 1) {
      throw new Error('baseVersion must be a positive integer')
    }

    const current = await this.store.get(input.documentId)
    if (!current) {
      throw new Error('Document not found')
    }
    const duplicateAck = await this.store.getUpdateAck(input.documentId, input.clientUpdateId)
    if (duplicateAck) return { document: duplicateAck, duplicate: true }
    if (current.status === 'finalized') throw new DocumentFinalizedError()

    const next = this.crdt.apply(current, input, input.now ?? new Date())
    return hashText(next.content).then((contentHash) =>
      this.store.appendUpdate({ ...input, content: next.content, contentHash, now: next.updatedAt }),
    )
  }

  approve(documentId: string, expectedVersion: number, expectedContentHash: string, now = new Date()): Promise<DocumentSnapshot> {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error('expectedVersion must be a positive integer')
    }
    validateText(expectedContentHash, 'expectedContentHash', 200)
    return this.store.setStatus(documentId, 'finalized', now, { version: expectedVersion, contentHash: expectedContentHash })
  }

  async propose(documentId: string, now = new Date()): Promise<DocumentSnapshot> {
    const current = await this.store.get(documentId)
    if (!current) throw new Error('Document not found')
    if (current.status === 'finalized') throw new DocumentFinalizedError()
    return this.store.setStatus(documentId, 'in_review', now)
  }

  review(documentId: string, token: string, id = token, now = new Date()): Promise<ReviewLink> {
    validateText(token, 'token', 200)
    validateText(id, 'id', 200)
    return this.store.createReview({ id, documentId, token, now })
  }

  private async getCreateAck(documentId: string, actorId: string, clientUpdateId: string): Promise<DocumentSnapshot | null> {
    const version = await this.store.getVersion(documentId, 1)
    if (!version || version.actorId !== actorId || version.clientUpdateId !== clientUpdateId) return null
    const { actorId: _actorId, clientUpdateId: _clientUpdateId, ...snapshot } = version
    return { ...snapshot, id: documentId }
  }

  private assertCreateRetry(
    existing: DocumentSnapshot,
    title: string,
    content: string,
    contentHash: string,
  ): DocumentSnapshot {
    if (existing.title !== title || existing.content !== content || existing.contentHash !== contentHash) {
      throw new DocumentConflictError('Document creation key was reused with different content')
    }
    return existing
  }
}

function validateText(value: string, name: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`)
  }
  if (value.length > maxLength) {
    throw new Error(`${name} exceeds the maximum length of ${maxLength}`)
  }
}

export async function hashText(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Stable namespace key for create retries without exposing actor credentials. */
export async function deriveDocumentId(actorId: string, clientUpdateId: string): Promise<string> {
  return `doc-${await hashText(`${actorId}\u0000${clientUpdateId}`)}`
}
