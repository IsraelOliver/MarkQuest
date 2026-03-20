import type { FastifyReply } from 'fastify'

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200, meta?: Record<string, unknown>) {
  return reply.status(statusCode).send({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  })
}
