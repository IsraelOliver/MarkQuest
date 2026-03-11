import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { errorHandler } from '../middleware/error-handler.js'
import { apiRoute } from '../routes/api.route.js'
import { healthRoute } from '../routes/health.route.js'

export function createApp() {
  const app = Fastify({ logger: true })

  app.register(cors)
  app.register(multipart)

  app.setErrorHandler(errorHandler)

  app.register(healthRoute)
  app.register(apiRoute, { prefix: '/api' })

  return app
}
