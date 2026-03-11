export const API_ENDPOINTS = {
  uploads: '/api/uploads',
  processOMR: '/api/omr/process',
  results: '/api/results',
  templates: '/api/templates',
  answerKeys: '/api/answer-keys',
} as const

type RequestConfig = {
  method: 'GET' | 'POST'
  body?: unknown
}

export async function request<T>(url: string, config: RequestConfig): Promise<T> {
  // Estrutura preparada para integração real com backend.
  // Exemplo futuro:
  // const response = await fetch(url, {
  //   method: config.method,
  //   headers: { 'Content-Type': 'application/json' },
  //   body: config.body ? JSON.stringify(config.body) : undefined,
  // })
  // return (await response.json()) as T
  await new Promise((resolve) => setTimeout(resolve, 250))
  return {} as T
}
