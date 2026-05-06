import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema, registerSchema } from '../schemas/auth.schema.js'
import { AuthService } from '../services/auth.service.js'
import { AppError } from '../utils/app-error.js'
import { ok } from '../utils/http-response.js'

const authService = new AuthService()

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const payload = registerSchema.parse(request.body)
    return ok(reply, authService.register(payload), 201)
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const payload = loginSchema.parse(request.body)
    return ok(reply, authService.login(payload))
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, { loggedOut: true })
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authUser) {
      throw new AppError('AUTH_REQUIRED', 'Autenticação necessária.', 401)
    }

    const user = authService.findPublicUserById(request.authUser.id)
    if (!user) {
      throw new AppError('AUTH_USER_NOT_FOUND', 'Usuário autenticado não encontrado.', 401)
    }

    return ok(reply, user)
  }
}
