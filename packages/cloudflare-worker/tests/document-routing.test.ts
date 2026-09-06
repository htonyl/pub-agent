import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import type { AppEnv } from '../src/env'
import type { DocumentSnapshot } from '../src/models/document-model'

const document: DocumentSnapshot = {
  id: 'doc-1',
  title: 'Published note',
  content: 'Hello',
  status: 'draft',
  version: 1,
  createdAt: new Date(1),
  updatedAt: new Date(1),
}

const stub = {
  createDocument: async () => document,
  getDocument: async () => document,
  getVersion: async () => ({ ...document, actorId: 'human', clientUpdateId: 'create-1' }),
  applyUpdate: async () => ({ document, duplicate: false }),
  approve: async () => ({ ...document, status: 'finalized' as const }),
  review: async () => ({ id: 'review-1', documentId: document.id, token: 'token-1', createdAt: new Date(1) }),
  fetch: async () => new Response('upgrade', { status: 101 }),
}

const bindings = {
  COUNTERS: {},
  DOCUMENTS: {
    idFromName: (name: string) => name,
    get: () => stub,
  },
} as unknown as AppEnv['Bindings']

describe('document routes', () => {
  it('denies document access without an explicit capability', async () => {
    const response = await app.request('http://worker.test/api/v1/documents', { method: 'POST' }, bindings)
    expect(response.status).toBe(403)
  })

  it('returns a versioned publish response with a stable permalink', async () => {
    const response = await app.request(
      'http://worker.test/api/v1/documents',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-pubagent-capabilities': 'document:create',
        },
        body: JSON.stringify({ title: 'Published note', content: 'Hello', clientUpdateId: 'create-1' }),
      },
      bindings,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({ id: 'doc-1', permalink: expect.stringContaining('/documents/doc-1') })
  })
})
