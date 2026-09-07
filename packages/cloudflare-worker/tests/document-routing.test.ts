import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import type { AppEnv } from '../src/env'
import { deriveDocumentId, type DocumentSnapshot } from '../src/models/document-model'
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

const appliedOperations: unknown[] = []
const routedDocumentIds: string[] = []

const stub = {
  createDocument: async () => document,
  getDocument: async () => document,
  getVersion: async () => ({ ...document, actorId: 'human', clientUpdateId: 'create-1' }),
  applyUpdate: async () => ({ document, duplicate: false }),
  applyOperation: async (input: unknown) => {
    appliedOperations.push(input)
    return { ok: true }
  },
  approve: async () => ({ ...document, status: 'finalized' as const }),
  review: async () => ({ id: 'review-1', documentId: document.id, token: 'token-1', createdAt: new Date(1) }),
  fetch: async () => new Response('upgrade', { status: 101 }),
}

const bindings = {
  COUNTERS: {},
  DOCUMENTS: {
    idFromName: (name: string) => {
      routedDocumentIds.push(name)
      return name
    },
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
    routedDocumentIds.length = 0
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
    await expect(routedDocumentIds).toContain(await deriveDocumentId('human', 'create-1'))
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

  it('binds block operation actor attribution to the bearer principal and document route', async () => {
    const token = await createBearerToken({ subject: 'agent-1', capabilities: ['document:update'], documentIds: ['doc-1'], expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret')
    const response = await app.request(
      'http://worker.test/api/v1/documents/doc-1/operations',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          operation: {
            type: 'insert',
            actorId: 'spoofed-client',
            clientId: 'client-1',
            opId: 'op-1',
            logicalClock: 1,
            baseSequence: 0,
            block: {
              blockId: 'block-1',
              kind: 'paragraph',
              schemaVersion: 1,
              attrs: {},
              content: { type: 'text', chunks: ['hello'] },
              provenance: { source: 'test' },
              deleted: false,
            },
          },
        }),
      },
      bindings,
    )

    expect(response.status).toBe(200)
    expect(appliedOperations.at(-1)).toMatchObject({
      documentId: 'doc-1',
      actorId: 'agent-1',
      operation: { actorId: 'spoofed-client' },
    })
  })

  it('requires approval to name the exact version and content hash', async () => {
    const token = await createBearerToken({ subject: 'reviewer', capabilities: ['document:approve'], documentIds: ['doc-1'], expiresAt: Math.floor(Date.now() / 1000) + 60 }, 'test-secret')
    const response = await app.request(
      'http://worker.test/api/v1/documents/doc-1/approve',
      { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({}) },
      bindings,
    )
    expect(response.status).toBe(400)
  })
})
