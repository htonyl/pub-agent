import type { Context } from 'hono'

import type { AppEnv } from '../env'
import { documentPolicy } from '../policy/document-policy'
import { renderDocumentHtml } from '../views/document-view'

export async function renderDocumentPage(c: Context<AppEnv>) {
  const authorization = await documentPolicy.authorize('document:read', c.req.raw, c.env.PUBAGENT_AUTH_SECRET)
  if (!authorization.allowed) {
    return c.text(authorization.status === 401 ? 'Unauthorized' : 'Forbidden', authorization.status)
  }

  const documentId = requiredParam(c, 'id')
  const stub = c.env.DOCUMENTS.get(c.env.DOCUMENTS.idFromName(documentId))
  const document = await stub.getDocument(documentId)
  if (!document) return c.text('Document not found', 404)

  return c.html(renderDocumentHtml(document, new URL(c.req.url).origin))
}

export async function collaborateDocument(c: Context<AppEnv>) {
  const documentId = requiredParam(c, 'id')
  const stub = c.env.DOCUMENTS.get(c.env.DOCUMENTS.idFromName(documentId))
  return stub.fetch(c.req.raw)
}

function requiredParam(c: Context<AppEnv>, name: string) {
  const value = c.req.param(name)
  if (!value) throw new Error(`${name} is required`)
  return value
}
