export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }

export type TextBlockContent = {
  type: 'text'
  chunks: readonly string[]
}

export type PayloadBlockContent = {
  type: 'payload'
  value: JsonValue
}

export type BlockContent = TextBlockContent | PayloadBlockContent

export type ReviewMetadata = {
  status: 'draft' | 'proposed' | 'approved' | 'rejected'
  proposalId?: string
  proposedBy?: string
  approvedBy?: string
  approvedAt?: string
}

export type BlockProvenance = JsonObject

export type BlockTombstone = {
  sequence: number
  opId: string
  actorId: string
}

export type Block = {
  blockId: string
  kind: string
  schemaVersion: number
  attrs: JsonObject
  content: BlockContent
  provenance: BlockProvenance
  review?: ReviewMetadata
  deleted: boolean
  tombstone?: BlockTombstone
}

export type BlockPatch = Partial<
  Pick<Block, 'kind' | 'schemaVersion' | 'attrs' | 'content' | 'provenance' | 'review'>
>

export type OperationMetadata = {
  actorId: string
  clientId: string
  opId: string
  logicalClock: number
  baseSequence: number
}

export type InsertOperation = OperationMetadata & {
  type: 'insert'
  block: Block
  afterBlockId?: string | null
}

export type UpdateOperation = OperationMetadata & {
  type: 'update'
  blockId: string
  patch: BlockPatch
}

export type DeleteOperation = OperationMetadata & {
  type: 'delete'
  blockId: string
  reason?: string
}

export type MoveOperation = OperationMetadata & {
  type: 'move'
  blockId: string
  afterBlockId?: string | null
}

export type DocumentOperation =
  | InsertOperation
  | UpdateOperation
  | DeleteOperation
  | MoveOperation

export type AppliedOperation = DocumentOperation & {
  sequence: number
}

export type DocumentSnapshot = {
  sequence: number
  blocks: readonly Block[]
  visibleBlocks: readonly Block[]
}

export type ApplyResult = {
  appliedOperation: AppliedOperation
  duplicate: boolean
  snapshot: DocumentSnapshot
}

export type DocumentCrdtOptions = {
  maxChunkBytes?: number
}

export const DEFAULT_MAX_CHUNK_BYTES = 64 * 1024

export class DocumentCrdtError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'INVALID_OPERATION'
      | 'CAUSAL_GAP'
      | 'CONFLICT'
      | 'NOT_FOUND'
      | 'CHUNK_TOO_LARGE'
      | 'INVALID_CONTENT',
  ) {
    super(message)
    this.name = 'DocumentCrdtError'
  }
}

export class CausalGapError extends DocumentCrdtError {
  constructor(readonly currentSequence: number, readonly requestedBaseSequence: number) {
    super(
      `Operation base sequence ${requestedBaseSequence} is ahead of server sequence ${currentSequence}`,
      'CAUSAL_GAP',
    )
    this.name = 'CausalGapError'
  }
}

export class ChunkLimitError extends DocumentCrdtError {
  constructor(readonly chunkBytes: number, readonly maxChunkBytes: number) {
    super(`Text chunk is ${chunkBytes} bytes; maximum is ${maxChunkBytes}`, 'CHUNK_TOO_LARGE')
    this.name = 'ChunkLimitError'
  }
}

type BlockField = 'kind' | 'schemaVersion' | 'attrs' | 'content' | 'provenance' | 'review'

type OperationKey = Pick<OperationMetadata, 'logicalClock' | 'actorId' | 'clientId' | 'opId'>

type InternalBlock = {
  block: Block
  afterBlockId: string | null
  positionKey: OperationKey
  fieldKeys: Map<BlockField, OperationKey>
  deleteKey?: OperationKey
}

type SeenOperation = {
  fingerprint: string
  appliedOperation: AppliedOperation
}

function cloneJson<T extends JsonValue>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloneJson(entry)) as T
  }

  const copy: JsonObject = {}
  for (const [key, entry] of Object.entries(value)) {
    copy[key] = cloneJson(entry)
  }
  return copy as T
}

function cloneContent(content: BlockContent): BlockContent {
  return content.type === 'text'
    ? { type: 'text', chunks: [...content.chunks] }
    : { type: 'payload', value: cloneJson(content.value) }
}

function cloneReview(review: ReviewMetadata | undefined): ReviewMetadata | undefined {
  return review ? { ...review } : undefined
}

function cloneBlock(block: Block): Block {
  return {
    blockId: block.blockId,
    kind: block.kind,
    schemaVersion: block.schemaVersion,
    attrs: cloneJson(block.attrs),
    content: cloneContent(block.content),
    provenance: cloneJson(block.provenance),
    ...(block.review ? { review: cloneReview(block.review) } : {}),
    deleted: block.deleted,
    ...(block.tombstone ? { tombstone: { ...block.tombstone } } : {}),
  }
}

