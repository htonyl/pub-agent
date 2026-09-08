const UNSUPPORTED_MESSAGE_REASON = 'Collaboration protocol is not implemented'

/** Close an application session until the collaboration message protocol is validated. */
export function rejectApplicationMessage(webSocket: Pick<WebSocket, 'close'>): void {
  webSocket.close(1008, UNSUPPORTED_MESSAGE_REASON)
}
