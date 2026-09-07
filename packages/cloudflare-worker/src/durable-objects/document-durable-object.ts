import { drizzle } from 'drizzle-orm/durable-sqlite'
import { migrate } from 'drizzle-orm/durable-sqlite/migrator'
import { DurableObject } from 'cloudflare:workers'

import migrations from '../../drizzle/migrations'
import { DrizzleDocumentStore } from '../database/document-store'
import type { CloudflareBindings } from '../env'
import {
  DocumentModel,
  DocumentConflictError,
  DocumentFinalizedError,
  type DocumentSnapshot,
  type DocumentUpdate,
  type DocumentVersion,
  type ReviewLink,
} from '../models/document-model'
import { DocumentCrdt, type AppliedOperation, type DocumentOperation } from '../models/document-crdt'
import {
  applyYjsTextUpdate,
  createYjsTextDocument,
  restoreYjsText,
  snapshotYjsText,
  type YjsTextSnapshot,
  type YjsTextUpdateEnvelope,
} from '../models/yjs-text'
import { documentPolicy, type DocumentCapability } from '../policy/document-policy'

export class DocumentDurableObject extends DurableObject {
  private readonly state: DurableObjectState
  private readonly bindings: CloudflareBindings
  private readonly model: DocumentModel
  private operationCrdt?: Promise<DocumentCrdt>
  private yjsTextDocument?: Promise<import('yjs').Doc>

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.state = ctx
    this.bindings = env
    const db = drizzle(ctx.storage)
    this.model = new DocumentModel(new DrizzleDocumentStore(db))

    ctx.blockConcurrencyWhile(async () => {
      await migrate(db, migrations)
    })
  }

  async createDocument(input: {
    documentId: string
    title: string
    content: string
    actorId: string
    clientUpdateId: string
  }): Promise<DocumentSnapshot> {
    const document = await this.model.create({ ...input, id: input.documentId })
    await this.ensureYjsTextSnapshot(document.content)
    return document
  }

  getDocument(documentId: string): Promise<DocumentSnapshot | null> {
    return this.model.get(documentId)
  }

  snapshot(documentId: string): Promise<DocumentSnapshot | null> {
    return this.model.get(documentId)
  }

  async operationSnapshot(documentId: string) {
    const document = await this.model.get(documentId)
    if (!document) return null
    const crdt = await this.getOperationCrdt()
    return { document, ...crdt.snapshot() }
  }

  getVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    return this.model.getVersion(documentId, version)
  }

  async applyUpdate(input: DocumentUpdate): Promise<{ document: DocumentSnapshot; duplicate: boolean }> {
    const result = await this.model.applyUpdate(input)
    if (!result.duplicate) {
      const document = createYjsTextDocument(result.document.content)
      this.yjsTextDocument = Promise.resolve(document)
      await this.state.storage.put('yjs-text-snapshot', snapshotYjsText(document))
    }
    return result
  }

  async applyOperation(input: { documentId: string; actorId: string; operation: DocumentOperation }) {
    const document = await this.model.get(input.documentId)
    if (!document) throw new Error('Document not found')
    if (document.status === 'finalized') throw new DocumentFinalizedError()
    const crdt = await this.getOperationCrdt()
    const result = crdt.apply({ ...input.operation, actorId: input.actorId })
    if (!result.duplicate) await this.state.storage.put('document-operation-history', crdt.updatesSince(0))
    return result
  }

  async applyYjsTextUpdate(input: {
    documentId: string
    actorId: string
    clientUpdateId: string
    baseVersion: number
    envelope: YjsTextUpdateEnvelope
  }) {
    const document = await this.model.get(input.documentId)
    if (!document) throw new Error('Document not found')
    const doc = await this.getYjsTextDocument(document.content)
    const existing = await this.model.getUpdateAck(input.documentId, input.clientUpdateId)
    if (existing) return { document: existing, duplicate: true, yjs: snapshotYjsText(doc) }
    if (document.status === 'finalized') throw new DocumentFinalizedError()
    if (input.baseVersion !== document.version) throw new DocumentConflictError()
    const stagedDoc = restoreYjsText(snapshotYjsText(doc))
    const yjs = applyYjsTextUpdate(stagedDoc, input.envelope)
    const result = await this.model.applyUpdate({
      documentId: input.documentId,
      actorId: input.actorId,
      clientUpdateId: input.clientUpdateId,
      baseVersion: input.baseVersion,
      content: yjs.text,
    })
    if (!result.duplicate) {
      this.yjsTextDocument = Promise.resolve(stagedDoc)
      await this.state.storage.put('yjs-text-snapshot', yjs)
    }
    return { ...result, yjs }
  }

  async yjsSnapshot(documentId: string) {
    const document = await this.model.get(documentId)
    if (!document) return null
    return snapshotYjsText(await this.getYjsTextDocument(document.content))
  }

  approve(documentId: string, expectedVersion: number, expectedContentHash: string): Promise<DocumentSnapshot> {
    return this.model.approve(documentId, expectedVersion, expectedContentHash)
  }

  propose(documentId: string): Promise<DocumentSnapshot> {
    return this.model.propose(documentId)
  }

  review(documentId: string): Promise<ReviewLink> {
    return this.model.review(documentId, crypto.randomUUID(), crypto.randomUUID())
  }

  async fetch(request: Request): Promise<Response> {
    const decision = await documentPolicy.authorize('document:collaborate', request, this.bindings.PUBAGENT_AUTH_SECRET)
    if (!decision.allowed) {
      return new Response(decision.status === 401 ? 'Unauthorized' : 'Forbidden', { status: decision.status })
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

  private async getOperationCrdt(): Promise<DocumentCrdt> {
    if (!this.operationCrdt) {
      this.operationCrdt = this.state.storage.get<AppliedOperation[]>('document-operation-history').then((history) => {
        const crdt = new DocumentCrdt()
        for (const applied of history ?? []) {
          const { sequence: _sequence, ...operation } = applied
          crdt.apply(operation)
        }
        return crdt
      })
    }
    return this.operationCrdt
  }

  private async getYjsTextDocument(fallbackText: string): Promise<import('yjs').Doc> {
    if (!this.yjsTextDocument) {
      this.yjsTextDocument = this.state.storage.get<YjsTextSnapshot>('yjs-text-snapshot').then((snapshot) =>
        snapshot ? restoreYjsText(snapshot) : createYjsTextDocument(fallbackText),
      )
    }
    return this.yjsTextDocument
  }

  private ensureYjsTextSnapshot(fallbackText: string): Promise<import('yjs').Doc> {
    if (!this.yjsTextDocument) {
      this.yjsTextDocument = this.state.storage.get<YjsTextSnapshot>('yjs-text-snapshot').then(async (snapshot) => {
        if (snapshot) return restoreYjsText(snapshot)
        const document = createYjsTextDocument(fallbackText)
        await this.state.storage.put('yjs-text-snapshot', snapshotYjsText(document))
        return document
      })
    }
    return this.yjsTextDocument
  }
}

export type { DocumentCapability }