function cloneOperation(operation: DocumentOperation): DocumentOperation {
  switch (operation.type) {
    case 'insert':
      return {
        ...operation,
        block: cloneBlock(operation.block),
      }
    case 'update':
      return {
        ...operation,
        patch: {
          ...operation.patch,
          ...(operation.patch.attrs ? { attrs: cloneJson(operation.patch.attrs) } : {}),
          ...(operation.patch.content ? { content: cloneContent(operation.patch.content) } : {}),
          ...(operation.patch.provenance
            ? { provenance: cloneJson(operation.patch.provenance) }
            : {}),
          ...(operation.patch.review ? { review: cloneReview(operation.patch.review) } : {}),
        },
      }
    default:
      return { ...operation }
  }
}

function cloneAppliedOperation(operation: AppliedOperation): AppliedOperation {
  return { ...cloneOperation(operation), sequence: operation.sequence } as AppliedOperation
}

function operationKey(operation: OperationMetadata): OperationKey {
  return {
    logicalClock: operation.logicalClock,
    actorId: operation.actorId,
    clientId: operation.clientId,
    opId: operation.opId,
  }
}

function compareOperationKeys(left: OperationKey, right: OperationKey): number {
  if (left.logicalClock !== right.logicalClock) {
    return left.logicalClock - right.logicalClock
  }

  for (const field of ['actorId', 'clientId', 'opId'] as const) {
    if (left[field] !== right[field]) {
      return left[field] < right[field] ? -1 : 1
    }
  }
  return 0
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry))
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

function fingerprint(operation: DocumentOperation): string {
  return JSON.stringify(canonicalize(operation))
}

function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocumentCrdtError(`${field} must be a non-empty string`, 'INVALID_OPERATION')
  }
}

function assertInteger(value: number, field: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new DocumentCrdtError(`${field} must be an integer >= ${minimum}`, 'INVALID_OPERATION')
  }
}

function assertWellFormedUtf16(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) {
        throw new DocumentCrdtError('Text chunks must contain well-formed UTF-16', 'INVALID_CONTENT')
      }
      index += 1
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new DocumentCrdtError('Text chunks must contain well-formed UTF-16', 'INVALID_CONTENT')
    }
  }
}

function textByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function validateTextContent(content: TextBlockContent, maxChunkBytes: number): void {
  if (!Array.isArray(content.chunks)) {
    throw new DocumentCrdtError('Text content chunks must be an array', 'INVALID_CONTENT')
  }

  for (const chunk of content.chunks) {
    if (typeof chunk !== 'string') {
      throw new DocumentCrdtError('Text content chunks must be strings', 'INVALID_CONTENT')
    }
    assertWellFormedUtf16(chunk)
    const bytes = textByteLength(chunk)
    if (bytes > maxChunkBytes) {
      throw new ChunkLimitError(bytes, maxChunkBytes)
    }
  }
}

function validateContent(content: BlockContent, maxChunkBytes: number): void {
  if (!content || (content.type !== 'text' && content.type !== 'payload')) {
    throw new DocumentCrdtError('Block content must be text or payload content', 'INVALID_CONTENT')
  }
  if (content.type === 'text') {
    validateTextContent(content, maxChunkBytes)
  }
}

function assertBlock(block: Block, maxChunkBytes: number): void {
  assertNonEmptyString(block.blockId, 'block.blockId')
  assertNonEmptyString(block.kind, 'block.kind')
  assertInteger(block.schemaVersion, 'block.schemaVersion', 0)
  if (block.deleted) {
    throw new DocumentCrdtError('Inserted blocks cannot already be deleted', 'INVALID_OPERATION')
  }
  validateContent(block.content, maxChunkBytes)
}

function assertPatch(patch: BlockPatch, maxChunkBytes: number): void {
  if (patch.kind !== undefined) assertNonEmptyString(patch.kind, 'patch.kind')
  if (patch.schemaVersion !== undefined) assertInteger(patch.schemaVersion, 'patch.schemaVersion', 0)
  if (patch.content !== undefined) validateContent(patch.content, maxChunkBytes)
}

/** Split text without cutting a UTF-8 sequence or a Unicode surrogate pair. */
export function chunkText(text: string, maxChunkBytes = DEFAULT_MAX_CHUNK_BYTES): string[] {
  assertInteger(maxChunkBytes, 'maxChunkBytes', 1)
  assertWellFormedUtf16(text)

  const chunks: string[] = []
  let chunk = ''
  for (const character of text) {
    const candidate = chunk + character
    if (textByteLength(candidate) > maxChunkBytes) {
      if (chunk.length === 0) {
        throw new ChunkLimitError(textByteLength(character), maxChunkBytes)
      }
      chunks.push(chunk)
      chunk = character
    } else {
      chunk = candidate
    }
  }
  if (chunk.length > 0) chunks.push(chunk)
  return chunks
}

