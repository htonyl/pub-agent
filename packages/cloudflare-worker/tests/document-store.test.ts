import { describe, expect, it } from 'vitest'

import { DrizzleDocumentStore } from '../src/database/document-store'

describe('DrizzleDocumentStore', () => {
  it('executes create writes synchronously inside the durable-sqlite transaction', async () => {
    const events: string[] = []
    const db = {
      transaction(callback: (tx: {
        insert: (table: unknown) => {
          values: (row: unknown) => { run: () => void }
        }
      }) => unknown) {
        const result = callback({
          insert: () => ({
            values: () => ({
              run: () => events.push('write'),
            }),
          }),
        })
        expect(result).not.toBeInstanceOf(Promise)
        events.push('returned')
        return result
      },
    } as unknown as ConstructorParameters<typeof DrizzleDocumentStore>[0]

    const snapshot = await new DrizzleDocumentStore(db).create({
      id: 'doc-1',
      title: 'Draft',
      content: 'hello',
      actorId: 'agent-1',
      clientUpdateId: 'create-1',
      now: new Date(1),
      contentHash: 'hash-1',
    })

    expect(snapshot.version).toBe(1)
    expect(events).toEqual(['write', 'write', 'write', 'returned'])
  })
})
