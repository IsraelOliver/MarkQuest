import type { FastifyInstance } from 'fastify'
import { ok } from '../utils/http-response.js'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return ok(reply, { status: 'ok', service: 'markquest-api' })
  })
}
