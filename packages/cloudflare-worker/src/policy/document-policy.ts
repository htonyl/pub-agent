export type DocumentCapability =
  | 'document:create'
  | 'document:read'
  | 'document:update'
  | 'document:approve'
  | 'document:review'
  | 'document:collaborate'

export type AuthPrincipal = {
  subject: string
  capabilities: readonly DocumentCapability[]
  expiresAt: number
  documentIds?: readonly string[]
}

export type AuthorizationDecision = {
  allowed: boolean
  status: 200 | 401 | 403
  principal?: AuthPrincipal
  reason: 'allowed' | 'missing-credentials' | 'invalid-credentials' | 'missing-capability' | 'out-of-scope'
}

export type DocumentPolicy = {
  authorize(capability: DocumentCapability, request: Request, secret?: string): Promise<AuthorizationDecision>
}

type TokenPayload = {
  sub?: unknown
  capabilities?: unknown
  exp?: unknown
  documentIds?: unknown
}

const encoder = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  let difference = 0
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

async function sign(message: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

/**
 * Verifies `pa1.<base64url JSON claims>.<base64url HMAC-SHA-256>` with Web
 * Crypto only. Secrets and tokens are never included in errors or logs.
 */
export class BearerTokenDocumentPolicy implements DocumentPolicy {
  async authorize(capability: DocumentCapability, request: Request, secret?: string): Promise<AuthorizationDecision> {
    const authorization = request.headers.get('authorization')
    if (!authorization) return { allowed: false, status: 401, reason: 'missing-credentials' }
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization)
    if (!match || !secret) return { allowed: false, status: 401, reason: 'invalid-credentials' }

    const parts = match[1].split('.')
    if (parts.length !== 3 || parts[0] !== 'pa1') return { allowed: false, status: 401, reason: 'invalid-credentials' }
    const payloadBytes = base64UrlDecode(parts[1])
    const providedSignature = base64UrlDecode(parts[2])
    if (!payloadBytes || !providedSignature) return { allowed: false, status: 401, reason: 'invalid-credentials' }

    let payload: TokenPayload
    try {
      payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as TokenPayload
    } catch {
      return { allowed: false, status: 401, reason: 'invalid-credentials' }
    }
    const expectedSignature = await sign(`${parts[0]}.${parts[1]}`, secret)
    if (!constantTimeEqual(expectedSignature, providedSignature)) {
      return { allowed: false, status: 401, reason: 'invalid-credentials' }
    }

    const capabilities = Array.isArray(payload.capabilities)
      ? payload.capabilities.filter((value): value is DocumentCapability => typeof value === 'string')
      : []
    const subject = typeof payload.sub === 'string' ? payload.sub : ''
    const expiresAt = typeof payload.exp === 'number' ? payload.exp : 0
    if (!subject || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      return { allowed: false, status: 401, reason: 'invalid-credentials' }
    }
    const documentIds = Array.isArray(payload.documentIds)
      ? payload.documentIds.filter((value): value is string => typeof value === 'string')
      : undefined
    const principal: AuthPrincipal = { subject, capabilities, expiresAt, documentIds }
    if (!capabilities.includes(capability)) return { allowed: false, status: 403, principal, reason: 'missing-capability' }

    const targetId = request.url.match(/\/documents\/([^/?]+)/)?.[1]
    if (targetId && documentIds && !documentIds.includes(decodeURIComponent(targetId))) {
      return { allowed: false, status: 403, principal, reason: 'out-of-scope' }
    }
    return { allowed: true, status: 200, principal, reason: 'allowed' }
  }
}

export async function createBearerToken(
  claims: { subject: string; capabilities: readonly DocumentCapability[]; expiresAt: number; documentIds?: readonly string[] },
  secret: string,
): Promise<string> {
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        sub: claims.subject,
        capabilities: claims.capabilities,
        exp: claims.expiresAt,
        ...(claims.documentIds ? { documentIds: claims.documentIds } : {}),
      }),
    ),
  )
  const header = 'pa1'
  return `${header}.${payload}.${base64UrlEncode(await sign(`${header}.${payload}`, secret))}`
}

export const documentPolicy = new BearerTokenDocumentPolicy()
