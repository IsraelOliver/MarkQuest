import type { FastifyReply, FastifyRequest } from 'fastify'
import { createExamSchema } from '../schemas/exams.schema.js'
import { ExamService } from '../services/exam.service.js'
import { ok } from '../utils/http-response.js'

const examService = new ExamService()

export class ExamsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createExamSchema.parse(request.body)
    return ok(reply, examService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, examService.list())
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const payload = createExamSchema.parse(request.body)
    return ok(reply, examService.update(request.params.id, payload))
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    return ok(reply, examService.delete(request.params.id))
  }
}
