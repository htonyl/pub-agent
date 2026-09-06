import type { Context } from 'hono'

import { DocumentConflictError } from '../models/document-model'
import type { AppEnv } from '../env'
import { documentPolicy, type DocumentCapability } from '../policy/document-policy'
import { renderDocument, renderError, renderReviewLink, renderUpdateResult, renderVersion } from '../views/document-view'

type DocumentContext = Context<AppEnv>

export async function createDocument(c: DocumentContext) {
  if (!authorize(c, 'document:create')) return forbidden(c)
  const body = await jsonBody(c)
  if (!body) return badRequest(c, 'request body must be a JSON object')

  const title = stringField(body.title)
  const content = stringField(body.content)
  const clientUpdateId = stringField(body.clientUpdateId)
  if (!title || !content || !clientUpdateId) {
    return badRequest(c, 'title, content, and clientUpdateId are required')
  }

  try {
    const documentId = crypto.randomUUID()
    const document = await documentStub(c, documentId).createDocument({
      documentId,
      title,
      content,
      clientUpdateId,
      actorId: c.req.header('x-pubagent-actor') ?? 'http',
    })
    return c.json(renderDocument(document, new URL(c.req.url).origin), 201)
  } catch (error) {
    return modelError(c, error)
  }
}

export async function getDocument(c: DocumentContext) {
  if (!authorize(c, 'document:read')) return forbidden(c)
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
  if (!authorize(c, 'document:read')) return forbidden(c)
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
  if (!authorize(c, 'document:update')) return forbidden(c)
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
      actorId: c.req.header('x-pubagent-actor') ?? 'http',
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
  if (!authorize(c, 'document:approve')) return forbidden(c)
  try {
    const documentId = requiredParam(c, 'id')
    const document = await documentStub(c, documentId).approve(documentId)
    return c.json(renderDocument(document, new URL(c.req.url).origin))
  } catch (error) {
    return modelError(c, error)
  }
}

export async function createReviewLink(c: DocumentContext) {
  if (!authorize(c, 'document:review')) return forbidden(c)
  try {
    const documentId = requiredParam(c, 'id')
    const review = await documentStub(c, documentId).review(documentId)
    return c.json(renderReviewLink(review, new URL(c.req.url).origin), 201)
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
  return documentPolicy.authorize(capability, c.req.raw)
}

async function jsonBody(c: DocumentContext): Promise<Record<string, unknown> | null> {
  const body: unknown = await c.req.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : null
}

function forbidden(c: DocumentContext) {
  return c.json(renderError('forbidden'), 403)
}

function badRequest(c: DocumentContext, message: string) {
  return c.json(renderError(message), 400)
}

function notFound(c: DocumentContext, message: string) {
  return c.json(renderError(message), 404)
}

function modelError(c: DocumentContext, error: unknown) {
  if (error instanceof DocumentConflictError) return c.json(renderError(error.message), 409)
  if (error instanceof Error && error.message === 'Document not found') return notFound(c, error.message)
  if (error instanceof Error) return badRequest(c, error.message)
  return badRequest(c, 'request could not be processed')
}
