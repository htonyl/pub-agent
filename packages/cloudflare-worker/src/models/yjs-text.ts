import * as Y from 'yjs'

import { DEFAULT_MAX_CHUNK_BYTES, DocumentCrdtError } from './document-crdt'

export const YJS_TEXT_PROTOCOL = 'yjs-text/v1'
export const DEFAULT_MAX_YJS_UPDATE_BYTES = 2 * 1024 * 1024

export type YjsTextUpdateEnvelope = {
  protocol: typeof YJS_TEXT_PROTOCOL
  updateId: string
  baseStateVector: string
  totalBytes: number
  chunkBytes: number
  chunks: readonly string[]
}

export type YjsTextSnapshot = {
  protocol: typeof YJS_TEXT_PROTOCOL
  text: string
  update: string
  stateVector: string
}

export class YjsTextError extends DocumentCrdtError {
  constructor(message: string, code: 'INVALID_CONTENT' | 'CAUSAL_GAP' | 'CHUNK_TOO_LARGE' = 'INVALID_CONTENT') {
    super(message, code)
    this.name = 'YjsTextError'
  }
}

export class YjsCausalGapError extends YjsTextError {
  constructor(readonly missingClients: number[]) {
    super(`Yjs update depends on unavailable client clocks: ${missingClients.join(', ')}`, 'CAUSAL_GAP')
    this.name = 'YjsCausalGapError'
  }
}

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return btoa(binary)
}

function base64Decode(value: string, field: string): Uint8Array {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new YjsTextError(`${field} must be canonical base64`)
  }
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    if (base64Encode(bytes) !== value) throw new Error('non-canonical base64')
    return bytes
  } catch {
    throw new YjsTextError(`${field} must be canonical base64`)
  }
}

function assertLimit(value: number, field: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new YjsTextError(`${field} must be an integer >= ${minimum}`)
  }
}

function assertUpdate(bytes: Uint8Array, maxBytes: number): void {
  assertLimit(maxBytes, 'maxBytes', 1)
  if (bytes.byteLength === 0) throw new YjsTextError('Yjs updates must not be empty')
  if (bytes.byteLength > maxBytes) {
    throw new YjsTextError(`Yjs update is ${bytes.byteLength} bytes; maximum is ${maxBytes}`, 'CHUNK_TOO_LARGE')
  }
}

function assertProtocol(value: unknown): asserts value is typeof YJS_TEXT_PROTOCOL {
  if (value !== YJS_TEXT_PROTOCOL) throw new YjsTextError('Unsupported Yjs text protocol')
}

function decodeVector(value: string, field: string): Map<number, number> {
  const bytes = base64Decode(value, field)
  try {
    return Y.decodeStateVector(bytes)
  } catch {
    throw new YjsTextError(`${field} is not a valid Yjs state vector`)
  }
}

function compareDependency(base: Map<number, number>, current: Map<number, number>): void {
  const missing: number[] = []
  for (const [client, clock] of base) {
    if ((current.get(client) ?? 0) < clock) missing.push(client)
  }
  if (missing.length > 0) throw new YjsCausalGapError(missing)
}

function vectorsEqual(left: Map<number, number>, right: Map<number, number>): boolean {
  if (left.size !== right.size) return false
  for (const [client, clock] of left) if (right.get(client) !== clock) return false
  return true
}

/** Create a Y.Doc whose only shared type is the text of one bounded block. */
export function createYjsTextDocument(text = ''): Y.Doc {
  if (typeof text !== 'string') throw new YjsTextError('text must be a string')
  const doc = new Y.Doc({ gc: false })
  if (text.length > 0) doc.getText('text').insert(0, text)
  return doc
}

export function readYjsText(doc: Y.Doc): string {
  return doc.getText('text').toString()
}

export function encodeYjsTextUpdate(doc: Y.Doc, baseStateVector?: Uint8Array): Uint8Array {
  const update = Y.encodeStateAsUpdate(doc, baseStateVector)
  assertUpdate(update, DEFAULT_MAX_YJS_UPDATE_BYTES)
  return update
}

