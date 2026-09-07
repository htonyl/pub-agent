import type { Context } from 'hono'

import { deriveDocumentId, DocumentConflictError, DocumentFinalizedError } from '../models/document-model'
import { DocumentCrdtError, type DocumentOperation } from '../models/document-crdt'
import type { AppEnv } from '../env'
import { documentPolicy, type DocumentCapability } from '../policy/document-policy'
import { renderDocument, renderError, renderReviewLink, renderUpdateResult, renderVersion } from '../views/document-view'

type DocumentContext = Context<AppEnv>

export async function createDocument(c: DocumentContext) {
  const authorization = await authorize(c, 'document:create')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const body = await jsonBody(c)
  if (!body) return badRequest(c, 'request body must be a JSON object')

  const title = stringField(body.title)
  const content = stringField(body.content)
  const clientUpdateId = stringField(body.clientUpdateId)
  if (!title || !content || !clientUpdateId) {
    return badRequest(c, 'title, content, and clientUpdateId are required')
  }

  try {
    const actorId = authorization.principal?.subject ?? 'unknown'
    const documentId = await deriveDocumentId(actorId, clientUpdateId)
    const document = await documentStub(c, documentId).createDocument({
      documentId,
      title,
      content,
      clientUpdateId,
      actorId,
    })
    return c.json(renderDocument(document, new URL(c.req.url).origin), 201)
  } catch (error) {
    return modelError(c, error)
  }
}

export async function getDocument(c: DocumentContext) {
  const authorization = await authorize(c, 'document:read')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const documentId = requiredParam(c, 'id')
  const versionValue = c.req.query('version')
  try {
    if (versionValue) {
      const version = await documentStub(c, documentId).getVersion(documentId, Number(versionValue))
      return version
        ? c.json(renderVersion(version, new URL(c.req.url).origin))
        : notFound(c, 'Document version not found')
    }
    const document = await documentStub(c, documentId).getDocument(documentId)
    return document ? c.json(renderDocument(document, new URL(c.req.url).origin)) : notFound(c, 'Document not found')
  } catch (error) {
    return modelError(c, error)
  }
}

export async function getDocumentVersion(c: DocumentContext) {
  const authorization = await authorize(c, 'document:read')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  try {
    const documentId = requiredParam(c, 'id')
    const version = await documentStub(c, documentId).getVersion(
      documentId,
      Number(requiredParam(c, 'version')),
    )
    return version
      ? c.json(renderVersion(version, new URL(c.req.url).origin))
      : notFound(c, 'Document version not found')
  } catch (error) {
    return modelError(c, error)
  }
}

export async function applyDocumentUpdate(c: DocumentContext) {
  const authorization = await authorize(c, 'document:update')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const body = await jsonBody(c)
  if (!body) return badRequest(c, 'request body must be a JSON object')

  const baseVersion = body.baseVersion
  const content = stringField(body.content)
  const clientUpdateId = stringField(body.clientUpdateId)
  if (!Number.isInteger(baseVersion) || !content || !clientUpdateId) {
    return badRequest(c, 'baseVersion, content, and clientUpdateId are required')
  }

  try {
    const documentId = requiredParam(c, 'id')
    const result = await documentStub(c, documentId).applyUpdate({
      documentId,
      actorId: authorization.principal?.subject ?? 'unknown',
      baseVersion: baseVersion as number,
      content,
      clientUpdateId,
    })
    return c.json(renderUpdateResult(result.document, result.duplicate, new URL(c.req.url).origin))
  } catch (error) {
    return modelError(c, error)
  }
}

export async function approveDocument(c: DocumentContext) {
  const authorization = await authorize(c, 'document:approve')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const body = await jsonBody(c)
  if (!body || !Number.isInteger(body.expectedVersion) || !stringField(body.expectedContentHash)) {
    return badRequest(c, 'expectedVersion and expectedContentHash are required')
  }
  try {
    const documentId = requiredParam(c, 'id')
    const document = await documentStub(c, documentId).approve(
      documentId,
      body.expectedVersion as number,
      body.expectedContentHash as string,
    )
    return c.json(renderDocument(document, new URL(c.req.url).origin))
  } catch (error) {
    return modelError(c, error)
  }
}

export async function createReviewLink(c: DocumentContext) {
  const authorization = await authorize(c, 'document:review')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  try {
    const documentId = requiredParam(c, 'id')
    const review = await documentStub(c, documentId).review(documentId)
    return c.json(renderReviewLink(review, new URL(c.req.url).origin), 201)
  } catch (error) {
    return modelError(c, error)
  }
}

