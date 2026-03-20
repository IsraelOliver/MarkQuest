import type { FastifyReply, FastifyRequest } from 'fastify'
import { createAnswerKeySchema } from '../schemas/answer-keys.schema.js'
import { AnswerKeyService } from '../services/answer-key.service.js'
import { ok } from '../utils/http-response.js'

const answerKeyService = new AnswerKeyService()

export class AnswerKeysController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createAnswerKeySchema.parse(request.body)
    return ok(reply, answerKeyService.create(payload), 201)
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, answerKeyService.list())
  }
}
