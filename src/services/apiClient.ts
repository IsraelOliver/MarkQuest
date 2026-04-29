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

export async function request<T>(url: string, config: RequestConfig): Promise<T> {
  const headers = new Headers(config.headers)
  const body = config.body

  let requestBody: BodyInit | undefined

  if (body !== undefined) {
    if (isFormData(body)) {
      requestBody = body
    } else {
      headers.set('Content-Type', 'application/json')
      requestBody = JSON.stringify(body)
    }
  }

  const response = await fetch(url, {
    method: config.method,
    headers,
    body: requestBody,
  })

  const rawText = await response.text()
  const parsed = parseApiResponse<T>(rawText)

  if (!response.ok) {
    if (parsed && 'error' in parsed && parsed.error?.code === 'VALIDATION_ERROR') {
      console.error('Erro de validação da API:', parsed.error.details ?? parsed.error)

      if (url.includes('/api/templates')) {
        throw new Error('Não foi possível salvar o template. Verifique os dados da seção de imagem.')
      }
    }

    const message =
      parsed && 'error' in parsed ? parsed.error?.message || 'Falha ao comunicar com a API.' : rawText || 'Falha ao comunicar com a API.'
    throw new Error(message)
  }

  if (!parsed || !('success' in parsed) || !parsed.success) {
    throw new Error('Resposta inválida da API.')
  }

  return parsed.data
}
