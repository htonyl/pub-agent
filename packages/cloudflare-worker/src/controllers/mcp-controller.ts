import type { Context } from 'hono'

import type { AppEnv } from '../env'
import { deriveDocumentId, DocumentConflictError, DocumentFinalizedError } from '../models/document-model'
import type { DocumentOperation } from '../models/document-crdt'
import { documentPolicy, type DocumentCapability } from '../policy/document-policy'
import { renderDocument } from '../views/document-view'

type McpContext = Context<AppEnv>

const tools = [
  { name: 'create', description: 'Create a versioned text document.', inputSchema: { type: 'object' } },
  { name: 'read', description: 'Read the current document.', inputSchema: { type: 'object' } },
  { name: 'apply-operation', description: 'Apply one block DocumentOperation.', inputSchema: { type: 'object' } },
  { name: 'snapshot', description: 'Read the current block CRDT snapshot.', inputSchema: { type: 'object' } },
  { name: 'propose', description: 'Move a document into review.', inputSchema: { type: 'object' } },
  { name: 'approve', description: 'Finalize a document.', inputSchema: { type: 'object' } },
]

export async function handleMcpRequest(c: McpContext) {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || body.jsonrpc !== '2.0' || (typeof body.id !== 'string' && typeof body.id !== 'number')) {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, 400)
  }

  const id = body.id
  if (body.method === 'initialize') {
    const auth = await documentPolicy.authorize('document:read', c.req.raw, c.env.PUBAGENT_AUTH_SECRET)
    if (!auth.allowed) return authError(c, id, auth.status === 401 ? 401 : 403)
    return c.json({ jsonrpc: '2.0', id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'pubagent', version: '1' } } })
  }
  if (body.method === 'tools/list') {
    const auth = await documentPolicy.authorize('document:read', c.req.raw, c.env.PUBAGENT_AUTH_SECRET)
    if (!auth.allowed) return authError(c, id, auth.status === 401 ? 401 : 403)
    return c.json({ jsonrpc: '2.0', id, result: { tools } })
  }
  if (body.method !== 'tools/call') return c.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }, 404)

  const params = isObject(body.params) ? body.params : null
  const name = params && typeof params.name === 'string' ? params.name : ''
  const args = params && isObject(params.arguments) ? params.arguments : {}
  try {
    const result = await callTool(c, name, args)
    return c.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false } })
  } catch (error) {
    if (error instanceof McpAuthorizationError) return authError(c, id, error.status)
    if (error instanceof DocumentConflictError || error instanceof DocumentFinalizedError) {
      return c.json({ jsonrpc: '2.0', id, error: { code: -32009, message: error.message } })
    }
    const message = error instanceof Error ? error.message : 'Tool call failed'
    return c.json({ jsonrpc: '2.0', id, error: { code: -32000, message } }, 400)
  }
}

async function callTool(c: McpContext, name: string, args: Record<string, unknown>) {
  const documentId = typeof args.documentId === 'string' ? args.documentId : undefined
  const capability: DocumentCapability = name === 'create' ? 'document:create' : name === 'read' || name === 'snapshot' ? 'document:read' : name === 'approve' ? 'document:approve' : name === 'propose' ? 'document:update' : 'document:update'
  const request = documentId ? new Request(new URL(`/documents/${encodeURIComponent(documentId)}`, c.req.url), { headers: c.req.raw.headers }) : c.req.raw
  const authorization = await documentPolicy.authorize(capability, request, c.env.PUBAGENT_AUTH_SECRET)
  if (!authorization.allowed) throw new McpAuthorizationError(authorization.status === 401 ? 401 : 403)
  const origin = new URL(c.req.url).origin

  if (name === 'create') {
    if (typeof args.title !== 'string' || typeof args.content !== 'string' || typeof args.clientUpdateId !== 'string') throw new Error('title, content, and clientUpdateId are required')
    const actorId = authorization.principal?.subject ?? 'unknown'
    const id = await deriveDocumentId(actorId, args.clientUpdateId)
    const document = await c.env.DOCUMENTS.get(c.env.DOCUMENTS.idFromName(id)).createDocument({ documentId: id, title: args.title, content: args.content, clientUpdateId: args.clientUpdateId, actorId })
    return renderDocument(document, origin)
  }
  if (!documentId) throw new Error('documentId is required')
  const stub = c.env.DOCUMENTS.get(c.env.DOCUMENTS.idFromName(documentId))
  if (name === 'read') {
    const document = await stub.getDocument(documentId)
    if (!document) throw new Error('Document not found')
    return renderDocument(document, origin)
  }
  if (name === 'snapshot') {
    const snapshot = await (stub as unknown as { operationSnapshot(id: string): Promise<any> }).operationSnapshot(documentId)
    if (!snapshot) throw new Error('Document not found')
    return snapshot as unknown as Record<string, unknown>
  }
  if (name === 'apply-operation') {
    if (!isObject(args.operation)) throw new Error('operation is required')
    return (stub as unknown as {
      applyOperation(input: { documentId: string; actorId: string; operation: DocumentOperation }): Promise<Record<string, unknown>>
    }).applyOperation({
      documentId,
      actorId: authorization.principal?.subject ?? 'unknown',
      operation: args.operation as DocumentOperation,
    })
  }
  if (name === 'propose') return stub.propose(documentId)
  if (name === 'approve') {
    if (!Number.isInteger(args.expectedVersion) || typeof args.expectedContentHash !== 'string' || args.expectedContentHash.length === 0) {
      throw new Error('expectedVersion and expectedContentHash are required')
    }
    return stub.approve(documentId, args.expectedVersion as number, args.expectedContentHash)
  }
  throw new Error('Unknown tool')
}

class McpAuthorizationError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? 'unauthorized' : 'forbidden')
  }
}

function authError(c: McpContext, id: string | number, status: 401 | 403) {
  return c.json({ jsonrpc: '2.0', id, error: { code: status === 401 ? -32001 : -32003, message: status === 401 ? 'Unauthorized' : 'Forbidden' } }, status)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