export async function getDocumentOperationSnapshot(c: DocumentContext) {
  const authorization = await authorize(c, 'document:read')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  try {
    const documentId = requiredParam(c, 'id')
    const snapshot = await (documentStub(c, documentId) as unknown as { operationSnapshot(id: string): Promise<any> }).operationSnapshot(documentId)
    if (snapshot) {
      const payload = { document: renderDocument(snapshot.document, new URL(c.req.url).origin), sequence: snapshot.sequence, blocks: snapshot.blocks, visibleBlocks: snapshot.visibleBlocks }
      return c.json(payload as Record<string, unknown>)
    }
    return notFound(c, 'Document not found')
  } catch (error) {
    return modelError(c, error)
  }
}

export async function applyDocumentOperation(c: DocumentContext) {
  const authorization = await authorize(c, 'document:update')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const body = await jsonBody(c)
  if (!body || !body.operation || typeof body.operation !== 'object') return badRequest(c, 'operation is required')
  try {
    const documentId = requiredParam(c, 'id')
    const result: unknown = await (documentStub(c, documentId) as unknown as {
      applyOperation(input: { documentId: string; actorId: string; operation: DocumentOperation }): Promise<unknown>
    }).applyOperation({
      documentId,
      actorId: authorization.principal?.subject ?? 'unknown',
      operation: body.operation as DocumentOperation,
    })
    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (error) {
    return modelError(c, error)
  }
}

export async function getYjsDocumentSnapshot(c: DocumentContext) {
  const authorization = await authorize(c, 'document:read')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  try {
    const documentId = requiredParam(c, 'id')
    const snapshot = await documentStub(c, documentId).yjsSnapshot(documentId)
    return snapshot ? c.json(snapshot) : notFound(c, 'Document not found')
  } catch (error) {
    return modelError(c, error)
  }
}

export async function applyYjsDocumentUpdate(c: DocumentContext) {
  const authorization = await authorize(c, 'document:update')
  if (!authorization.allowed) return authorizationResponse(c, authorization)
  const body = await jsonBody(c)
  if (!body || !body.envelope || typeof body.envelope !== 'object') return badRequest(c, 'envelope is required')
  if (!Number.isInteger(body.baseVersion) || !stringField(body.clientUpdateId)) {
    return badRequest(c, 'baseVersion and clientUpdateId are required')
  }
  try {
    const clientUpdateId = stringField(body.clientUpdateId)
    const baseVersion = body.baseVersion
    const result = await documentStub(c, requiredParam(c, 'id')).applyYjsTextUpdate({
      documentId: requiredParam(c, 'id'),
      actorId: authorization.principal?.subject ?? 'unknown',
      clientUpdateId: clientUpdateId as string,
      baseVersion: baseVersion as number,
      envelope: body.envelope as never,
    })
    return c.json(result)
  } catch (error) {
    return modelError(c, error)
  }
}

function documentStub(c: DocumentContext, documentId: string) {
  return c.env.DOCUMENTS.get(c.env.DOCUMENTS.idFromName(documentId))
}

function requiredParam(c: DocumentContext, name: string) {
  const value = c.req.param(name)
  if (!value) throw new Error(`${name} is required`)
  return value
}

function authorize(c: DocumentContext, capability: DocumentCapability) {
  return documentPolicy.authorize(capability, c.req.raw, c.env.PUBAGENT_AUTH_SECRET)
}

async function jsonBody(c: DocumentContext): Promise<Record<string, unknown> | null> {
  const body: unknown = await c.req.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : null
}

function authorizationResponse(c: DocumentContext, decision: Awaited<ReturnType<typeof authorize>>) {
  const message = decision.status === 401 ? 'unauthorized' : 'forbidden'
  return c.json(renderError(message), decision.status)
}

function badRequest(c: DocumentContext, message: string) {
  return c.json(renderError(message), 400)
}

function notFound(c: DocumentContext, message: string) {
  return c.json(renderError(message), 404)
}

function modelError(c: DocumentContext, error: unknown) {
  if (error instanceof DocumentConflictError || error instanceof DocumentFinalizedError) return c.json(renderError(error.message), 409)
  if (error instanceof DocumentCrdtError) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CAUSAL_GAP' || error.code === 'CONFLICT' ? 409 : 400
    return c.json(renderError(error.message), status)
  }
  if (error instanceof Error && error.message === 'Document not found') return notFound(c, error.message)
  if (error instanceof Error) return badRequest(c, error.message)
  return badRequest(c, 'request could not be processed')
}
