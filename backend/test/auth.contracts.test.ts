import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiFailure, ApiSuccess, TestApp } from './helpers/test-app.js'
import { createTestApp, parseJson } from './helpers/test-app.js'

type PublicUserDto = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'teacher' | 'viewer'
  createdAt: string
  updatedAt: string
  passwordHash?: never
}

type LoginDto = {
  token: string
  user: PublicUserDto
}

let ctx: TestApp

beforeEach(async () => {
  ctx = await createTestApp()
})

afterEach(async () => {
  await ctx.cleanup()
})

async function registerUser(input: Partial<{ name: string; email: string; password: string; role: string }> = {}) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: input.name ?? 'Admin MarkQuest',
      email: input.email ?? 'admin@markquest.test',
      password: input.password ?? 'senha-segura',
      role: input.role ?? 'admin',
    },
  })
}

async function loginUser(input: Partial<{ email: string; password: string }> = {}) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: input.email ?? 'admin@markquest.test',
      password: input.password ?? 'senha-segura',
    },
  })
}

describe('Auth API contracts', () => {
  it('registers a user and never returns passwordHash', async () => {
    const response = await registerUser()
    expect(response.statusCode).toBe(201)

    const user = parseJson<ApiSuccess<PublicUserDto>>(response).data
    expect(user).toMatchObject({
      id: expect.stringMatching(/^usr_/),
      name: 'Admin MarkQuest',
      email: 'admin@markquest.test',
      role: 'admin',
    })
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('rejects duplicated email', async () => {
    await registerUser()
    const response = await registerUser({ name: 'Outro Admin' })

    expect(response.statusCode).toBe(409)
    expect(parseJson<ApiFailure>(response).error).toMatchObject({
      code: 'CONFLICT',
      details: { cause: 'AUTH_EMAIL_ALREADY_EXISTS' },
    })
  })

  it('logs in with valid credentials and never returns passwordHash', async () => {
    await registerUser()
    const response = await loginUser()

    expect(response.statusCode).toBe(200)
    const data = parseJson<ApiSuccess<LoginDto>>(response).data
    expect(data.token.split('.')).toHaveLength(3)
    expect(data.user).toMatchObject({
      email: 'admin@markquest.test',
      role: 'admin',
    })
    expect(data.user).not.toHaveProperty('passwordHash')
  })

  it('rejects invalid password', async () => {
    await registerUser()
    const response = await loginUser({ password: 'senha-errada' })

    expect(response.statusCode).toBe(401)
    expect(parseJson<ApiFailure>(response).error).toMatchObject({
      code: 'UNAUTHORIZED',
      details: { cause: 'AUTH_INVALID_CREDENTIALS' },
    })
  })

  it('rejects non-existing user login', async () => {
    const response = await loginUser({ email: 'missing@markquest.test' })

    expect(response.statusCode).toBe(401)
    expect(parseJson<ApiFailure>(response).error).toMatchObject({
      code: 'UNAUTHORIZED',
      details: { cause: 'AUTH_INVALID_CREDENTIALS' },
    })
  })

  it('returns authenticated user from /auth/me', async () => {
    await registerUser()
    const loginResponse = await loginUser()
    const token = parseJson<ApiSuccess<LoginDto>>(loginResponse).data.token

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const user = parseJson<ApiSuccess<PublicUserDto>>(response).data
    expect(user.email).toBe('admin@markquest.test')
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('rejects /auth/me without authentication', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/auth/me' })

    expect(response.statusCode).toBe(401)
    expect(parseJson<ApiFailure>(response).error).toMatchObject({
      code: 'UNAUTHORIZED',
      details: { cause: 'AUTH_REQUIRED' },
    })
  })

  it('logs out successfully with stateless JWT strategy', async () => {
    const response = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout' })

    expect(response.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<{ loggedOut: boolean }>>(response).data).toEqual({ loggedOut: true })
  })
})
