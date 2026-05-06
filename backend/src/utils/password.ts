import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('base64url')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHash] = passwordHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !expectedHash) return false

  const expected = Buffer.from(expectedHash, 'base64url')
  const actual = scryptSync(password, salt, expected.length)

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
