import { API_ENDPOINTS, request } from './apiClient'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'teacher' | 'viewer'
  createdAt: string
  updatedAt: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export function login(input: { email: string; password: string }) {
  return request<LoginResponse>(`${API_ENDPOINTS.auth}/login`, {
    method: 'POST',
    body: input,
  })
}

export function logout(token: string | null) {
  return request<{ loggedOut: boolean }>(`${API_ENDPOINTS.auth}/logout`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export function getCurrentUser(token: string) {
  return request<AuthUser>(`${API_ENDPOINTS.auth}/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}
