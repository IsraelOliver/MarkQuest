import type { FastifyReply, FastifyRequest } from 'fastify'
import { createTemplateSchema, updateTemplateSchema } from '../schemas/templates.schema.js'
import { TemplateService } from '../services/template.service.js'
import { ok } from '../utils/http-response.js'

const templateService = new TemplateService()

export class TemplatesController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createTemplateSchema.parse(request.body)
    return ok(reply, templateService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, templateService.list())
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const payload = updateTemplateSchema.parse(request.body)
    return ok(reply, templateService.update(request.params.id, payload))
  }
}
