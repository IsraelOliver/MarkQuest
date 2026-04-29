import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../utils/app-error.js'
import { INVALID_UPLOAD_MESSAGE } from '../constants/uploads.js'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return reply.status(413).send({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: INVALID_UPLOAD_MESSAGE,
      },
    })
  }

  if (error instanceof ZodError) {
    const details = error.flatten()
    request.log.warn({ validation: details, url: request.url, method: request.method }, 'Validation error')

    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos na requisição.',
        details,
      },
    })
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    })
  }

  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  request.log.error({ error, url: request.url, method: request.method }, 'Unhandled request error')

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: error.message || 'Erro interno no servidor.',
    },
  })
}
