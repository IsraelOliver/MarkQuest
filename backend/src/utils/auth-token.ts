import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import type { UserRole } from '../types/entities.js'

export type AuthTokenPayload = {
  sub: string
  email: string
  name: string
  role: UserRole
  iat: number
  exp: number
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf-8')
}

function sign(input: string) {
  return createHmac('sha256', env.AUTH_TOKEN_SECRET).update(input).digest('base64url')
}

export function createAuthToken(input: Omit<AuthTokenPayload, 'iat' | 'exp'>) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: AuthTokenPayload = {
    ...input,
    iat: issuedAt,
    exp: issuedAt + env.AUTH_TOKEN_EXPIRES_IN_SECONDS,
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(`${header}.${body}`)

  return `${header}.${body}.${signature}`
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [header, body, signature] = token.split('.')
  if (!header || !body || !signature) return null

  const expectedSignature = sign(`${header}.${body}`)
  const expected = Buffer.from(expectedSignature)
  const actual = Buffer.from(signature)

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<AuthTokenPayload>
    const now = Math.floor(Date.now() / 1000)

    if (!parsed.sub || !parsed.email || !parsed.name || !parsed.role || !parsed.exp || parsed.exp <= now) {
      return null
    }

    if (!['admin', 'editor', 'teacher', 'viewer'].includes(parsed.role)) return null

    return parsed as AuthTokenPayload
  } catch {
    return null
  }
}
