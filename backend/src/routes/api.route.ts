import type { FastifyInstance } from 'fastify'
import { AnswerKeysController } from '../controllers/answer-keys.controller.js'
import { ClassroomsController } from '../controllers/classrooms.controller.js'
import { ExamsController } from '../controllers/exams.controller.js'
import { ResultsController } from '../controllers/results.controller.js'
import { StudentsController } from '../controllers/students.controller.js'
import { TemplatesController } from '../controllers/templates.controller.js'
import { UnitsController } from '../controllers/units.controller.js'
import { UploadsController } from '../controllers/uploads.controller.js'
import { OMRController } from '../modules/omr/omr.controller.js'

const unitsController = new UnitsController()
const classroomsController = new ClassroomsController()
const examsController = new ExamsController()
const studentsController = new StudentsController()
const uploadsController = new UploadsController()
const omrController = new OMRController()
const resultsController = new ResultsController()
const templatesController = new TemplatesController()
const answerKeysController = new AnswerKeysController()

export async function apiRoute(app: FastifyInstance) {
  app.post('/units', unitsController.create)
  app.get('/units', unitsController.list)

  app.post('/classrooms', classroomsController.create)
  app.get('/classrooms', classroomsController.list)
  app.put('/classrooms/:id', classroomsController.update)
  app.delete('/classrooms/:id', classroomsController.delete)

  app.post('/exams', examsController.create)
  app.get('/exams', examsController.list)
  app.put('/exams/:id', examsController.update)
  app.delete('/exams/:id', examsController.delete)

  app.post('/students', studentsController.create)
  app.get('/students', studentsController.list)
  app.put('/students/:id', studentsController.update)
  app.delete('/students/:id', studentsController.delete)

  app.post('/uploads', uploadsController.create)
  app.get('/uploads', uploadsController.list)
  app.post('/omr/process', omrController.process)

  app.get('/results', resultsController.list)
  app.get('/results/:id', resultsController.getById)
  app.get('/results/:id/export', resultsController.exportById)

  app.post('/templates', templatesController.create)
  app.get('/templates', templatesController.list)
  app.get('/templates/:id', templatesController.getById)
  app.put('/templates/:id', templatesController.update)

  app.post('/answer-keys', answerKeysController.create)
  app.get('/answer-keys', answerKeysController.list)
  app.get('/answer-keys/:id', answerKeysController.getById)
}
