import { DocumentCrdt as BlockDocumentCrdt, chunkText } from './document-crdt'

export type DocumentStatus = 'draft' | 'in_review' | 'finalized'

export type DocumentSnapshot = {
  id: string
  title: string
  content: string
  status: DocumentStatus
  version: number
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
  }): Promise<DocumentSnapshot>
  get(documentId: string): Promise<DocumentSnapshot | null>
  hasUpdate(documentId: string, clientUpdateId: string): Promise<boolean>
  getVersion(documentId: string, version: number): Promise<DocumentVersion | null>
  appendUpdate(input: DocumentUpdate & { now: Date }): Promise<{
    document: DocumentSnapshot
    duplicate: boolean
  }>
  setStatus(documentId: string, status: DocumentStatus, now: Date): Promise<DocumentSnapshot>
  createReview(input: { id: string; documentId: string; token: string; now: Date }): Promise<ReviewLink>
}

export class DocumentConflictError extends Error {
  constructor(message = 'Document base version is stale') {
    super(message)
    this.name = 'DocumentConflictError'
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
    return this.store.create({ ...input, now: input.now ?? new Date() })
  }

  get(documentId: string): Promise<DocumentSnapshot | null> {
    return this.store.get(documentId)
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
    if (await this.store.hasUpdate(input.documentId, input.clientUpdateId)) {
      return { document: current, duplicate: true }
    }

    const next = this.crdt.apply(current, input, input.now ?? new Date())
    return this.store.appendUpdate({ ...input, content: next.content, now: next.updatedAt })
  }

  approve(documentId: string, now = new Date()): Promise<DocumentSnapshot> {
    return this.store.setStatus(documentId, 'finalized', now)
  }

  review(documentId: string, token: string, id = token, now = new Date()): Promise<ReviewLink> {
    validateText(token, 'token', 200)
    validateText(id, 'id', 200)
    return this.store.createReview({ id, documentId, token, now })
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
