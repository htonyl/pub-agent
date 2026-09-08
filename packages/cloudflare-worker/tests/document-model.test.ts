import { describe, expect, it } from 'vitest'

import {
  DocumentConflictError,
  DocumentModel,
  type DocumentSnapshot,
  type DocumentStore,
  type DocumentUpdate,
  type DocumentVersion,
  type ReviewLink,
} from '../src/models/document-model'

class InMemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, DocumentSnapshot>()
  private readonly versions = new Map<string, DocumentVersion>()
  private readonly updates = new Map<string, number>()

  create(input: {
    id: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
    now: Date
    contentHash: string
  }) {
    const document: DocumentSnapshot = {
      id: input.id,
      title: input.title,
      content: input.content,
      status: 'draft',
      version: 1,
      contentHash: input.contentHash,
      createdAt: input.now,
      updatedAt: input.now,
    }
    this.documents.set(input.id, document)
    this.versions.set(`${input.id}:1`, { ...document, actorId: input.actorId, clientUpdateId: input.clientUpdateId })
    this.updates.set(`${input.id}:${input.clientUpdateId}`, 1)
    return Promise.resolve(document)
  }

  get(documentId: string) {
    return Promise.resolve(this.documents.get(documentId) ?? null)
  }

  hasUpdate(documentId: string, clientUpdateId: string) {
    return Promise.resolve(this.updates.has(`${documentId}:${clientUpdateId}`))
  }

  getUpdateAck(documentId: string, clientUpdateId: string) {
    const version = this.updates.get(`${documentId}:${clientUpdateId}`)
    return Promise.resolve(version ? this.versions.get(`${documentId}:${version}`) ?? null : null)
  }

  getVersion(documentId: string, version: number) {
    return Promise.resolve(this.versions.get(`${documentId}:${version}`) ?? null)
  }

  async appendUpdate(input: DocumentUpdate & { now: Date; contentHash: string }) {
    const current = this.documents.get(input.documentId)
    if (!current) throw new Error('Document not found')
    if (this.updates.has(`${input.documentId}:${input.clientUpdateId}`)) {
      return { document: current, duplicate: true }
    }
    if (input.baseVersion !== current.version) throw new DocumentConflictError()

    const document = { ...current, content: input.content, contentHash: input.contentHash ?? current.contentHash, version: current.version + 1, updatedAt: input.now }
    this.documents.set(input.documentId, document)
    this.versions.set(`${input.documentId}:${document.version}`, {
      ...document,
      actorId: input.actorId,
      clientUpdateId: input.clientUpdateId,
    })
    this.updates.set(`${input.documentId}:${input.clientUpdateId}`, document.version)
    return { document, duplicate: false }
  }

  async setStatus(
    documentId: string,
    status: 'draft' | 'in_review' | 'finalized',
    now: Date,
    expected?: { version: number; contentHash: string },
  ) {
    const current = this.documents.get(documentId)
    if (!current) throw new Error('Document not found')
    if (current.status === 'finalized' && status === 'in_review') throw new Error('Finalized documents cannot be changed')
    if (expected && (current.version !== expected.version || current.contentHash !== expected.contentHash)) {
      throw new DocumentConflictError('Document version or content hash is stale')
    }
    const document = { ...current, status, updatedAt: now }
    this.documents.set(documentId, document)
    return document
  }

  createReview(input: { id: string; documentId: string; token: string; now: Date }) {
    const review: ReviewLink = { id: input.id, documentId: input.documentId, token: input.token, createdAt: input.now }
    return Promise.resolve(review)
  }
}

describe('DocumentModel', () => {
  it('validates creation and applies an update exactly once', async () => {
    const model = new DocumentModel(new InMemoryDocumentStore())
    const now = new Date(1)

    expect(() =>
      model.create({ id: 'doc-1', title: '', content: 'draft', actorId: 'human', clientUpdateId: 'create-1', now }),
    ).toThrow('title must be a non-empty string')

    await model.create({ id: 'doc-1', title: 'Draft', content: 'one', actorId: 'human', clientUpdateId: 'create-1', now })
    const update = { documentId: 'doc-1', actorId: 'human', clientUpdateId: 'edit-1', baseVersion: 1, content: 'two', now }

    await expect(model.applyUpdate(update)).resolves.toMatchObject({ duplicate: false, document: { version: 2 } })
    await expect(model.applyUpdate(update)).resolves.toMatchObject({ duplicate: true, document: { version: 2 } })
    await expect(model.applyUpdate({ ...update, content: 'different' })).rejects.toThrow(
      'Document update key was reused with different content',
    )
    await expect(model.applyUpdate({ ...update, actorId: 'different-actor' })).rejects.toThrow(
      'Document update key was reused with different content',
    )
  })

  it('rejects a stale base version', async () => {
    const model = new DocumentModel(new InMemoryDocumentStore())
    await model.create({ id: 'doc-1', title: 'Draft', content: 'one', actorId: 'human', clientUpdateId: 'create-1' })
    await model.applyUpdate({ documentId: 'doc-1', actorId: 'human', clientUpdateId: 'edit-1', baseVersion: 1, content: 'two' })

    await expect(
      model.applyUpdate({ documentId: 'doc-1', actorId: 'human', clientUpdateId: 'edit-2', baseVersion: 1, content: 'three' }),
    ).rejects.toThrow('Document base version is stale')
  })

  it('rejects updates after finalization and requires an exact approval version and hash', async () => {
    const store = new InMemoryDocumentStore()
    const model = new DocumentModel(store)
    const document = await model.create({ id: 'doc-1', title: 'Draft', content: 'one', actorId: 'human', clientUpdateId: 'create-1' })

    const update = { documentId: 'doc-1', actorId: 'human', clientUpdateId: 'edit-1', baseVersion: 1, content: 'two' }
    const updated = await model.applyUpdate(update)
    await expect(model.approve('doc-1', document.version, 'wrong-hash')).rejects.toThrow('version or content hash is stale')
    await expect(model.approve('doc-1', updated.document.version, updated.document.contentHash)).resolves.toMatchObject({ status: 'finalized' })
    await expect(model.applyUpdate(update)).resolves.toMatchObject({ duplicate: true, document: { version: 2 } })
    await expect(model.applyUpdate({ ...update, clientUpdateId: 'edit-2', baseVersion: 2, content: 'three' })).rejects.toThrow(
      'Finalized documents cannot be changed',
    )
    await expect(model.propose('doc-1')).rejects.toThrow('Finalized documents cannot be changed')
  })

  it('returns the original document for a repeated create key and rejects changed payloads', async () => {
    const model = new DocumentModel(new InMemoryDocumentStore())
    const input = { id: 'doc-1', title: 'Draft', content: 'one', actorId: 'human', clientUpdateId: 'create-1' }
    const first = await model.create(input)
    await model.applyUpdate({ documentId: 'doc-1', actorId: 'human', clientUpdateId: 'edit-1', baseVersion: 1, content: 'two' })
    await expect(model.create(input)).resolves.toEqual(first)
    await expect(model.create({ ...input, content: 'changed' })).rejects.toThrow('creation key was reused')
  })
})
