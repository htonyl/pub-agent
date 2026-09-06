import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import type { AppEnv } from '../src/env'
import type { DocumentSnapshot } from '../src/models/document-model'
import { createBearerToken } from '../src/policy/document-policy'

const document: DocumentSnapshot = {
  id: 'doc-1',
  title: 'Published note',
  content: 'Hello',
  status: 'draft',
  version: 1,
  contentHash: 'hash-1',
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
  PUBAGENT_AUTH_SECRET: 'test-secret',
} as unknown as AppEnv['Bindings']

describe('document routes', () => {
  it('denies document access without an explicit capability', async () => {
    const response = await app.request('http://worker.test/api/v1/documents', { method: 'POST' }, bindings)
    expect(response.status).toBe(401)
  })

  it('returns a versioned publish response with a stable permalink', async () => {
    const token = await createBearerToken({ subject: 'human', capabilities: ['document:create'], expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret')
    const response = await app.request(
      'http://worker.test/api/v1/documents',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Published note', content: 'Hello', clientUpdateId: 'create-1' }),
      },
      bindings,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({ id: 'doc-1', permalink: expect.stringContaining('/documents/doc-1') })
  })

  it('distinguishes invalid credentials from a valid token without the capability', async () => {
    const invalid = await app.request('http://worker.test/api/v1/documents', { method: 'POST', headers: { authorization: 'Bearer invalid' } }, bindings)
    expect(invalid.status).toBe(401)

    const readToken = await createBearerToken({ subject: 'reader', capabilities: ['document:read'], expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret')
    const forbidden = await app.request('http://worker.test/api/v1/documents', { method: 'POST', headers: { authorization: `Bearer ${readToken}` } }, bindings)
    expect(forbidden.status).toBe(403)
  })

  it('serves an authenticated MCP initialize response', async () => {
    const token = await createBearerToken({ subject: 'reader', capabilities: ['document:read'], expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret')
    const response = await app.request('http://worker.test/mcp/v1', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }) }, bindings)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ result: { protocolVersion: '2025-06-18' } })
  })
})
