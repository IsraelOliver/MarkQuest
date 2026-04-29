import type { FastifyReply } from 'fastify'
import type { ApiError, ApiSuccess } from '../types/http.js'

export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UPLOAD_INVALID: 'UPLOAD_INVALID',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  REQUEST_ERROR: 'REQUEST_ERROR',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  }
}

export function errorResponse(code: ApiErrorCode, message: string, details?: unknown): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }
}

export function validationErrorResponse(message: string, details: unknown): ApiError {
  return errorResponse(API_ERROR_CODES.VALIDATION_ERROR, message, details)
}

export function sendError(reply: FastifyReply, statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
  return reply.status(statusCode).send(errorResponse(code, message, details))
}

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200, meta?: Record<string, unknown>) {
  return reply.status(statusCode).send(successResponse(data, meta))
}
