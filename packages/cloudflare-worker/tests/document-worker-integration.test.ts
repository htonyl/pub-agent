import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestHarness, type TestHarness, type WorkerHandle } from 'wrangler'

import { deriveDocumentId } from '../src/models/document-model'
import { encodeYjsTextEnvelope, encodeYjsTextUpdate, restoreYjsText, type YjsTextSnapshot } from '../src/models/yjs-text'
import { createBearerToken } from '../src/policy/document-policy'
import * as Y from 'yjs'

const root = new URL('..', import.meta.url).pathname
const secret = 'integration-test-secret'
const actor = 'integration-agent'
const clientUpdateId = `integration-create-${Date.now()}`

let harness: TestHarness | undefined
let worker: WorkerHandle | undefined
let unavailableReason: string | undefined
const runIntegration = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.PUBAGENT_RUN_WRANGLER_INTEGRATION) === '1'

describe('Worker document safety integration', () => {
  beforeAll(async () => {
    if (!runIntegration) {
      unavailableReason = 'set PUBAGENT_RUN_WRANGLER_INTEGRATION=1 to run the local Wrangler harness'
      return
    }
    const loopbackError = await checkLoopback()
    if (loopbackError) {
      unavailableReason = loopbackError
      return
    }
    harness = createTestHarness({
      root,
      workers: [{ configPath: './wrangler.jsonc', secrets: { PUBAGENT_AUTH_SECRET: secret } }],
    })
    try {
      await harness.listen()
      worker = harness.getWorker()
    } catch (error) {
      unavailableReason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    }
  }, 120_000)

  afterAll(async () => {
    await harness?.close()
  })

  it('keeps create retry, approval CAS, finalized guards, and restart persistence in one real DO', async ({ skip }) => {
    if (!worker) {
      skip(`Wrangler integration harness unavailable: ${unavailableReason ?? 'unknown error'}`)
      return
    }

    const mcpClientUpdateId = `integration-mcp-create-${Date.now()}`
    const mcpToken = await token(['document:create'])
    const mcpCreate = () => worker!.fetch('/mcp/v1', {
      method: 'POST',
      headers: { authorization: `Bearer ${mcpToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mcp-create',
        method: 'tools/call',
        params: { name: 'create', arguments: { title: 'MCP document', content: 'mcp-content', clientUpdateId: mcpClientUpdateId } },
      }),
    })
    const [mcpCreateFirst, mcpCreateRetry] = await Promise.all([mcpCreate(), mcpCreate()])
    expect([mcpCreateFirst.status, mcpCreateRetry.status]).toEqual([200, 200])
    const mcpFirstBody = await mcpCreateFirst.json() as Record<string, any>
    const mcpRetryBody = await mcpCreateRetry.json() as Record<string, any>
    expect(mcpFirstBody.result?.structuredContent).toMatchObject({ title: 'MCP document', content: 'mcp-content', version: 1 })
    expect(mcpRetryBody.result?.structuredContent).toMatchObject({ id: mcpFirstBody.result?.structuredContent?.id, version: 1 })

    const bobMcpToken = await token(['document:create'], undefined, 'integration-agent-bob')
    const bobMcpCreate = await worker.fetch('/mcp/v1', {
      method: 'POST',
      headers: { authorization: `Bearer ${bobMcpToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mcp-bob-create',
        method: 'tools/call',
        params: { name: 'create', arguments: { title: 'MCP document', content: 'mcp-content', clientUpdateId: mcpClientUpdateId } },
      }),
    })
    expect(bobMcpCreate.status).toBe(200)
    const bobMcpBody = await bobMcpCreate.json() as Record<string, any>
    expect(bobMcpBody.result?.structuredContent?.id).not.toBe(mcpFirstBody.result?.structuredContent?.id)

    const mcpConflict = await worker.fetch('/mcp/v1', {
      method: 'POST',
      headers: { authorization: `Bearer ${mcpToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mcp-conflict',
        method: 'tools/call',
        params: { name: 'create', arguments: { title: 'MCP document changed', content: 'mcp-content', clientUpdateId: mcpClientUpdateId } },
      }),
    })
    expect(mcpConflict.status).toBe(200)
    await expect(mcpConflict.json()).resolves.toMatchObject({ error: { code: -32009 } })

    const raceClientUpdateId = `integration-approval-race-${Date.now()}`
    const raceCreate = await worker.fetch('/api/v1/documents', {
      method: 'POST',
      headers: { authorization: `Bearer ${createTokenFor(actor)}`, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Approval race', content: 'race', clientUpdateId: raceClientUpdateId }),
    })
    expect(raceCreate.status).toBe(201)
    const raceDocument = await raceCreate.json() as Record<string, any>
    const raceToken = await token(['document:update', 'document:approve', 'document:read'], [raceDocument.id])
    const [raceUpdate, raceApproval] = await Promise.all([
      worker.fetch(`/api/v1/documents/${raceDocument.id}/updates`, {
        method: 'POST',
        headers: { authorization: `Bearer ${raceToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ baseVersion: 1, content: 'race-updated', clientUpdateId: `integration-race-update-${Date.now()}` }),
      }),
      worker.fetch(`/api/v1/documents/${raceDocument.id}/approve`, {
        method: 'POST',
        headers: { authorization: `Bearer ${raceToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 1, expectedContentHash: raceDocument.contentHash }),
      }),
    ])
    expect([raceUpdate.status, raceApproval.status].sort()).toEqual([200, 409])
    const raceRead = await worker.fetch(`/api/v1/documents/${raceDocument.id}`, { headers: { authorization: `Bearer ${raceToken}` } })
    const raceFinal = await raceRead.json() as Record<string, any>
    if (raceApproval.status === 200) {
      expect(raceFinal).toMatchObject({ version: 1, status: 'finalized', content: 'race' })
    } else {
      expect(raceFinal).toMatchObject({ version: 2, status: 'draft', content: 'race-updated' })
    }

    const createToken = await token(['document:create'])
    const createRequest = () =>
      worker!.fetch('/api/v1/documents', {
        method: 'POST',
        headers: { authorization: `Bearer ${createToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Integration document', content: 'one', clientUpdateId }),
      })
    const creates = await Promise.all([createRequest(), createRequest()])
    expect(creates.map((response) => response.status)).toEqual([201, 201])
    const created = await creates[0].json() as Record<string, unknown>
    const retried = await creates[1].json() as Record<string, unknown>
    expect(retried).toMatchObject({ id: created.id, version: 1, content: 'one' })

    const documentId = await deriveDocumentId(actor, clientUpdateId)
    expect(created.id).toBe(documentId)
    const updateToken = await token(['document:read', 'document:update', 'document:approve'], [documentId])
    const update = await worker.fetch(`/api/v1/documents/${documentId}/updates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ baseVersion: 1, content: 'two', clientUpdateId: 'integration-update-1' }),
    })
    expect(update.status).toBe(200)
    const updated = await update.json() as Record<string, unknown>
    expect(updated).toMatchObject({ version: 2, content: 'two', duplicate: false })

    const version = await worker.fetch(`/api/v1/documents/${documentId}/versions/2`, {
      headers: { authorization: `Bearer ${updateToken}` },
    })
    expect(version.status).toBe(200)
    await expect(version.json()).resolves.toMatchObject({ actorId: actor, clientUpdateId: 'integration-update-1' })

    const operation = {
      type: 'insert',
      actorId: 'spoofed-client',
      clientId: 'integration-client',
      opId: 'integration-operation',
      logicalClock: 1,
      baseSequence: 0,
      block: {
        blockId: 'integration-block',
        kind: 'paragraph',
        schemaVersion: 1,
        attrs: {},
        content: { type: 'text', chunks: ['attributed to the bearer'] },
        provenance: { source: 'integration-test' },
        deleted: false,
      },
    }
    const operationResponse = await worker.fetch(`/api/v1/documents/${documentId}/operations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ operation }),
    })
    expect(operationResponse.status).toBe(200)
    await expect(operationResponse.json()).resolves.toMatchObject({ appliedOperation: { actorId: actor } })

    const staleApproval = await worker.fetch(`/api/v1/documents/${documentId}/approve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1, expectedContentHash: updated.contentHash }),
    })
    expect(staleApproval.status).toBe(409)

    const wrongHashApproval = await worker.fetch(`/api/v1/documents/${documentId}/approve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 2, expectedContentHash: 'wrong-hash' }),
    })
    expect(wrongHashApproval.status).toBe(409)

    const exactApproval = await worker.fetch(`/api/v1/documents/${documentId}/approve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expectedVersion: updated.version, expectedContentHash: updated.contentHash }),
    })
    expect(exactApproval.status).toBe(200)
    await expect(exactApproval.json()).resolves.toMatchObject({ version: 2, content: 'two', status: 'finalized' })

    const finalizedOperation = {
      type: 'insert',
      actorId: 'spoofed-client',
      clientId: 'integration-client',
      opId: 'integration-finalized-operation',
      logicalClock: 2,
      baseSequence: 0,
      block: {
        blockId: 'integration-finalized-block',
        kind: 'paragraph',
        schemaVersion: 1,
        attrs: {},
        content: { type: 'text', chunks: ['should not persist'] },
        provenance: { source: 'integration-test' },
        deleted: false,
      },
    }
    const replacement = await worker.fetch(`/api/v1/documents/${documentId}/updates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ baseVersion: 2, content: 'three', clientUpdateId: 'integration-finalized-replacement' }),
    })
    expect(replacement.status).toBe(409)

    const block = await worker.fetch(`/api/v1/documents/${documentId}/operations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ operation: finalizedOperation }),
    })
    expect(block.status).toBe(409)

    const yjsSnapshotResponse = await worker.fetch(`/api/v1/documents/${documentId}/yjs-snapshot`, {
      headers: { authorization: `Bearer ${updateToken}` },
    })
    expect(yjsSnapshotResponse.status).toBe(200)
    const yjsDocument = restoreYjsText(await yjsSnapshotResponse.json() as YjsTextSnapshot)
    const yjsBaseVector = Y.encodeStateVector(yjsDocument)
    yjsDocument.getText('text').insert(3, ' update')
    const yjsEnvelope = encodeYjsTextEnvelope(
      encodeYjsTextUpdate(yjsDocument, yjsBaseVector),
      yjsBaseVector,
      'integration-finalized-yjs',
    )
    const yjs = await worker.fetch(`/api/v1/documents/${documentId}/yjs-updates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${updateToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ baseVersion: 2, clientUpdateId: 'integration-finalized-yjs', envelope: yjsEnvelope }),
    })
    expect(yjs.status).toBe(409)

    await worker.evictDurableObject('DOCUMENTS', { name: documentId })
    const afterRestart = await worker.fetch(`/api/v1/documents/${documentId}`, {
      headers: { authorization: `Bearer ${updateToken}` },
    })
    expect(afterRestart.status).toBe(200)
    await expect(afterRestart.json()).resolves.toMatchObject({ version: 2, content: 'two', status: 'finalized' })

    const collaborationToken = await token(['document:collaborate'], [documentId])
    const collaborationHandshake = await worker.fetch(`/documents/${documentId}/collaborate`, {
      headers: { authorization: `Bearer ${collaborationToken}`, upgrade: 'websocket' },
    })
    expect(collaborationHandshake.status).toBe(101)
    collaborationHandshake.webSocket?.close()
  }, 120_000)
})

async function token(
  capabilities: Parameters<typeof createBearerToken>[0]['capabilities'],
  documentIds?: string[],
  subject = actor,
) {
  return createBearerToken(
    { subject, capabilities, expiresAt: Math.floor(Date.now() / 1000) + 300, ...(documentIds ? { documentIds } : {}) },
    secret,
  )
}

async function createTokenFor(subject: string) {
  return createBearerToken(
    { subject, capabilities: ['document:create'], expiresAt: Math.floor(Date.now() / 1000) + 300 },
    secret,
  )
}

async function checkLoopback(): Promise<string | undefined> {
  // The Wrangler harness emits an uncaught server error when this sandbox
  // denies loopback binding, so probe the capability before starting it.
  // @ts-expect-error Node's net module is only used by this Node/Vitest test.
  const { createServer } = await import('node:net')
  const server = createServer()
  return new Promise((resolve) => {
    server.once('error', (error: unknown) => resolve(`loopback binding unavailable: ${String(error)}`))
    server.listen(0, '127.0.0.1', () => server.close(() => resolve(undefined)))
  })
}