export class DocumentCrdt {
  private readonly blocks = new Map<string, InternalBlock>()
  private readonly seenOperations = new Map<string, SeenOperation>()
  private readonly history: AppliedOperation[] = []
  private readonly maxChunkBytes: number
  private sequence = 0

  constructor(options: DocumentCrdtOptions = {}) {
    this.maxChunkBytes = options.maxChunkBytes ?? DEFAULT_MAX_CHUNK_BYTES
    assertInteger(this.maxChunkBytes, 'maxChunkBytes', 1)
  }

  get currentSequence(): number {
    return this.sequence
  }

  apply(operation: DocumentOperation): ApplyResult {
    this.validateOperation(operation)

    const existing = this.seenOperations.get(operation.opId)
    const operationFingerprint = fingerprint(operation)
    if (existing) {
      if (existing.fingerprint !== operationFingerprint) {
        throw new DocumentCrdtError(`Operation ${operation.opId} was replayed with different data`, 'CONFLICT')
      }
      return {
        appliedOperation: cloneAppliedOperation(existing.appliedOperation),
        duplicate: true,
        snapshot: this.snapshot(),
      }
    }

    if (operation.baseSequence > this.sequence) {
      throw new CausalGapError(this.sequence, operation.baseSequence)
    }

    const nextSequence = this.sequence + 1
    switch (operation.type) {
      case 'insert':
        this.applyInsert(operation)
        break
      case 'update':
        this.applyUpdate(operation)
        break
      case 'delete':
        this.applyDelete(operation, nextSequence)
        break
      case 'move':
        this.applyMove(operation)
        break
    }

    this.sequence = nextSequence
    const appliedOperation = { ...cloneOperation(operation), sequence: nextSequence } as AppliedOperation
    this.history.push(appliedOperation)
    this.seenOperations.set(operation.opId, {
      fingerprint: operationFingerprint,
      appliedOperation: cloneAppliedOperation(appliedOperation),
    })

    return { appliedOperation: cloneAppliedOperation(appliedOperation), duplicate: false, snapshot: this.snapshot() }
  }

  applyOperation(operation: DocumentOperation): ApplyResult {
    return this.apply(operation)
  }

  snapshot(): DocumentSnapshot {
    const blocks = this.orderedBlocks().map((entry) => cloneBlock(entry.block))
    return {
      sequence: this.sequence,
      blocks,
      visibleBlocks: blocks.filter((block) => !block.deleted),
    }
  }

  getSnapshot(): DocumentSnapshot {
    return this.snapshot()
  }

  getBlock(blockId: string): Block | null {
    return this.blocks.has(blockId) ? cloneBlock(this.blocks.get(blockId)!.block) : null
  }

  updatesSince(sequence = 0): readonly AppliedOperation[] {
    assertInteger(sequence, 'sequence', 0)
    return this.history.filter((operation) => operation.sequence > sequence).map(cloneAppliedOperation)
  }

  private validateOperation(operation: DocumentOperation): void {
    if (!operation || !['insert', 'update', 'delete', 'move'].includes(operation.type)) {
      throw new DocumentCrdtError('Operation type is invalid', 'INVALID_OPERATION')
    }
    assertNonEmptyString(operation.actorId, 'actorId')
    assertNonEmptyString(operation.clientId, 'clientId')
    assertNonEmptyString(operation.opId, 'opId')
    assertInteger(operation.logicalClock, 'logicalClock', 0)
    assertInteger(operation.baseSequence, 'baseSequence', 0)

    if (operation.type === 'insert') {
      assertBlock(operation.block, this.maxChunkBytes)
      if (operation.afterBlockId !== undefined && operation.afterBlockId !== null) {
        assertNonEmptyString(operation.afterBlockId, 'afterBlockId')
      }
    } else {
      assertNonEmptyString(operation.blockId, 'blockId')
      if (operation.type === 'update') assertPatch(operation.patch, this.maxChunkBytes)
      if (operation.type === 'move' && operation.afterBlockId !== undefined && operation.afterBlockId !== null) {
        assertNonEmptyString(operation.afterBlockId, 'afterBlockId')
      }
    }
  }

