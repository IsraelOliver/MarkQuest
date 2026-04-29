import type { FastifyInstance, FastifyRequest } from 'fastify'

export type AuthenticatedUser = {
  id: string
  name?: string
  role?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null
  }
}

function readHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export async function optionalAuthHook(request: FastifyRequest) {
  const userId = readHeaderValue(request.headers['x-markquest-user-id'])

  request.authUser = userId
    ? {
        id: userId,
        name: readHeaderValue(request.headers['x-markquest-user-name']),
        role: readHeaderValue(request.headers['x-markquest-user-role']),
      }
    : null
}

export function registerAuthHooks(app: FastifyInstance) {
  app.decorateRequest('authUser', null)
  app.addHook('preHandler', optionalAuthHook)
}
