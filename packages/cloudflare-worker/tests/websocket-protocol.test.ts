import { describe, expect, it } from 'vitest'

import { rejectApplicationMessage } from '../src/durable-objects/websocket-protocol'

describe('collaboration WebSocket seam', () => {
  it('closes application sessions until messages have a validated protocol', () => {
    const closeCalls: Array<[number?, string?]> = []
    const socket = {
      close: (code?: number, reason?: string) => {
        closeCalls.push([code, reason])
      },
    }

    rejectApplicationMessage(socket)

    expect(closeCalls).toEqual([[1008, 'Collaboration protocol is not implemented']])
  })
})
