import type { FastifyReply, FastifyRequest } from 'fastify'
import { createStudentSchema } from '../schemas/students.schema.js'
import { StudentService } from '../services/student.service.js'
import { ok } from '../utils/http-response.js'

const studentService = new StudentService()

export class StudentsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createStudentSchema.parse(request.body)
    return ok(reply, studentService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, studentService.list())
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const payload = createStudentSchema.parse(request.body)
    return ok(reply, studentService.update(request.params.id, payload))
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    return ok(reply, studentService.delete(request.params.id))
  }
}