export function encodeYjsTextEnvelope(
  update: Uint8Array,
  baseStateVector: Uint8Array,
  updateId: string,
  maxChunkBytes = DEFAULT_MAX_CHUNK_BYTES,
  maxUpdateBytes = DEFAULT_MAX_YJS_UPDATE_BYTES,
): YjsTextUpdateEnvelope {
  if (typeof updateId !== 'string' || updateId.length === 0) throw new YjsTextError('updateId must be non-empty')
  assertLimit(maxChunkBytes, 'maxChunkBytes', 1)
  assertUpdate(update, maxUpdateBytes)
  try {
    Y.decodeStateVector(baseStateVector)
  } catch {
    throw new YjsTextError('baseStateVector is not a valid Yjs state vector')
  }

  const chunks: string[] = []
  for (let offset = 0; offset < update.byteLength; offset += maxChunkBytes) {
    chunks.push(base64Encode(update.slice(offset, Math.min(offset + maxChunkBytes, update.byteLength))))
  }
  return {
    protocol: YJS_TEXT_PROTOCOL,
    updateId,
    baseStateVector: base64Encode(baseStateVector),
    totalBytes: update.byteLength,
    chunkBytes: maxChunkBytes,
    chunks,
  }
}

/** Assemble all chunks before passing bytes to Y.applyUpdate. Individual chunks are never updates. */
export function assembleYjsTextUpdate(
  envelope: YjsTextUpdateEnvelope,
  maxUpdateBytes = DEFAULT_MAX_YJS_UPDATE_BYTES,
): Uint8Array {
  assertProtocol(envelope?.protocol)
  if (typeof envelope.updateId !== 'string' || envelope.updateId.length === 0) {
    throw new YjsTextError('updateId must be non-empty')
  }
  assertLimit(envelope.totalBytes, 'totalBytes', 1)
  assertLimit(envelope.chunkBytes, 'chunkBytes', 1)
  if (envelope.totalBytes > maxUpdateBytes) {
    throw new YjsTextError(`Yjs update is ${envelope.totalBytes} bytes; maximum is ${maxUpdateBytes}`, 'CHUNK_TOO_LARGE')
  }
  if (!Array.isArray(envelope.chunks) || envelope.chunks.length === 0) {
    throw new YjsTextError('chunks must contain the complete Yjs update')
  }

  const chunks = envelope.chunks.map((chunk, index) => {
    const bytes = base64Decode(chunk, `chunks[${index}]`)
    if (bytes.byteLength > envelope.chunkBytes) {
      throw new YjsTextError(`chunks[${index}] exceeds chunkBytes`, 'CHUNK_TOO_LARGE')
    }
    return bytes
  })
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  if (total !== envelope.totalBytes) throw new YjsTextError('totalBytes does not match complete chunks')

  const update = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    update.set(chunk, offset)
    offset += chunk.byteLength
  }
  assertUpdate(update, maxUpdateBytes)
  return update
}

export function applyYjsTextUpdate(
  doc: Y.Doc,
  envelope: YjsTextUpdateEnvelope,
  maxUpdateBytes = DEFAULT_MAX_YJS_UPDATE_BYTES,
): YjsTextSnapshot {
  const baseStateVector = decodeVector(envelope.baseStateVector, 'baseStateVector')
  compareDependency(baseStateVector, Y.decodeStateVector(Y.encodeStateVector(doc)))
  const update = assembleYjsTextUpdate(envelope, maxUpdateBytes)
  try {
    Y.applyUpdate(doc, update)
  } catch {
    throw new YjsTextError('update is not a valid Yjs update')
  }
  return snapshotYjsText(doc)
}

export function snapshotYjsText(doc: Y.Doc): YjsTextSnapshot {
  return {
    protocol: YJS_TEXT_PROTOCOL,
    text: readYjsText(doc),
    update: base64Encode(Y.encodeStateAsUpdate(doc)),
    stateVector: base64Encode(Y.encodeStateVector(doc)),
  }
}

export function restoreYjsText(snapshot: YjsTextSnapshot): Y.Doc {
  assertProtocol(snapshot?.protocol)
  const update = base64Decode(snapshot.update, 'update')
  const stateVector = decodeVector(snapshot.stateVector, 'stateVector')
  const doc = new Y.Doc({ gc: false })
  try {
    Y.applyUpdate(doc, update)
  } catch {
    throw new YjsTextError('update is not a valid Yjs update')
  }
  const actualVector = Y.decodeStateVector(Y.encodeStateVector(doc))
  if (!vectorsEqual(stateVector, actualVector)) throw new YjsTextError('stateVector does not match update')
  if (readYjsText(doc) !== snapshot.text) throw new YjsTextError('snapshot text does not match update')
  return doc
}
