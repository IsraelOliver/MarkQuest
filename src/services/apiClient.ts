export const API_ENDPOINTS = {
  units: '/api/units',
  classrooms: '/api/classrooms',
  exams: '/api/exams',
  students: '/api/students',
  uploads: '/api/uploads',
  processOMR: '/api/omr/process',
  results: '/api/results',
  templates: '/api/templates',
  answerKeys: '/api/answer-keys',
  auth: '/api/auth',
} as const

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type RequestConfig = {
  method: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
}

type ApiSuccessResponse<T> = {
  success: true
  data: T
  meta?: Record<string, unknown>
}

type ApiErrorResponse = {
  success: false
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

const DEFAULT_TIMEOUT_MS = 15000

export type ApiClientErrorCode =
  | 'API_UNAVAILABLE'
  | 'API_TIMEOUT'
  | 'API_EMPTY_RESPONSE'
  | 'API_INVALID_RESPONSE'
  | 'API_CLIENT_ERROR'
  | 'API_SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_API_ERROR'

export class ApiClientError extends Error {
  code: ApiClientErrorCode | string
  status?: number
  details?: unknown

  constructor(message: string, input: { code: ApiClientErrorCode | string; status?: number; details?: unknown }) {
    super(message)
    this.name = 'ApiClientError'
    this.code = input.code
    this.status = input.status
    this.details = input.details
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function parseApiResponse<T>(rawText: string) {
  if (!rawText) return null

  try {
    return JSON.parse(rawText) as ApiSuccessResponse<T> | ApiErrorResponse
  } catch {
    return null
  }
}

function isUnavailableProxyResponse(status: number, rawText: string) {
  return status >= 500 && /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|connect ECONN/i.test(rawText)
}

function normalizeNetworkError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError('Tempo limite ao comunicar com a API. Tente novamente.', {
      code: 'API_TIMEOUT',
    })
  }

  if (error instanceof TypeError) {
    return new ApiClientError('Nao foi possivel conectar a API. Verifique se o backend esta em execucao.', {
      code: 'API_UNAVAILABLE',
    })
  }

  return error
}

function getErrorCode(status: number, parsed: ApiSuccessResponse<unknown> | ApiErrorResponse | null) {
  if (parsed && 'error' in parsed && parsed.error?.code) return parsed.error.code
  return status >= 500 ? 'API_SERVER_ERROR' : 'API_CLIENT_ERROR'
}

export async function request<T>(url: string, config: RequestConfig): Promise<T> {
  const headers = new Headers(config.headers)
  const body = config.body
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  let requestBody: BodyInit | undefined

  if (body !== undefined) {
    if (isFormData(body)) {
      requestBody = body
    } else {
      headers.set('Content-Type', 'application/json')
      requestBody = JSON.stringify(body)
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: config.method,
      headers,
      body: requestBody,
      signal: controller.signal,
    })
  } catch (fetchError) {
    throw normalizeNetworkError(fetchError)
  } finally {
    window.clearTimeout(timeoutId)
  }

  const rawText = await response.text()
  const parsed = parseApiResponse<T>(rawText)

  if (!response.ok) {
    if (isUnavailableProxyResponse(response.status, rawText)) {
      throw new ApiClientError('Nao foi possivel conectar a API. Verifique se o backend esta em execucao na porta 3333.', {
        code: 'API_UNAVAILABLE',
        status: response.status,
        details: rawText,
      })
    }

    if (parsed && 'error' in parsed && parsed.error?.code === 'VALIDATION_ERROR') {
      console.error('Erro de validacao da API:', parsed.error.details ?? parsed.error)

      if (url.includes('/api/templates')) {
        throw new ApiClientError('Nao foi possivel salvar o template. Verifique os dados da secao de imagem.', {
          code: 'VALIDATION_ERROR',
          status: response.status,
          details: parsed.error.details,
        })
      }
    }

    const message =
      parsed && 'error' in parsed ? parsed.error?.message || 'Falha ao comunicar com a API.' : rawText || 'Falha ao comunicar com a API.'

    throw new ApiClientError(message, {
      code: getErrorCode(response.status, parsed),
      status: response.status,
      details: parsed && 'error' in parsed ? parsed.error?.details : rawText,
    })
  }

  if (!rawText) {
    throw new ApiClientError('A API retornou uma resposta vazia.', {
      code: 'API_EMPTY_RESPONSE',
      status: response.status,
    })
  }

  if (!parsed || !('success' in parsed) || !parsed.success) {
    throw new ApiClientError('Resposta invalida da API.', {
      code: 'API_INVALID_RESPONSE',
      status: response.status,
      details: rawText,
    })
  }

  if (parsed.data === undefined || parsed.data === null) {
    throw new ApiClientError('A API retornou dados vazios para esta operacao.', {
      code: 'API_EMPTY_RESPONSE',
      status: response.status,
      details: parsed,
    })
  }

  return parsed.data
}
