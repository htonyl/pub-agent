export type DocumentCapability =
  | 'document:create'
  | 'document:read'
  | 'document:update'
  | 'document:approve'
  | 'document:review'
  | 'document:collaborate'

export type DocumentPolicy = {
  authorize(capability: DocumentCapability, request: Request): boolean
}

/**
 * Explicit capability adapter. It is intentionally deny-by-default: an
 * integration can replace this adapter when its authenticated capability
 * context is available without coupling the worker to an auth provider.
 */
export class HeaderDocumentPolicy implements DocumentPolicy {
  authorize(capability: DocumentCapability, request: Request): boolean {
    const granted = request.headers.get('x-pubagent-capabilities')
    return granted?.split(',').map((value) => value.trim()).includes(capability) ?? false
  }
}

export const documentPolicy = new HeaderDocumentPolicy()
