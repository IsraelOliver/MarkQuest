import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../constants/uploads.js'
import { registerAuthHooks } from '../middleware/auth.js'
import { errorHandler } from '../middleware/error-handler.js'
import { apiRoute } from '../routes/api.route.js'
import { healthRoute } from '../routes/health.route.js'

export function createApp() {
  const app = Fastify({ logger: true })

  app.register(cors)
  app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    },
  })

  app.setErrorHandler(errorHandler)
  registerAuthHooks(app)

  app.register(healthRoute)
  app.register(apiRoute, { prefix: '/api' })

  return app
}
