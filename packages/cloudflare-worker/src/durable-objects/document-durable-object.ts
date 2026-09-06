import { drizzle } from 'drizzle-orm/durable-sqlite'
import { migrate } from 'drizzle-orm/durable-sqlite/migrator'
import { DurableObject } from 'cloudflare:workers'

import migrations from '../../drizzle/migrations'
import { DrizzleDocumentStore } from '../database/document-store'
import type { CloudflareBindings } from '../env'
import {
  DocumentModel,
  type DocumentSnapshot,
  type DocumentUpdate,
  type DocumentVersion,
  type ReviewLink,
} from '../models/document-model'
import { documentPolicy, type DocumentCapability } from '../policy/document-policy'

export class DocumentDurableObject extends DurableObject {
  private readonly state: DurableObjectState
  private readonly model: DocumentModel

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.state = ctx
    const db = drizzle(ctx.storage)
    this.model = new DocumentModel(new DrizzleDocumentStore(db))

    ctx.blockConcurrencyWhile(async () => {
      await migrate(db, migrations)
    })
  }

  createDocument(input: {
    documentId: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
  }): Promise<DocumentSnapshot> {
    return this.model.create({ ...input, id: input.documentId })
  }

  getDocument(documentId: string): Promise<DocumentSnapshot | null> {
    return this.model.get(documentId)
  }

  snapshot(documentId: string): Promise<DocumentSnapshot | null> {
    return this.model.get(documentId)
  }

  getVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    return this.model.getVersion(documentId, version)
  }

  applyUpdate(input: DocumentUpdate): Promise<{ document: DocumentSnapshot; duplicate: boolean }> {
    return this.model.applyUpdate(input)
  }

  approve(documentId: string): Promise<DocumentSnapshot> {
    return this.model.approve(documentId)
  }

  review(documentId: string): Promise<ReviewLink> {
    return this.model.review(documentId, crypto.randomUUID(), crypto.randomUUID())
  }

  async fetch(request: Request): Promise<Response> {
    if (!documentPolicy.authorize('document:collaborate', request)) {
      return new Response('Forbidden', { status: 403 })
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    this.state.acceptWebSocket(server)
    server.send(JSON.stringify({ type: 'ready' }))
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(_webSocket: WebSocket, message: string | ArrayBuffer) {
    const payload = typeof message === 'string' ? message : new TextDecoder().decode(message)
    for (const socket of this.state.getWebSockets()) {
      socket.send(payload)
    }
  }

  webSocketClose(webSocket: WebSocket) {
    webSocket.close()
  }

  webSocketError(webSocket: WebSocket) {
    webSocket.close()
  }
}

export type { DocumentCapability }
