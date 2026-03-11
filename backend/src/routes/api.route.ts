import type { FastifyInstance } from 'fastify'
import { AnswerKeysController } from '../controllers/answer-keys.controller.js'
import { ResultsController } from '../controllers/results.controller.js'
import { TemplatesController } from '../controllers/templates.controller.js'
import { UploadsController } from '../controllers/uploads.controller.js'
import { OMRController } from '../modules/omr/omr.controller.js'

const uploadsController = new UploadsController()
const omrController = new OMRController()
const resultsController = new ResultsController()
const templatesController = new TemplatesController()
const answerKeysController = new AnswerKeysController()

export async function apiRoute(app: FastifyInstance) {
  app.post('/uploads', uploadsController.create)
  app.post('/omr/process', omrController.process)

  app.get('/results', resultsController.list)
  app.get('/results/:id', resultsController.getById)
  app.get('/results/:id/export', resultsController.exportById)

  app.post('/templates', templatesController.create)
  app.get('/templates', templatesController.list)

  app.post('/answer-keys', answerKeysController.create)
  app.get('/answer-keys', answerKeysController.list)
}
