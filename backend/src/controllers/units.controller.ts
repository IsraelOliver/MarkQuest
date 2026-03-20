import type { FastifyReply, FastifyRequest } from 'fastify'
import { createUnitSchema } from '../schemas/units.schema.js'
import { UnitService } from '../services/unit.service.js'
import { ok } from '../utils/http-response.js'

const unitService = new UnitService()

export class UnitsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createUnitSchema.parse(request.body)
    return ok(reply, unitService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, unitService.list())
  }
}
