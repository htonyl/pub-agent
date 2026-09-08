import { describe, expect, it } from 'vitest'

import { DrizzleDocumentStore } from '../src/database/document-store'
import { documentUpdates, documents } from '../src/database/schema'
import { DocumentConflictError } from '../src/models/document-model'

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

  it('rejects a conflicting payload when the transaction observes an existing update key', async () => {
    const now = new Date(1)
    const existingUpdate = {
      id: 'doc-1:edit-1',
      documentId: 'doc-1',
      clientUpdateId: 'edit-1',
      version: 2,
      actorId: 'agent-1',
      createdAt: now,
    }
    const current = {
      id: 'doc-1',
      title: 'Draft',
      content: 'two',
      status: 'draft',
      version: 2,
      contentHash: 'hash-two',
      createdAt: now,
      updatedAt: now,
    }
    const original = {
      id: 'doc-1:2',
      documentId: 'doc-1',
      version: 2,
      title: 'Draft',
      content: 'two',
      contentHash: 'hash-two',
      status: 'draft',
      actorId: 'agent-1',
      clientUpdateId: 'edit-1',
      createdAt: now,
    }
    const tx = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            get: () => table === documentUpdates ? existingUpdate : table === documents ? current : original,
          }),
        }),
      }),
    }
    const db = {
      transaction: (callback: (transaction: typeof tx) => unknown) => callback(tx),
    } as unknown as ConstructorParameters<typeof DrizzleDocumentStore>[0]

    const store = new DrizzleDocumentStore(db)
    await expect(
      store.appendUpdate({
        documentId: 'doc-1',
        actorId: 'agent-1',
        clientUpdateId: 'edit-1',
        baseVersion: 1,
        content: 'different',
        contentHash: 'hash-different',
        now,
      }),
    ).rejects.toBeInstanceOf(DocumentConflictError)

    await expect(
      store.appendUpdate({
        documentId: 'doc-1',
        actorId: 'agent-1',
        clientUpdateId: 'edit-1',
        baseVersion: 1,
        content: 'two',
        contentHash: 'hash-two',
        now,
      }),
    ).resolves.toMatchObject({ duplicate: true, document: { version: 2, content: 'two' } })
  })
})
