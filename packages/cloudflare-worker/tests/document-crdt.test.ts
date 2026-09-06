import { describe, expect, it } from 'vitest'

import {
  CausalGapError,
  ChunkLimitError,
  DocumentCrdt,
  type Block,
  type InsertOperation,
  chunkText,
} from '../src/models/document-crdt'

const block = (blockId: string, content = blockId): Block => ({
  blockId,
  kind: 'paragraph',
  schemaVersion: 1,
  attrs: {},
  content: { type: 'text', chunks: [content] },
  provenance: { source: 'test' },
  deleted: false,
})

const insert = (
  opId: string,
  blockId: string,
  baseSequence: number,
  afterBlockId: string | null = null,
): InsertOperation => ({
  type: 'insert',
  actorId: opId.split('-')[0],
  clientId: 'client-1',
  opId,
  logicalClock: Number(opId.split('-')[1]),
  baseSequence,
  block: block(blockId),
  afterBlockId,
})

describe('DocumentCrdt', () => {
  it('assigns authoritative sequences and replays duplicate operations idempotently', () => {
    const model = new DocumentCrdt()
    const operation = insert('alice-1', 'a', 0)

    const first = model.apply(operation)
    const duplicate = model.apply({ ...operation })

    expect(first.appliedOperation.sequence).toBe(1)
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.appliedOperation.sequence).toBe(1)
    expect(duplicate.snapshot).toEqual(first.snapshot)
    expect(model.updatesSince(0)).toHaveLength(1)
  })

  it('rejects operations with a causal gap', () => {
    const model = new DocumentCrdt()

    expect(() => model.apply(insert('alice-1', 'a', 1))).toThrow(CausalGapError)
    expect(model.currentSequence).toBe(0)
  })

  it('orders concurrent inserts after the same anchor deterministically', () => {
    const model = new DocumentCrdt()
    model.apply(insert('root-1', 'root', 0))

    model.apply(insert('zara-2', 'zara', 1, 'root'))
    model.apply(insert('amy-2', 'amy', 1, 'root'))

    expect(model.snapshot().visibleBlocks.map(({ blockId }) => blockId)).toEqual(['root', 'amy', 'zara'])
  })

  it('applies concurrent updates by deterministic operation key', () => {
    const model = new DocumentCrdt()
    model.apply(insert('root-1', 'root', 0))

    model.apply({
      type: 'update',
      actorId: 'zara',
      clientId: 'client-1',
      opId: 'zara-2',
      logicalClock: 2,
      baseSequence: 1,
      blockId: 'root',
      patch: { attrs: { winner: 'zara' } },
    })
    model.apply({
      type: 'update',
      actorId: 'amy',
      clientId: 'client-1',
      opId: 'amy-2',
      logicalClock: 2,
      baseSequence: 1,
      blockId: 'root',
      patch: { attrs: { winner: 'amy' } },
    })

    expect(model.getBlock('root')?.attrs).toEqual({ winner: 'zara' })
  })

  it('retains deleted blocks as tombstones while hiding them from visible blocks', () => {
    const model = new DocumentCrdt()
    model.apply(insert('root-1', 'root', 0))
    model.apply({
      type: 'delete',
      actorId: 'alice',
      clientId: 'client-1',
      opId: 'alice-2',
      logicalClock: 2,
      baseSequence: 1,
      blockId: 'root',
    })

    expect(model.snapshot().visibleBlocks).toEqual([])
    expect(model.snapshot().blocks).toMatchObject([
      { blockId: 'root', deleted: true, tombstone: { sequence: 2, opId: 'alice-2' } },
    ])
  })

  it('validates UTF-8 chunk limits and can chunk large text safely', () => {
    expect(chunkText('a🙂b', 5)).toEqual(['a🙂', 'b'])
    const model = new DocumentCrdt({ maxChunkBytes: 4 })

    expect(() => model.apply({ ...insert('alice-1', 'a', 0), block: block('a', '🙂🙂') })).toThrow(
      ChunkLimitError,
    )
  })

  it('materializes updates, moves, and tombstones in a stable snapshot', () => {
    const model = new DocumentCrdt()
    model.apply(insert('root-1', 'root', 0))
    model.apply(insert('child-2', 'child', 1, 'root'))
    model.apply(insert('other-3', 'other', 2, null))
    model.apply({
      type: 'move',
      actorId: 'child',
      clientId: 'client-1',
      opId: 'child-4',
      logicalClock: 4,
      baseSequence: 3,
      blockId: 'child',
      afterBlockId: 'other',
    })
    model.apply({
      type: 'update',
      actorId: 'root',
      clientId: 'client-1',
      opId: 'root-5',
      logicalClock: 5,
      baseSequence: 4,
      blockId: 'root',
      patch: { content: { type: 'text', chunks: ['updated'] } },
    })

    const snapshot = model.snapshot()
    expect(snapshot.sequence).toBe(5)
    expect(snapshot.visibleBlocks.map(({ blockId }) => blockId)).toEqual(['root', 'other', 'child'])
    expect(snapshot.blocks[0].content).toEqual({ type: 'text', chunks: ['updated'] })
  })
})
