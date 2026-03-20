import type { FastifyReply, FastifyRequest } from 'fastify'
import { createClassroomSchema } from '../schemas/classrooms.schema.js'
import { ClassroomService } from '../services/classroom.service.js'
import { ok } from '../utils/http-response.js'

const classroomService = new ClassroomService()

export class ClassroomsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createClassroomSchema.parse(request.body)
    return ok(reply, classroomService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, classroomService.list())
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const payload = createClassroomSchema.parse(request.body)
    return ok(reply, classroomService.update(request.params.id, payload))
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    return ok(reply, classroomService.delete(request.params.id))
  }
}
