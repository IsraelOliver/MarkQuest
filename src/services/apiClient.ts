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
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
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
  const parsed = rawText ? (JSON.parse(rawText) as ApiSuccessResponse<T> | ApiErrorResponse) : null

  if (!response.ok) {
    const message =
      parsed && 'error' in parsed ? parsed.error?.message || 'Falha ao comunicar com a API.' : 'Falha ao comunicar com a API.'
    throw new Error(message)
  }

  if (!parsed || !('success' in parsed) || !parsed.success) {
    throw new Error('Resposta inválida da API.')
  }

  return parsed.data
}
