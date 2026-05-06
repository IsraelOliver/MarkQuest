import type { FastifyReply, FastifyRequest } from 'fastify'
import { createTemplateSchema, templateListQuerySchema, updateTemplateSchema } from '../schemas/templates.schema.js'
import { TemplateService } from '../services/template.service.js'
import { API_ERROR_CODES, ok, sendError } from '../utils/http-response.js'

const templateService = new TemplateService()

export class TemplatesController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createTemplateSchema.parse(request.body)
    return ok(reply, templateService.create(payload), 201)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = templateListQuerySchema.parse(request.query)
    return ok(reply, templateService.list(query))
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const template = templateService.findById(request.params.id)
    if (!template) {
      return sendError(reply, 404, API_ERROR_CODES.NOT_FOUND, 'Template não encontrado.', { cause: 'TEMPLATE_NOT_FOUND' })
    }

    return ok(reply, template)
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const payload = updateTemplateSchema.parse(request.body)
    return ok(reply, templateService.update(request.params.id, payload))
  }
}
