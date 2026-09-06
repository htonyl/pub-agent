import type { DocumentSnapshot, DocumentVersion, ReviewLink } from '../models/document-model'

export function renderDocument(document: DocumentSnapshot, origin: string) {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    status: document.status,
    version: document.version,
    contentHash: document.contentHash,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    permalink: documentPermalink(document.id, origin),
  }
}

export function renderVersion(version: DocumentVersion, origin: string) {
  return {
    ...renderDocument(version, origin),
    actorId: version.actorId,
    clientUpdateId: version.clientUpdateId,
  }
}

export function renderReviewLink(review: ReviewLink, origin: string) {
  return {
    id: review.id,
    documentId: review.documentId,
    reviewUrl: `${origin}/documents/${encodeURIComponent(review.documentId)}?review=${encodeURIComponent(review.token)}`,
    createdAt: review.createdAt.toISOString(),
  }
}

export function renderUpdateResult(document: DocumentSnapshot, duplicate: boolean, origin: string) {
  return { ...renderDocument(document, origin), duplicate }
}

export function renderError(error: string) {
  return { error }
}

export function renderDocumentHtml(document: DocumentSnapshot, origin: string) {
  const permalink = documentPermalink(document.id, origin)
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(document.title)}</title></head>
  <body>
    <main>
      <h1>${escapeHtml(document.title)}</h1>
      <p><a href="${escapeHtml(permalink)}">Stable permalink</a> · version ${document.version} · ${escapeHtml(document.status)}</p>
      <article><pre>${escapeHtml(document.content)}</pre></article>
    </main>
  </body>
</html>`
}

function documentPermalink(documentId: string, origin: string) {
  return `${origin}/documents/${encodeURIComponent(documentId)}`
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character,
  )
}