  private applyInsert(operation: InsertOperation): void {
    if (this.blocks.has(operation.block.blockId)) {
      throw new DocumentCrdtError(`Block ${operation.block.blockId} already exists`, 'CONFLICT')
    }
    const afterBlockId = operation.afterBlockId ?? null
    if (afterBlockId !== null && !this.blocks.has(afterBlockId)) {
      throw new DocumentCrdtError(`Anchor block ${afterBlockId} does not exist`, 'NOT_FOUND')
    }

    const key = operationKey(operation)
    const block = cloneBlock(operation.block)
    const fieldKeys = new Map<BlockField, OperationKey>()
    for (const field of ['kind', 'schemaVersion', 'attrs', 'content', 'provenance', 'review'] as const) {
      fieldKeys.set(field, key)
    }
    this.blocks.set(block.blockId, { block, afterBlockId, positionKey: key, fieldKeys })
  }

  private applyUpdate(operation: UpdateOperation): void {
    const entry = this.blocks.get(operation.blockId)
    if (!entry) throw new DocumentCrdtError(`Block ${operation.blockId} does not exist`, 'NOT_FOUND')
    if (entry.block.deleted) return

    const key = operationKey(operation)
    const updateField = <Field extends BlockField>(field: Field, value: BlockPatch[Field]): void => {
      if (value === undefined) return
      const previousKey = entry.fieldKeys.get(field)
      if (previousKey && compareOperationKeys(key, previousKey) <= 0) return

      if (field === 'content') {
        entry.block.content = cloneContent(value as BlockContent)
      } else if (field === 'attrs') {
        entry.block.attrs = cloneJson(value as JsonObject)
      } else if (field === 'provenance') {
        entry.block.provenance = cloneJson(value as JsonObject)
      } else if (field === 'review') {
        entry.block.review = cloneReview(value as ReviewMetadata)
      } else {
        entry.block[field] = value as never
      }
      entry.fieldKeys.set(field, key)
    }

    updateField('kind', operation.patch.kind)
    updateField('schemaVersion', operation.patch.schemaVersion)
    updateField('attrs', operation.patch.attrs)
    updateField('content', operation.patch.content)
    updateField('provenance', operation.patch.provenance)
    updateField('review', operation.patch.review)
  }

  private applyDelete(operation: DeleteOperation, sequence: number): void {
    const entry = this.blocks.get(operation.blockId)
    if (!entry) throw new DocumentCrdtError(`Block ${operation.blockId} does not exist`, 'NOT_FOUND')
    const key = operationKey(operation)
    if (!entry.block.deleted || !entry.deleteKey || compareOperationKeys(key, entry.deleteKey) > 0) {
      entry.block.deleted = true
      entry.block.tombstone = { sequence, opId: operation.opId, actorId: operation.actorId }
      entry.deleteKey = key
    }
  }

  private applyMove(operation: MoveOperation): void {
    const entry = this.blocks.get(operation.blockId)
    if (!entry) throw new DocumentCrdtError(`Block ${operation.blockId} does not exist`, 'NOT_FOUND')
    const afterBlockId = operation.afterBlockId ?? null
    if (afterBlockId !== null && !this.blocks.has(afterBlockId)) {
      throw new DocumentCrdtError(`Anchor block ${afterBlockId} does not exist`, 'NOT_FOUND')
    }
    if (afterBlockId === operation.blockId || this.isDescendant(afterBlockId, operation.blockId)) {
      throw new DocumentCrdtError('A block cannot be moved after itself or its descendant', 'CONFLICT')
    }

    const key = operationKey(operation)
    if (compareOperationKeys(key, entry.positionKey) > 0) {
      entry.afterBlockId = afterBlockId
      entry.positionKey = key
    }
  }

  private isDescendant(candidateId: string | null, ancestorId: string): boolean {
    let current = candidateId
    while (current !== null) {
      if (current === ancestorId) return true
      current = this.blocks.get(current)?.afterBlockId ?? null
    }
    return false
  }

  private orderedBlocks(): InternalBlock[] {
    const children = new Map<string | null, InternalBlock[]>()
    for (const entry of this.blocks.values()) {
      const siblings = children.get(entry.afterBlockId) ?? []
      siblings.push(entry)
      children.set(entry.afterBlockId, siblings)
    }
    for (const siblings of children.values()) {
      siblings.sort((left, right) => compareOperationKeys(left.positionKey, right.positionKey))
    }

    const ordered: InternalBlock[] = []
    const visit = (parentId: string | null, path: Set<string>): void => {
      for (const entry of children.get(parentId) ?? []) {
        if (path.has(entry.block.blockId)) {
          throw new DocumentCrdtError('Document contains a position cycle', 'CONFLICT')
        }
        ordered.push(entry)
        const nextPath = new Set(path)
        nextPath.add(entry.block.blockId)
        visit(entry.block.blockId, nextPath)
      }
    }
    visit(null, new Set())
    return ordered
  }
}

export { DocumentCrdt as DocumentCrdtModel }
