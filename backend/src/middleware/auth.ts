import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { UserRole } from '../types/entities.js'
import { verifyAuthToken } from '../utils/auth-token.js'

export type AuthenticatedUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null
  }
}

function readAuthorizationToken(request: FastifyRequest) {
  const authorization = request.headers.authorization
  if (!authorization) return null

  const [type, token] = authorization.split(' ')
  if (type !== 'Bearer' || !token) return null

  return token
}

export async function optionalAuthHook(request: FastifyRequest) {
  const token = readAuthorizationToken(request)
  if (!token) {
    request.authUser = null
    return
  }

  const payload = verifyAuthToken(token)
  request.authUser = payload
    ? {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      }
    : null
}

export function registerAuthHooks(app: FastifyInstance) {
  app.decorateRequest('authUser', null)
  app.addHook('preHandler', optionalAuthHook)
}
