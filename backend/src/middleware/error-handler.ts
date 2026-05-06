import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { INVALID_UPLOAD_MESSAGE } from '../constants/uploads.js'
import { AppError } from '../utils/app-error.js'
import { API_ERROR_CODES, errorResponse, validationErrorResponse } from '../utils/http-response.js'

function getAppErrorCode(error: AppError) {
  if (error.statusCode === 401) return API_ERROR_CODES.UNAUTHORIZED
  if (error.statusCode === 403) return API_ERROR_CODES.FORBIDDEN
  if (error.statusCode === 404) return API_ERROR_CODES.NOT_FOUND
  if (error.statusCode === 409) return API_ERROR_CODES.CONFLICT
  if (error.statusCode === 413) return API_ERROR_CODES.PAYLOAD_TOO_LARGE
  if (error.code === 'INVALID_UPLOAD_FILE' || error.code === 'UPLOAD_FILE_TOO_LARGE') return API_ERROR_CODES.UPLOAD_INVALID
  return error.statusCode >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.REQUEST_ERROR
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return reply.status(413).send(errorResponse(API_ERROR_CODES.PAYLOAD_TOO_LARGE, INVALID_UPLOAD_MESSAGE))
  }

  if (error instanceof ZodError) {
    const details = error.flatten()
    request.log.warn({ validation: details, url: request.url, method: request.method }, 'Validation error')

    return reply.status(400).send(validationErrorResponse('Dados inválidos na requisição.', details))
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(
      errorResponse(getAppErrorCode(error), error.message, {
        cause: error.code,
      }),
    )
  }

  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  request.log.error({ error, url: request.url, method: request.method }, 'Unhandled request error')

  return reply.status(statusCode).send(
    errorResponse(
      statusCode >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.REQUEST_ERROR,
      error.message || 'Erro interno no servidor.',
    ),
  )
}
